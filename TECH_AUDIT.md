# Auditoría Técnica — estudio_ricardo_project

> Fecha: 2026-08-25

---

## 🔴 BUGS / Críticos

### 1. Svelte 5 + Svelte 4 syntax mezclada (toda la app)

- Todo el código usa `export let data`, `$:`, `on:click`, `on:input` — API de Svelte 4
- Están en Svelte 5 pero **no usan runes** (`$props()`, `$derived`, `$effect`, `onclick`)
- Skeleton UI v2 **no es compatible** con Svelte 5. Skeleton v3 es el correcto para Svelte 5

### 2. Bug en el search store (`src/lib/stores/filter.ts:40`)

```ts
if (!searchTerm) {
	store.filtered = []; // ❌ debería ser store.data
	return;
}
```

Cuando el input de búsqueda está vacío → `filteredCases = []` → la tabla no muestra nada.
El usuario tiene que escribir algo para ver casos.

### 3. Typo en href del layout (`+layout.svelte`)

```svelte
<a href="/=">  <!-- ❌ debería ser href="/" -->
```

---

## 🟠 Seguridad

### 4. `console.log` con dato de producción (`case.model.ts:153`)

```ts
export async function deleteCase(caseId: number) {
    console.log(caseId);  // ← borrar
```

### 5. Sin protección CSRF

Endpoints `/api/newCase`, `/api/newPayment`, `/api/updateCase` no validan `Origin` ni usan tokens CSRF.

### 6. Sin rate limiting

`/login` y `/signup` son vulnerables a fuerza bruta.

### 7. Cookie de auth — verificar flags

Confirmar que al setear la cookie en login tenga `httpOnly: true, sameSite: 'strict'`.

---

## 🟡 Deuda Técnica

### 8. Triple query innecesaria (`case.model.ts`)

```ts
// Estas 3 funciones llaman getCasesWithDebt() por separado → 3 queries a DB
getOverDueCases(); // getCasesWithDebt() + filter
getSoonDueCases(); // getCasesWithDebt() + filter
getOnTimeCases(); // getCasesWithDebt() + filter
```

Deberían compartir 1 query y filtrar en memoria.

### 9. `addThousandSeparator` duplicada

- Definida localmente en `ModalForm.svelte:22`
- Ya existe en `src/lib/utils/formatters.ts`
- ModalForm debería importarla desde utils

### 10. `validateOrThrow` / `manageError` duplicadas

Idénticas en `ModalForm.svelte`, `login/+page.svelte`, `signup/+page.svelte`.
Extraer a util compartida.

### 11. `createErrorResponse` duplicada

En `newCase/+server.ts` y `newPayment/+server.ts`.
Extraer a `src/lib/utils/api.ts`.

### 12. Validación manual en lugar de Zod

`isValidCaseData` / `isValidPaymentData` usan `Boolean(a && b && c...)`.
Zod ya está en el proyecto — usar schemas para validar.

### 13. `dotenv` en dependencies de producción

SvelteKit maneja env vars nativamente. Remover `dotenv` de `dependencies`.

### 14. `@types/luxon` instalado, `luxon` no

`@types/luxon` en devDeps pero `luxon` no aparece como dependencia.
O está sin usar o falta la dependencia base.

### 15. `setTimeout` para secuenciar modales (`ModalDetalles.svelte`)

```ts
setTimeout(() => {
	modalStore.trigger(modalConfirm);
}, 150);
```

Frágil, depende de timing. Skeleton v3 tiene mejor API para esto.

### 16. Pattern inconsistente: actions vs fetch

- `historial/+page.server.ts` define `actions`
- `historial/+page.svelte` usa `fetch('/historial', {method: 'POST'})` — mezcla de patrones
- `ModalDetalles.svelte` llama `/api/updateCase` para saldar pero `/historial` para eliminar — inconsistente

### 17. Tipos `any` sueltos

```ts
let cases: any[]; // +page.svelte
let cases: any; // historial/+page.svelte
typepayment as any; // newCase/+server.ts buildPayments()
```

### 18. `{#key cases}` innecesario (`+page.svelte`)

Fuerza re-render completo de `CasesContainer`. Innecesario.

### 19. Sin índices en schema Prisma

`restAmount`, `userId`, `current` en `Payment` son columnas filtradas frecuentemente sin `@@index`.

```prisma
// Agregar a Cases:
@@index([restAmount])
@@index([userId])

// Agregar a Payment:
@@index([caseId, current])
```

### 20. Google Fonts en `<style>` del layout

```svelte
<style>
@import url('https://fonts.google...');
```

Mover a `<head>` en `app.html` con `<link rel="preload">` para no bloquear render.

### 21. Sin páginas de error

No hay `+error.svelte` — errores 404/500 usan fallback genérico de SvelteKit.

### 22. Sin `.env.example`

No hay archivo de referencia para variables de entorno requeridas.

---

## 🔵 Dependencias

| Paquete                     | Estado                                                      |
| --------------------------- | ----------------------------------------------------------- |
| `@skeletonlabs/skeleton` v2 | ⚠️ Migrar a v3 — v2 no es compatible con Svelte 5           |
| `tailwindcss` v3.4          | ⚠️ Tailwind v4 disponible (cambio grande de config)         |
| `eslint` v9                 | ✅ Al día                                                   |
| `svelte` v5.46              | ✅ Al día                                                   |
| `@sveltejs/kit` v2.49       | ✅ Al día                                                   |
| `prisma` v6.19              | ✅ Al día                                                   |
| `vite` v6                   | ✅ Al día                                                   |
| `zod` v3.25                 | ✅ Al día (v4 disponible con breaking changes)              |
| `bcryptjs`                  | ⚠️ Considerar migrar a `argon2` (más seguro para passwords) |
| `dotenv`                    | ❌ Remover — no necesario con SvelteKit                     |

---

## 🎨 Estético / UX

- **Home**: Las 3 cards de categorías no muestran conteo de casos — el usuario no sabe cuántos hay sin entrar
- **Historial**: Sin paginación — cuando crezca la tabla será lenta e ilegible en móvil
- **Sin toasts**: Errores/éxitos se muestran como modales alert — disruptivo. Skeleton v3 tiene `Toast`
- **Tabla en móvil**: `CasesContainer` no tiene scroll horizontal ni vista alternativa para pantallas chicas
- **Sin estado vacío visual**: Cuando no hay casos el área queda en blanco, sin mensaje ilustrado
- **Dark mode**: Fondo del menú dropdown en `ModalDetalles` es `bg-gray-600` hardcodeado — no respeta theme

---

## Prioridades sugeridas

| Prioridad | Tarea                                            | Archivo                       |
| --------- | ------------------------------------------------ | ----------------------------- |
| 1         | Fix bug `store.filtered = []` → `store.data`     | `src/lib/stores/filter.ts:40` |
| 2         | Fix typo `href="/="` → `href="/"`                | `src/routes/+layout.svelte`   |
| 3         | Eliminar `console.log(caseId)`                   | `src/lib/case.model.ts:153`   |
| 4         | Unificar las 3 queries en 1                      | `src/lib/case.model.ts`       |
| 5         | Extraer utilidades duplicadas                    | `formatters.ts`, `api.ts`     |
| 6         | Agregar `@@index` al schema Prisma               | `prisma/schema.prisma`        |
| 7         | Limpiar tipos `any`                              | varios                        |
| 8         | Migrar Skeleton v2 → v3 + adoptar Svelte 5 runes | toda la app                   |
| 9         | Agregar `+error.svelte` y `.env.example`         | raíz del proyecto             |
