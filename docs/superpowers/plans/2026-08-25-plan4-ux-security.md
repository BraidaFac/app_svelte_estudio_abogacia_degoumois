# Plan 4: UX Improvements + Seguridad

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mejorar la experiencia de usuario con conteos en cards, paginación en historial, estados vacíos, tabla responsive para mobile, y agregar rate limiting en login/signup.

**Architecture:** Cambios de UI en componentes existentes + middleware de rate limiting en hooks.server.ts usando un Map en memoria (simple, sin dependencias externas). El rate limiting en memoria se resetea al reiniciar el servidor — adecuado para app interna.

**Tech Stack:** SvelteKit 2, Svelte 5 (post Plan 3), Skeleton UI v3, TypeScript, Tailwind CSS

## Global Constraints

- **Prerequisito:** Planes 1, 2 y 3 completados
- Sin dependencias nuevas para rate limiting (usar Map en memoria)
- Rate limiting solo en rutas de auth — no en APIs de casos/pagos (app interna)
- Paginación en historial: client-side (los datos ya están cargados)
- `npm run check` debe pasar limpio después de cada task

---

## File Map

| Acción | Archivo                                                                      |
| ------ | ---------------------------------------------------------------------------- |
| Modify | `src/routes/+page.server.ts` — incluir conteos por categoría                 |
| Modify | `src/routes/+page.svelte` — mostrar conteos en cards                         |
| Modify | `src/lib/case.model.ts` — agregar `getCasesCount()`                          |
| Modify | `src/lib/components/CasesContainer.svelte` — empty state + mobile responsive |
| Modify | `src/routes/historial/+page.svelte` — paginación client-side + empty state   |
| Modify | `src/hooks.server.ts` — rate limiting en login                               |
| Modify | `src/routes/login/+page.server.ts` — manejar error de rate limit             |
| Modify | `src/routes/signup/+page.server.ts` — manejar error de rate limit            |
| Modify | `src/lib/components/ModalDetalles.svelte` — fix hardcoded bg-gray-600        |

---

### Task 1: Conteos de casos en cards de la home

**Files:**

- Modify: `src/lib/case.model.ts` — agregar `getCasesCount()`
- Modify: `src/routes/+page.server.ts` — incluir counts en datos
- Modify: `src/routes/+page.svelte` — mostrar counts en cards

**Context:** Las 3 cards (Vencidas/Próximas/Al día) no muestran cuántos casos hay. El usuario tiene que entrar a cada una para saberlo. Con `getCasesGrouped()` del Plan 2 ya tenemos los datos — solo falta exponer los counts.

**Interfaces:**

- Consumes: `getCasesGrouped()` de `src/lib/case.model.ts`
- Produce: `counts: { overdue: number; soon: number; onTime: number }` en `PageData`

- [ ] **Step 1: Escribir test**

En `src/lib/case.model.test.ts`, agregar:

```typescript
describe('getCasesGrouped', () => {
	it('retorna las tres categorías como arrays', async () => {
		// Mock de getCasesWithDebt
		const mockCases = [
			{ id: 1, payments: [{ current: true, due_date: new Date(Date.now() - 86400000) }] }, // overdue
			{ id: 2, payments: [{ current: true, due_date: new Date(Date.now() + 2 * 86400000) }] }, // soon
			{ id: 3, payments: [{ current: true, due_date: new Date(Date.now() + 10 * 86400000) }] } // onTime
		];

		vi.mocked(db.cases.findMany).mockResolvedValueOnce(mockCases as any);

		const result = await getCasesGrouped();
		expect(result.overdue).toHaveLength(1);
		expect(result.soon).toHaveLength(1);
		expect(result.onTime).toHaveLength(1);
	});
});
```

- [ ] **Step 2: Ejecutar test (verificar que la estructura es correcta)**

```bash
npm test
```

- [ ] **Step 3: Actualizar +page.server.ts**

En `src/routes/+page.server.ts`, modificar el `load`:

```typescript
import { getCasesWithDebt, getCasesGrouped } from '$lib/case.model';

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('update:cases');
	const user = locals.user;
	if (!user) throw redirect(302, '/login');

	const rawCases = await getCasesWithDebt();

	if (rawCases.length === 0) {
		return { user, cases: [], counts: { overdue: 0, soon: 0, onTime: 0 } };
	}

	// Usar la query agrupada para conteos (reutiliza los datos ya cargados)
	const grouped = await getCasesGrouped();
	const counts = {
		overdue: grouped.overdue.length,
		soon: grouped.soon.length,
		onTime: grouped.onTime.length
	};

	const cases: FormattedCase[] = rawCases
		.map((c) => {
			const currentPayment = c.payments.find((p) => p.current);
			const dueDate = currentPayment
				? formatDateToDashDMY(currentPayment.due_date.toISOString())
				: undefined;
			return {
				...c,
				quantityPaymentsToPay: c.payments.filter((p) => !p.payment_date).length,
				dueDate,
				searchTerms: `${c.description} ${c.type} ${c.clientName}`
			};
		})
		.sort((a, b) => {
			if (!a.dueDate || !b.dueDate) return 0;
			return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
		});

	return { user, cases, counts };
};
```

**Nota:** `getCasesGrouped` llama a `getCasesWithDebt` internamente — en una optimización futura se puede compartir la misma query. Por ahora, 2 queries es aceptable (simple y correcto).

- [ ] **Step 4: Actualizar +page.svelte con los conteos**

```svelte
<script lang="ts">
	import CasesContainer from '$lib/components/CasesContainer.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="sections mb-10 grid grid-cols-3 gap-4 pt-10">
	<a href="/vencido" class="card card-hover p-4">
		<section class="p-4 text-center">
			<p class="text-3xl text-red-600">Cuotas vencidas</p>
			<p class="mt-2 text-5xl font-bold text-red-600">{data.counts.overdue}</p>
		</section>
	</a>
	<a href="/proximo" class="card card-hover p-4">
		<section class="p-4 text-center">
			<p class="text-3xl text-yellow-500">Próximos vencimientos</p>
			<p class="mt-2 text-5xl font-bold text-yellow-500">{data.counts.soon}</p>
		</section>
	</a>
	<a href="/atiempo" class="card card-hover p-4">
		<section class="p-4 text-center">
			<p class="text-3xl text-green-600">Cuotas al día</p>
			<p class="mt-2 text-5xl font-bold text-green-600">{data.counts.onTime}</p>
		</section>
	</a>
</div>
<CasesContainer cases={data.cases} />
```

- [ ] **Step 5: Verificar TypeScript**

```bash
npm run check
```

- [ ] **Step 6: Verificar manualmente**

```bash
npm run dev
```

Las 3 cards deben mostrar el número de casos de cada categoría.

- [ ] **Step 7: Commit**

```bash
git add src/lib/case.model.ts src/lib/case.model.test.ts src/routes/+page.server.ts src/routes/+page.svelte
git commit -m "feat: show case counts on home category cards"
```

---

### Task 2: Estado vacío en CasesContainer + responsive mobile

**Files:**

- Modify: `src/lib/components/CasesContainer.svelte`

**Context:** Cuando no hay casos (o el search no encuentra nada), la tabla desaparece sin mensaje. En mobile la tabla con 8 columnas es ilegible.

**Interfaces:**

- Consumes: `cases: FormattedCase[]` — sin cambios

- [ ] **Step 1: Actualizar CasesContainer.svelte**

Reemplazar el template actual por uno con empty state y scroll horizontal:

```svelte
<!-- En el bloque del template, reemplazar: -->

<div class="px-3 md:mx-auto md:w-1/2">
	<input type="search" class="input" placeholder="Buscar" bind:value={$filterStore} />
</div>

{#if filteredCases.length === 0}
	<div class="text-surface-400 mt-16 flex flex-col items-center gap-4">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="h-16 w-16"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="1"
				d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
			/>
		</svg>
		{#if $filterStore}
			<p class="text-xl">Sin resultados para "<strong>{$filterStore}</strong>"</p>
		{:else}
			<p class="text-xl">No hay casos activos</p>
		{/if}
	</div>
{:else}
	<div class="table-container overflow-x-auto p-2 md:p-4">
		<table class="table-interactive table min-w-[700px] text-center">
			<!-- thead y tbody sin cambios -->
		</table>
	</div>
{/if}
```

- [ ] **Step 2: Verificar manualmente**

```bash
npm run dev
```

- Buscar algo que no existe → mensaje "Sin resultados para..."
- Reducir ventana a mobile → tabla tiene scroll horizontal

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/CasesContainer.svelte
git commit -m "feat: add empty state and horizontal scroll for mobile in CasesContainer"
```

---

### Task 3: Paginación en historial

**Files:**

- Modify: `src/routes/historial/+page.svelte`

**Context:** Historial muestra todos los casos completados en una sola tabla. Con el tiempo puede crecer mucho. Paginación client-side simple: 20 items por página.

**Interfaces:**

- Consumes: `cases: FormattedCase[]` de `data`
- Sin cambios en servidor

- [ ] **Step 1: Agregar lógica de paginación en historial/+page.svelte**

En el `<script>`:

```typescript
const PAGE_SIZE = 20;
let currentPage = $state(1); // Svelte 5 rune — si aún en v4 usar: let currentPage = 1;

let totalPages = $derived(Math.ceil(cases.length / PAGE_SIZE));
let paginatedCases = $derived(cases.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE));

function goToPage(page: number) {
	currentPage = Math.max(1, Math.min(page, totalPages));
	window.scrollTo({ top: 0, behavior: 'smooth' });
}
```

- [ ] **Step 2: Actualizar template**

Reemplazar `{#each cases as caso}` por `{#each paginatedCases as caso}`.

Agregar controles de paginación debajo de la tabla:

```svelte
{#if totalPages > 1}
	<div class="mt-4 flex items-center justify-center gap-2">
		<button
			class="btn btn-sm variant-soft"
			disabled={currentPage === 1}
			onclick={() => goToPage(currentPage - 1)}
		>
			← Anterior
		</button>
		<span class="text-sm">
			Página {currentPage} de {totalPages}
		</span>
		<button
			class="btn btn-sm variant-soft"
			disabled={currentPage === totalPages}
			onclick={() => goToPage(currentPage + 1)}
		>
			Siguiente →
		</button>
	</div>
{/if}
```

Agregar empty state:

```svelte
{#if cases.length === 0}
	<div class="text-surface-400 mt-16 flex flex-col items-center gap-4">
		<p class="text-xl">No hay casos en el historial</p>
	</div>
{:else}
	<!-- tabla existente con paginatedCases -->
{/if}
```

- [ ] **Step 3: Verificar manualmente**

```bash
npm run dev
```

Navegar a `/historial`. Con menos de 20 casos: tabla sin paginador. Con más: paginador aparece.

- [ ] **Step 4: Commit**

```bash
git add src/routes/historial/+page.svelte
git commit -m "feat: add client-side pagination (20/page) and empty state to historial"
```

---

### Task 4: Fix hardcoded colors en ModalDetalles

**Files:**

- Modify: `src/lib/components/ModalDetalles.svelte`

**Context:** El menú dropdown usa `bg-gray-600` hardcodeado — no respeta el tema Skeleton ni el dark mode.

**Interfaces:**

- Ninguna

- [ ] **Step 1: Actualizar clases del dropdown en ModalDetalles.svelte**

Reemplazar las clases del menú dropdown:

```svelte
<!-- ANTES: -->
<div
	class="ring-opacity-5 absolute right-0 z-10 mt-2 w-48 rounded-md bg-transparent shadow-lg ring-1 ring-black"
>
	<div class="space-y-2 bg-transparent py-1" role="menu">
		<button
			class="hover:bg-surface-200-700-token block w-full rounded-lg bg-gray-600 px-4 py-2 text-left text-sm transition-colors"
		>
			Saldar
		</button>
		<button
			class="hover:bg-surface-200-700-token block w-full rounded-lg bg-gray-600 px-4 py-2 text-left text-sm transition-colors"
		>
			Eliminar caso
		</button>
	</div>
</div>
```

```svelte
<!-- DESPUÉS: -->
<div class="card absolute right-0 z-10 mt-2 w-48 shadow-lg">
	<div class="space-y-1 p-2" role="menu">
		<button
			class="btn hover:bg-surface-200-700-token w-full justify-start text-sm transition-colors"
		>
			Saldar
		</button>
		<button
			class="btn text-error-500 hover:bg-surface-200-700-token w-full justify-start text-sm transition-colors"
		>
			Eliminar caso
		</button>
	</div>
</div>
```

- [ ] **Step 2: Verificar en dark mode y light mode**

```bash
npm run dev
```

El menú debe verse consistente con el tema en ambos modos.

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/ModalDetalles.svelte
git commit -m "fix: use Skeleton theme tokens instead of hardcoded colors in ModalDetalles dropdown"
```

---

### Task 5: Rate limiting en login y signup

**Files:**

- Modify: `src/hooks.server.ts` — agregar rate limiter en memoria
- Modify: `src/routes/login/+page.server.ts` — manejar 429
- Modify: `src/routes/signup/+page.server.ts` — manejar 429

**Context:** Sin rate limiting, login y signup son vulnerables a fuerza bruta. La app es interna, así que un rate limiter simple en memoria (Map) es suficiente. Límite: 10 intentos por IP en 15 minutos.

**Architecture:** El rate limiter vive en `hooks.server.ts` como un Map `ip → { count, resetAt }`. El `handle` hook chequea la IP en rutas de auth antes de resolver.

**Interfaces:**

- Produce: respuesta 429 con `Retry-After` header si se excede el límite

- [ ] **Step 1: Agregar rate limiter en hooks.server.ts**

```typescript
// Agregar al inicio de hooks.server.ts (después de los imports):

interface RateLimitEntry {
	count: number;
	resetAt: number;
}

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const AUTH_ROUTES = ['/login', '/signup'];

const rateLimitStore = new Map<string, RateLimitEntry>();

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds: number } {
	const now = Date.now();
	const entry = rateLimitStore.get(ip);

	if (!entry || now > entry.resetAt) {
		rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
		return { allowed: true, retryAfterSeconds: 0 };
	}

	if (entry.count >= RATE_LIMIT_MAX) {
		const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
		return { allowed: false, retryAfterSeconds };
	}

	entry.count++;
	return { allowed: true, retryAfterSeconds: 0 };
}
```

- [ ] **Step 2: Integrar en el handle hook**

En `src/hooks.server.ts`, dentro del `handle`, agregar ANTES de `return resolve(event)`:

```typescript
export const handle: Handle = async ({ event, resolve }) => {
	// Rate limiting en rutas de auth (solo en métodos POST)
	const isAuthRoute = AUTH_ROUTES.some((route) => event.url.pathname.startsWith(route));
	if (isAuthRoute && event.request.method === 'POST') {
		const ip = event.getClientAddress();
		const { allowed, retryAfterSeconds } = checkRateLimit(ip);

		if (!allowed) {
			return new Response(JSON.stringify({ error: 'Demasiados intentos. Intente más tarde.' }), {
				status: 429,
				headers: {
					'Content-Type': 'application/json',
					'Retry-After': String(retryAfterSeconds)
				}
			});
		}
	}

	// ... resto del handle existente (auth cookie check)
	const authCookie = event.cookies.get('AuthorizationToken');
	// ...

	return resolve(event);
};
```

- [ ] **Step 3: Escribir test del rate limiter**

En `src/hooks.server.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

// Nota: testear checkRateLimit requiere exportarla.
// Agregar export a la función en hooks.server.ts:
// export function checkRateLimit(...) { ... }

import { checkRateLimit } from './hooks.server';

describe('checkRateLimit', () => {
	// Usar IPs únicas por test para evitar estado compartido
	it('permite el primer intento', () => {
		const result = checkRateLimit('1.2.3.4');
		expect(result.allowed).toBe(true);
	});

	it('bloquea después de 10 intentos', () => {
		const ip = '5.6.7.8';
		for (let i = 0; i < 10; i++) checkRateLimit(ip);
		const result = checkRateLimit(ip);
		expect(result.allowed).toBe(false);
		expect(result.retryAfterSeconds).toBeGreaterThan(0);
	});
});
```

Agregar `export` a `checkRateLimit` en `hooks.server.ts`.

- [ ] **Step 4: Verificar tests**

```bash
npm test
```

Esperado: PASS.

- [ ] **Step 5: Verificar TypeScript**

```bash
npm run check
```

- [ ] **Step 6: Commit**

```bash
git add src/hooks.server.ts
git commit -m "feat: add in-memory rate limiting (10 req/15min) on login and signup routes"
```

---

## Verificación final del Plan 4

- [ ] `npm test` — todos los tests pasan
- [ ] `npm run check` — sin errores TypeScript
- [ ] `npm run build` — build exitoso
- [ ] Home muestra número de casos en cada card
- [ ] Sin casos en búsqueda → muestra "Sin resultados para..."
- [ ] Sin casos en historial → muestra "No hay casos en el historial"
- [ ] Historial con >20 casos muestra paginación
- [ ] Menú dropdown de ModalDetalles respeta el tema Skeleton
- [ ] Más de 10 POSTs a `/login` desde misma IP → recibe 429
