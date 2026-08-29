# DESIGN.md — Estudio Ricardo · Sistema de Diseño

> Documento de referencia persistente para la capa visual. Todo agente que toque UI debe leer esto antes de generar cualquier clase, token o componente.

---

## 1. Filosofía

La UI tiene dos modos coexistentes bajo un mismo sistema de tokens:

- **Modo dramático** — Login y hero del dashboard. Negro profundo, escarlata protagonista, Cinzel grande, pocos elementos. Sensación de entrada a algo serio. El escarlata tiene máxima presencia aquí porque es la única pantalla donde el usuario no está trabajando.
- **Modo trabajo** — Todo el resto de la app. Editorial moderno: negro base, grillas, jerarquía tipográfica, escarlata como acento con cuentagotas. El contenido manda; la UI desaparece.

La marca se sostiene por **contraste extremo** (negro/blanco/escarlata) y **austeridad tipográfica** (Cinzel para display, Plex para datos), no por decoración. Cuanto menos aparece el escarlata fuera del modo dramático, más vale.

---

## 2. Stack de implementación

| Capa | Tecnología |
|---|---|
| Framework | SvelteKit + Svelte 5 runes |
| Estilos | Tailwind v4 (tokens via `@theme`) |
| Componentes headless | **Melt UI** |
| Iconografía | **Lucide** (línea fina, SVG) |
| Skeleton Labs | **Eliminado** — sin preset wintry, sin tokens heredados |

### Nota sobre Melt UI
Melt UI provee primitivos accesibles (dialog, combobox, popover, tabs, etc.) sin estilos. Toda apariencia visual es responsabilidad del DESIGN.md. Usar siempre los builders de Melt para comportamiento; aplicar clases propias para apariencia.

---

## 3. Modo

**Dark only.** Sin toggle, sin light mode. El `<html>` lleva `class="dark"` y no hay variante light en los tokens.

---

## 4. Paleta de color

Tokens muestreados del flyer oficial del estudio, con contraste WCAG verificado sobre `#0D0D0D`.

### 4.1 Marca (core)

| Nombre | Hex | Uso |
|---|---|---|
| `--color-bg` | `#0D0D0D` | Fondo base de toda la app |
| `--color-brand` | `#D43124` | Escarlata de marca — acento, botones primarios, motivo editorial |
| `--color-brand-hover` | `#A82519` | Estado hover/pressed del escarlata |
| `--color-white` | `#F5F5F5` | Blanco editorial — texto primario, contraste |

### 4.2 Superficies y elevación

Tres niveles con roles fijos. No gastar dos niveles en un mismo estado.

| Nivel | Hex | Rol |
|---|---|---|
| Base | `#0D0D0D` | Fondo — filas en reposo, fondo de página |
| Elevación 1 | `#1A1A1A` | Hover de filas, chips, elementos secundarios |
| Elevación 2 | `#242424` | Modales, popovers, filas activas/seleccionadas |
| Borde sutil | `#2E2E2E` | Separadores, bordes de tabla, divisores |

### 4.3 Texto

| Token | Hex | Contraste sobre bg | Uso |
|---|---|---|---|
| `--color-text-primary` | `#F5F5F5` | 17.8:1 ✅ AAA | Texto de cuerpo, valores, encabezados de datos |
| `--color-text-secondary` | `#A8A8A8` | 8.2:1 ✅ AAA | Labels, metadatos, descripciones |
| `--color-text-muted` | `#6E6E6E` | ~4.5:1 ✅ AA | Placeholders, texto deshabilitado |

### 4.4 Estados semánticos

> **Regla crítica:** Los colores de estado son una voz completamente separada del escarlata de marca. Nunca usar `--color-brand` para indicar estado funcional.

| Estado | Hex | Contraste | Uso |
|---|---|---|---|
| Vencida | `#FF6B5E` | 7.0:1 ✅ AA | Cuotas vencidas — coral brillante, distinto del escarlata a propósito |
| Por vencer | `#E6A93C` | 9.3:1 ✅ AA | Cuotas próximas |
| Pagada / OK | `#3FB98A` | 7.9:1 ✅ AA | Cuotas al día, confirmaciones |

### 4.5 Reglas duras de color

1. **Escarlata `#D43124` da 3.95:1 sobre negro** — apto solo para texto grande (≥18px bold, ≥24px regular), botones y motivo editorial display. **Nunca en texto de cuerpo, nunca en datos de tabla.**
2. **Coral `#FF6B5E` ≠ escarlata** — son intencionalmente distintos. Marca = escarlata profundo. Alarma = coral brillante. No intercambiar.
3. **Estado nunca solo por color** — siempre ícono Lucide + etiqueta de texto además del color (WCAG 1.4.1).
4. **Escarlata con cuentagotas fuera del modo dramático** — nav, un botón primario, motivo editorial. No como fondo de sección, no en más de un elemento por pantalla en modo trabajo.

---

## 5. Tipografía

### 5.1 Familias

| Familia | Fuente | Uso |
|---|---|---|
| Display | **Cinzel** (Google Fonts) | Títulos de pantalla, motivo "— & ASOCIADOS —", hero del login, nombre del estudio en nav |
| Body / UI | **IBM Plex Sans** (Google Fonts) | Todo el texto de interfaz: labels, descripciones, navegación, contenido de modales |
| Mono / Cifras | **IBM Plex Mono** (Google Fonts) | Montos en JUS y pesos, fechas numéricas, cualquier dato que requiera alineación de columna |

### 5.2 Escala tipográfica

| Rol | Familia | Tamaño | Peso | Tracking |
|---|---|---|---|---|
| Hero / marca | Cinzel | 3rem–5rem | 700 | +0.04em |
| Título de sección | Cinzel | 1.5rem–2rem | 600 | +0.03em |
| Encabezado de tabla | IBM Plex Sans | 0.75rem | 600 | +0.08em uppercase |
| Texto de cuerpo | IBM Plex Sans | 0.875rem–1rem | 400 | 0 |
| Dato numérico | IBM Plex Mono | igual al contexto | 400 | 0 |
| Label/meta | IBM Plex Sans | 0.75rem | 400 | 0 |

### 5.3 Reglas tipográficas

- `font-variant-numeric: tabular-nums` en **todos** los IBM Plex Mono — los montos deben alinear en columna.
- Montos: alineados a la **derecha** en tablas, con separador de miles formato `es-AR` (ej: `$ 1.234,56 JUS`).
- Cinzel **solo** para roles display/marca. Nunca en texto de cuerpo ni datos de tabla.
- Line-height body: `1.6`. Line-height mono en tabla: `1.4` (más denso, lectura escaneable).

---

## 6. Componentes — tablas de casos

Las tablas son el componente de mayor uso de la app. Su diseño es el corazón del modo trabajo.

### 6.1 Anatomía de fila

```
┌─ [barra estado 3-4px] ─── [celdas con padding generoso] ──────────────────┐
│  ████  Descripción   Tipo    Cliente    Teléfono   Monto JUS   Fecha   Acc │
└───────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Estados de fila

| Estado | Fondo | Borde izquierdo | Separador inferior |
|---|---|---|---|
| Reposo | Transparente (`#0D0D0D` base respira) | Barra de estado (color semántico) | `#2E2E2E` |
| Hover | `#1A1A1A` con transición `150ms ease` | Barra de estado | `#2E2E2E` |
| Activa / seleccionada | `#242424` | Escarlata `#D43124` (4px) | `#2E2E2E` |

> **Importante:** En reposo, las filas NO tienen fondo propio. El negro de marca respira a través de la grilla. La tabla no debe flotar como un bloque gris elevado.

### 6.3 Barra de estado (primera columna)

- Dimensiones: `3–4px` de ancho, `100%` de alto de fila
- Colores: exclusivamente la paleta de estados (`#FF6B5E` / `#E6A93C` / `#3FB98A`)
- **Nunca** usar escarlata de marca en la barra de estado
- Siempre acompañada de etiqueta de texto en su columna (badge + texto)

### 6.4 Columna de montos

- Fuente: IBM Plex Mono
- Alineación: derecha
- `font-variant-numeric: tabular-nums`
- Formato: `es-AR` — separador de miles punto, decimal coma
- Ejemplo: `$ 1.234,56 JUS`

### 6.5 Encabezados de tabla

- IBM Plex Sans, `0.75rem`, `font-weight: 600`, `letter-spacing: 0.08em`, `text-transform: uppercase`
- Color: `--color-text-secondary` (`#A8A8A8`)
- Sin fondo especial — mismo fondo base que la tabla

---

## 7. Componentes — modales

Implementados con **Melt UI dialog** (primitivo `createDialog`). La lógica actual de `<dialog>` nativo se migra al builder de Melt.

### 7.1 Anatomía

```
┌─ Overlay (fade) ──────────────────────────────────┐
│  ┌─ Modal panel (slide-up) ──────────────────────┐ │
│  │  [Header: título Cinzel + botón cerrar X]     │ │
│  │  [Body: contenido / formulario]               │ │
│  │  [Footer: acciones primaria + secundaria]     │ │
│  └───────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────┘
```

### 7.2 Estilos

- **Panel:** fondo `#242424`, borde `#2E2E2E`, `border-radius: 8px`
- **Overlay:** negro `rgba(0,0,0,0.75)` con `backdrop-filter: blur(2px)`
- **Título:** Cinzel, tamaño sección, `#F5F5F5`
- **Botón cerrar:** Lucide `X`, `#A8A8A8` → hover `#F5F5F5`

### 7.3 Animaciones

- **Overlay:** `fade` — `opacity 0→1`, `200ms ease`
- **Panel:** `slide-up` — `translateY(16px)→translateY(0)` + `opacity 0→1`, `250ms ease-out`
- Sin spring, sin bounce — transiciones con propósito, sin ostentación

---

## 8. Componentes — navegación

### 8.1 Nav bar

- Fondo: `#0D0D0D` (mismo base, sin elevación — la app es plana en el techo)
- Borde inferior: `#2E2E2E`
- Logo/nombre: Cinzel, tamaño `1.5–2rem`, `#F5F5F5`
- Padding: `12px 24px` desktop, `12px 16px` mobile
- Sin sombra — la separación la da solo el borde inferior

### 8.2 Botón primario ("Nuevo Caso")

- Fondo: `#D43124` → hover `#A82519`
- Texto: `#F5F5F5`, IBM Plex Sans, `font-weight: 500`
- Sin borde radius exagerado — `4px` máximo
- Transición: `background 150ms ease`

---

## 9. Componentes — estados de badge

Para mostrar VENCIDO / PRÓXIMO / AL DÍA inline (fuera de la barra de tabla):

```
[● ícono Lucide] [Etiqueta texto]
```

| Estado | Ícono Lucide | Color texto | Fondo badge |
|---|---|---|---|
| Vencida | `AlertCircle` | `#FF6B5E` | `rgba(255,107,94,0.12)` |
| Por vencer | `Clock` | `#E6A93C` | `rgba(230,169,60,0.12)` |
| Pagada | `CheckCircle` | `#3FB98A` | `rgba(63,185,138,0.12)` |

---

## 10. Pantallas de impacto — modo dramático

### 10.1 Login

- Fondo: `#000000` (negro puro — pantalla de impacto, no de trabajo)
- Motivo central: Logo del estudio o texto `ESTUDIO DEGOUMOIS` en Cinzel grande
- Escarlata `#D43124`: presente en el botón de login y/o un elemento decorativo (línea, balanza)
- Formulario: inputs minimalistas, borde `#2E2E2E` → focus `#D43124`
- Sin decoración extra — el peso visual lo lleva la tipografía display

### 10.2 Hero del dashboard

- Primera sección visible al entrar — cards de resumen (total vencido, total por vencer, total al día)
- Fondo de sección: `#0D0D0D` con motivo tipográfico Cinzel como watermark o separador editorial
- El escarlata aparece en el número principal de deuda vencida (dato crítico, texto grande → cumple contraste)
- Transición visual hacia la tabla de trabajo: de hero display a tabla funcional

---

## 11. Reglas globales de implementación

1. **Tokens primero** — Nunca hardcodear hex en componentes. Todo referencia variables CSS definidas en `app.css` vía `@theme`.
2. **Melt UI para comportamiento, clases propias para apariencia** — No mezclar estilos de Melt con los de Skeleton.
3. **Skeleton Labs completamente removido** — Sin `@import '@skeletonlabs/skeleton'`, sin `data-theme`, sin clases `btn`, `table`, `card` de Skeleton.
4. **Lucide tree-shaken** — Importar solo los íconos usados, nunca el bundle completo.
5. **`tabular-nums` en todo IBM Plex Mono** — Sin excepciones.
6. **Estado siempre ícono + texto** — Nunca solo color para comunicar estado funcional.
7. **Escarlata = escaso** — Si aparece en más de dos elementos en una pantalla de trabajo, sobra.
8. **Tres niveles de elevación, roles fijos** — Base → Elevación 1 (hover) → Elevación 2 (modal/activo). No inventar cuartos niveles.

---

## 12. Archivos a modificar en implementación

| Archivo | Cambio |
|---|---|
| `src/app.html` | Cambiar fonts a IBM Plex Sans + IBM Plex Mono + Cinzel; remover `data-theme="wintry"` |
| `src/app.css` | Reemplazar imports de Skeleton por tokens custom `@theme`; definir toda la paleta |
| `src/routes/+layout.svelte` | Refactor nav con nuevos tokens; sin clases Skeleton |
| `src/routes/login/+page.svelte` | Modo dramático — pantalla de impacto |
| `src/routes/+page.svelte` | Hero del dashboard con cards de resumen |
| `src/routes/[estado]/+page.svelte` | Tabla con diseño D (barra estado + card rows) |
| `src/routes/historial/+page.svelte` | Misma tabla, modo historial |
| `src/lib/components/Modal*.svelte` | Migrar de `<dialog>` nativo a Melt UI dialog |
| `src/lib/components/BurgerBar.svelte` | Refactor con tokens nuevos |
| `package.json` | Agregar `@melt-ui/svelte`, `lucide-svelte`; remover Skeleton si corresponde |
