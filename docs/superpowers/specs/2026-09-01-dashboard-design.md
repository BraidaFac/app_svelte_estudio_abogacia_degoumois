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
| `src/routes/dashboard/+page.svelte` | Layout del dashboard, compone sub-componentes + selector de moneda |
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

## Multi-moneda: pivote ARS + toggle client-side

### Principio

Los casos en DB usan monedas nativas mixtas (JUS, USD, EUR). Sumar `amount`/`restAmount` directamente entre casos de distintas monedas daría un número sin sentido.

**Solución:**
1. El servidor normaliza **todos los montos a ARS** como pivote (multiplicando por `Currency.value` en SQL via JOIN).
2. Las tasas de conversión ya están disponibles en el cliente via `page.data.currencies` (cargadas en `+layout.server.ts`).
3. El componente `+page.svelte` mantiene un `$state selectedCurrency` (default: la moneda `isDefault`).
4. Al renderizar, convierte `arsAmount → selectedCurrency` usando `fromARS(amount, rate)` de `currency.ts` (ya implementada).
5. El formato se aplica con `formatAmount(result, currencyName)` de `currency.ts` (ya implementada).

### UI: selector de moneda

Segmented control en el header del dashboard, generado dinámicamente desde `page.data.currencies`:

```
[ JUS ]  [ USD ]  [ EUR ]  [ ARS ]
```

Al cambiar la selección, todos los componentes reciben el nuevo `selectedCurrency` como prop y re-renderizan. Sin fetch adicional, sin query extra.

### Listas accionables (proximosVencimientos, topCasosDeuda)

Estas listas muestran montos individuales por caso. El servidor devuelve `arsAmount` para cada ítem. El cliente convierte igual que los KPIs.

---

## Tipos TypeScript

```typescript
// src/lib/types/dashboard.types.ts

export type AgingBucket = {
  d0_30: number;    // ARS
  d31_60: number;   // ARS
  d61_90: number;   // ARS
  d90plus: number;  // ARS
};

export type ProximoVencimiento = {
  caseId: number;
  clientName: string;
  description: string;
  dueDate: string;      // formateado dd-mm-yyyy
  arsAmount: number;    // monto en ARS (para convertir client-side)
};

export type TopCasoDeuda = {
  caseId: number;
  clientName: string;
  description: string;
  deudaVencidaARS: number;  // sum cuotas vencidas sin pagar, en ARS
};

export type TendenciaMes = {
  mes: string;       // "Sep 25", "Oct 25", etc.
  cobradoARS: number;
};

export type DashboardData = {
  // Hero KPIs (en ARS)
  cobradoEsteMesARS: number;
  porCobrarEsteMesARS: number;
  totalVencidoARS: number;
  casosActivos: number;          // count, sin moneda

  // Aging — deuda vencida solo en casos activos (en ARS)
  aging: AgingBucket;
  cuotaMasAntigua: string | null;  // dd-mm-yyyy, null si no hay deuda vencida

  // Cartera — solo casos activos (en ARS)
  saldoPendienteTotalARS: number;
  porcentajeCobrado: number;       // porcentaje puro, sin moneda
  valorTotalCarteraARS: number;

  // Listas accionables
  proximosVencimientos: ProximoVencimiento[];
  topCasosDeuda: TopCasoDeuda[];

  // Tendencia
  tendenciaMensual: TendenciaMes[];
};
```

---

## Queries (`dashboard.model.ts`)

**Invariante:** todos los montos se normalizan a ARS en SQL via `JOIN Currency ON Cases.currencyId = Currency.id` y `payment.amount * Currency.value`.

"Caso activo" = `restAmount > 0 AND closed = false`.  
"Cuota vencida" = `payment_date IS NULL AND due_date < ahora AND caso activo`.

### cobradoEsteMesARS

```sql
SELECT SUM(p.amount * cu.value) AS cobradoARS
FROM Payment p
JOIN Cases ca ON p.caseId = ca.id
JOIN Currency cu ON ca.currencyId = cu.id
WHERE p.payment_date >= :startOfMonth AND p.payment_date < :startOfNextMonth
```

### porCobrarEsteMesARS

```sql
SELECT SUM(p.amount * cu.value) AS porCobrarARS
FROM Payment p
JOIN Cases ca ON p.caseId = ca.id
JOIN Currency cu ON ca.currencyId = cu.id
WHERE p.payment_date IS NULL
  AND p.due_date >= :now AND p.due_date < :startOfNextMonth
  AND ca.restAmount > 0 AND ca.closed = false
```

### totalVencido + aging + cuotaMasAntigua

Una sola query trae todas las cuotas vencidas sin pagar de casos activos con su tasa de conversión. La partición en tramos se calcula en JS sobre el resultado:

```sql
SELECT p.due_date, p.amount * cu.value AS arsAmount
FROM Payment p
JOIN Cases ca ON p.caseId = ca.id
JOIN Currency cu ON ca.currencyId = cu.id
WHERE p.payment_date IS NULL
  AND p.due_date < :now
  AND ca.restAmount > 0 AND ca.closed = false
ORDER BY p.due_date ASC
```

En JS: agrupar por `differenceInDays(now, due_date)` → acumular en `aging` buckets. `cuotaMasAntigua` = `rows[0].due_date`.

### saldoPendienteTotalARS / valorTotalCarteraARS / porcentajeCobrado

```sql
SELECT
  SUM(ca.restAmount * cu.value) AS saldoARS,
  SUM(ca.amount * cu.value)     AS totalARS
FROM Cases ca
JOIN Currency cu ON ca.currencyId = cu.id
WHERE ca.restAmount > 0 AND ca.closed = false
```

`porcentajeCobrado = (totalARS - saldoARS) / totalARS * 100`

### casosActivos

```typescript
db.cases.count({ where: { restAmount: { gt: 0 }, closed: false } })
```

### proximosVencimientos

```sql
SELECT p.due_date, p.amount * cu.value AS arsAmount,
       ca.id AS caseId, ca.clientName, ca.description
FROM Payment p
JOIN Cases ca ON p.caseId = ca.id
JOIN Currency cu ON ca.currencyId = cu.id
WHERE p.payment_date IS NULL
  AND p.due_date >= :now AND p.due_date < :nowPlus7Days
  AND ca.restAmount > 0 AND ca.closed = false
ORDER BY p.due_date ASC
```

### topCasosDeuda

```sql
SELECT ca.id AS caseId, ca.clientName, ca.description,
       SUM(p.amount * cu.value) AS deudaVencidaARS
FROM Payment p
JOIN Cases ca ON p.caseId = ca.id
JOIN Currency cu ON ca.currencyId = cu.id
WHERE p.payment_date IS NULL
  AND p.due_date < :now
  AND ca.restAmount > 0 AND ca.closed = false
GROUP BY ca.id, ca.clientName, ca.description
ORDER BY deudaVencidaARS DESC
LIMIT 5
```

### tendenciaMensual

```sql
SELECT YEAR(p.payment_date) AS yr, MONTH(p.payment_date) AS mo,
       SUM(p.amount * cu.value) AS cobradoARS
FROM Payment p
JOIN Cases ca ON p.caseId = ca.id
JOIN Currency cu ON ca.currencyId = cu.id
WHERE p.payment_date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
GROUP BY yr, mo
ORDER BY yr, mo
```

Formatear en JS a `{ mes: "Sep 25", cobradoARS: number }`.

Todas las queries anteriores usan `db.$queryRaw<...>()` de Prisma con parámetros tipados.

---

## Layout del dashboard

```
┌──────────────────────────────────────────────────────┐
│  [ JUS ] [ USD ] [ EUR ] [ ARS ]  ← selector moneda  │
├──────────────────────────────────────────────────────┤
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

El selector de moneda se ubica en el header del dashboard. Todos los sub-componentes reciben `selectedCurrency` y `currencies` como props y aplican `fromARS()` + `formatAmount()` internamente.

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
| Selector moneda activo | escarlata de marca |

**Regla:** escarlata solo para identidad editorial (labels, títulos, selector activo). Nunca en datos de estado (esos usan coral/ámbar/verde).

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
