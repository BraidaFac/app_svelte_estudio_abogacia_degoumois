# Dashboard — Design Spec
**Date:** 2026-09-01  
**Branch:** Upgrade  
**Status:** Approved for implementation

---

## Objetivo

Nueva ruta `/dashboard` que reemplaza `/` como pantalla de entrada post-login. Muestra métricas de negocio del estudio: KPIs financieros, antigüedad de deuda, cartera, tendencia mensual y listas accionables. El dashboard no reemplaza la tabla de casos — es una capa de inteligencia sobre ella.

---

## Arquitectura

### Enfoque: Single server load (Opción A)

Un único `load()` en `+page.server.ts` que ejecuta todas las queries y devuelve `DashboardData` tipado. Sin endpoints adicionales, sin carga parcial. Justificación: volumen de datos de un estudio jurídico es bajo (decenas/bajos cientos de casos), las queries corren en milisegundos.

### Nueva ruta

```
src/routes/dashboard/
├── +page.server.ts    ← load() → DashboardData
└── +page.svelte       ← renderizado puro, sin lógica de negocio
```

### Archivos nuevos

| Archivo | Propósito |
|---|---|
| `src/routes/dashboard/+page.server.ts` | `load()` único, auth check, devuelve `DashboardData` |
| `src/routes/dashboard/+page.svelte` | Layout del dashboard, compone sub-componentes |
| `src/lib/dashboard.model.ts` | Todas las queries Prisma del dashboard |
| `src/lib/types/dashboard.types.ts` | Tipos TypeScript para `DashboardData` y sub-tipos |
| `src/lib/components/dashboard/DashboardHero.svelte` | 4 KPI cards |
| `src/lib/components/dashboard/DashboardAging.svelte` | Aging + cuota más antigua |
| `src/lib/components/dashboard/DashboardCartera.svelte` | Métricas de cartera |
| `src/lib/components/dashboard/DashboardTendencia.svelte` | Bar chart mensual (svelte-chartjs) |
| `src/lib/components/dashboard/DashboardProximos.svelte` | Lista próximos vencimientos |
| `src/lib/components/dashboard/DashboardTopDeuda.svelte` | Top 5 casos con deuda vencida |

### Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/routes/login/+page.server.ts` | Redirect post-login a `/dashboard` en lugar de `/` |
| `src/lib/components/BurgerBar.svelte` | Agregar link "Dashboard" al menú de navegación |

### Dependencia nueva

```bash
pnpm add svelte-chartjs chart.js
```

---

## Tipos TypeScript

```typescript
// src/lib/types/dashboard.types.ts

export type AgingBucket = {
  d0_30: number;
  d31_60: number;
  d61_90: number;
  d90plus: number;
};

export type ProximoVencimiento = {
  caseId: number;
  clientName: string;
  description: string;
  dueDate: string;       // formateado dd-mm-yyyy
  amount: number | null; // en JUS
};

export type TopCasoDeuda = {
  caseId: number;
  clientName: string;
  description: string;
  deudaVencida: number;  // sum de cuotas vencidas sin pagar, en JUS
};

export type TendenciaMes = {
  mes: string;           // "Sep 25", "Oct 25", etc.
  cobrado: number;       // sum de payments.amount donde payment_date cae en ese mes
};

export type DashboardData = {
  // Hero KPIs
  cobradoEsteMes: number;
  porCobrarEsteMes: number;
  totalVencido: number;
  casosActivos: number;

  // Aging (deuda vencida solo en casos activos)
  aging: AgingBucket;
  cuotaMasAntigua: string | null;  // dd-mm-yyyy, null si no hay deuda vencida

  // Cartera (solo casos activos)
  saldoPendienteTotal: number;    // sum(restAmount)
  porcentajeCobrado: number;      // (sum(amount) - sum(restAmount)) / sum(amount) * 100
  valorTotalCartera: number;      // sum(amount)

  // Listas accionables
  proximosVencimientos: ProximoVencimiento[];  // vencen en los próximos 7 días
  topCasosDeuda: TopCasoDeuda[];               // top 5 por deuda vencida

  // Tendencia
  tendenciaMensual: TendenciaMes[];  // últimos 12 meses
};
```

---

## Queries (`dashboard.model.ts`)

Todos los montos son `Decimal` en DB → convertir a `number` antes de devolver.  
"Caso activo" = `restAmount > 0 AND closed = false`.  
"Cuota vencida" = `payment_date IS NULL AND due_date < ahora AND caso activo`.

### cobradoEsteMes
```typescript
db.payment.aggregate({
  _sum: { amount: true },
  where: {
    payment_date: { gte: startOfMonth(now), lt: startOfMonth(addMonths(now, 1)) }
  }
})
```

### porCobrarEsteMes
```typescript
db.payment.aggregate({
  _sum: { amount: true },
  where: {
    due_date: { gte: now, lt: startOfMonth(addMonths(now, 1)) },
    payment_date: null,
    case: { restAmount: { gt: 0 }, closed: false }
  }
})
```

### totalVencido + aging + cuotaMasAntigua
Una sola query trae todas las cuotas vencidas sin pagar de casos activos. La partición en tramos (0-30, 31-60, 61-90, +90) se calcula en JS sobre el resultado — evita SQL complejo.

```typescript
const vencidas = await db.payment.findMany({
  where: { payment_date: null, due_date: { lt: now }, case: { restAmount: { gt: 0 }, closed: false } },
  select: { due_date: true, amount: true }
});
// Luego: agrupar por differenceInDays(now, due_date)
```

### saldoPendienteTotal / valorTotalCartera / porcentajeCobrado
```typescript
db.cases.aggregate({
  _sum: { restAmount: true, amount: true },
  where: { restAmount: { gt: 0 }, closed: false }
})
// porcentajeCobrado = (sum.amount - sum.restAmount) / sum.amount * 100
```

### casosActivos
```typescript
db.cases.count({ where: { restAmount: { gt: 0 }, closed: false } })
```

### proximosVencimientos
```typescript
db.payment.findMany({
  where: {
    payment_date: null,
    due_date: { gte: now, lt: addDays(now, 7) },
    case: { restAmount: { gt: 0 }, closed: false }
  },
  include: { case: { select: { clientName: true, description: true } } },
  orderBy: { due_date: 'asc' }
})
```

### topCasosDeuda
Agrupar cuotas vencidas por caso, sumar, ordenar desc, tomar 5. Usar `db.$queryRaw` o `groupBy` de Prisma:

```typescript
db.payment.groupBy({
  by: ['caseId'],
  _sum: { amount: true },
  where: { payment_date: null, due_date: { lt: now }, case: { restAmount: { gt: 0 }, closed: false } },
  orderBy: { _sum: { amount: 'desc' } },
  take: 5
})
// + include case info con findMany sobre los caseIds resultantes
```

### tendenciaMensual
`$queryRaw` para agrupar por año/mes:

```sql
SELECT YEAR(payment_date) AS yr, MONTH(payment_date) AS mo, SUM(amount) AS cobrado
FROM Payment
WHERE payment_date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
GROUP BY yr, mo
ORDER BY yr, mo
```

Formatear en JS a `{ mes: "Sep 25", cobrado: number }`.

---

## Layout del dashboard

```
┌──────────────────────────────────────────────────────┐
│  [COBRADO ESTE MES] [POR COBRAR] [VENCIDO] [ACTIVOS]  │  ← DashboardHero (4 cols)
├─────────────────────────────┬────────────────────────┤
│  ANTIGÜEDAD DE DEUDA        │  CARTERA               │
│  (DashboardAging)           │  (DashboardCartera)    │
├─────────────────────────────┴────────────────────────┤
│  COBRANZA MENSUAL — últimos 12 meses                 │
│  (DashboardTendencia — svelte-chartjs bar)           │
├─────────────────────────────┬────────────────────────┤
│  PRÓXIMOS VENCIMIENTOS      │  TOP CASOS CON DEUDA   │
│  (DashboardProximos)        │  (DashboardTopDeuda)   │
└─────────────────────────────┴────────────────────────┘
```

Responsive: en mobile, todas las secciones apilan en columna única.

---

## Paleta y tipografía (respeta design system vigente)

| Elemento | Token / valor |
|---|---|
| Números KPI hero | `font-family: 'IBM Plex Mono'`, tabular-nums, tamaño ~3rem |
| Labels KPI | `font-family: 'Cinzel'`, escarlata de marca (`--color-primary`) |
| Aging 0-30d | coral `#ff6b5e` |
| Aging 31-60d | ámbar `#e6a93c` |
| Aging 61-90d | verde `#3fb98a` |
| Aging +90d | gris `#6e6e6e` |
| Barras chart mensual | escarlata `--color-primary` |
| Cards | clases `.card` existentes en `app.css` |

**Regla:** escarlata solo para identidad editorial (labels, títulos). Nunca en datos de estado (esos usan coral/ámbar/verde).

---

## Manejo de errores

Sin manejo especial en el componente. Si `load()` lanza, SvelteKit renderiza `+error.svelte` existente. No hay estado parcial — todo el dashboard carga o no carga.

---

## Testing

Sin tests nuevos en esta fase — las queries son de lectura y el componente es puramente presentacional.  
Si la lógica de aging se extrae a función pura, agregar un unit test en `src/lib/dashboard.model.test.ts` cubriendo los 4 tramos.

---

## Flujo de navegación

```
/login (POST) → redirect /dashboard   ← cambio en login/+page.server.ts
/dashboard → pantalla de entrada      ← nueva ruta
BurgerBar → link "Dashboard"          ← modificación en BurgerBar.svelte
```

La ruta `/` (tabla de casos) sigue existiendo y accesible desde el menú.
