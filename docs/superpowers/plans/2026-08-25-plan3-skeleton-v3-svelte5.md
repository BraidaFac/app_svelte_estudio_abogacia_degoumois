# Plan 3: Migración Skeleton v3 + Svelte 5 Runes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar Skeleton UI v2 → v3 y reescribir todos los componentes Svelte usando la API de Svelte 5 (runes: `$props()`, `$derived`, `$effect`, `onclick`).

**Architecture:** Skeleton v3 cambia su sistema de modales (de store-based a snippet-based). Migrar componente por componente, empezando por los más simples y terminando con los modales. Rama separada obligatoria — esta migración es breaking.

**Tech Stack:** SvelteKit 2, Svelte 5, Skeleton UI v3, TypeScript, Tailwind CSS

## Global Constraints

- **Prerequisito:** Planes 1 y 2 completados y mergeados a `main`
- **Rama obligatoria:** `git checkout -b feat/skeleton-v3-svelte5` antes de empezar
- Skeleton v3 docs: https://www.skeleton.dev/docs (v3)
- Svelte 5 migration guide: https://svelte.dev/docs/svelte/v5-migration-guide
- `npm run check` debe pasar limpio después de cada task
- El modal system de Skeleton v3 es completamente diferente — NO usar `getModalStore()` ni `initializeStores()`
- En Svelte 5: reemplazar `on:click` → `onclick`, `on:input` → `oninput`, `$:` → `$derived`/`$effect`, `export let` → `$props()`

---

## File Map

| Acción | Archivo                                                                               |
| ------ | ------------------------------------------------------------------------------------- |
| Run    | `npm uninstall @skeletonlabs/skeleton @skeletonlabs/tw-plugin`                        |
| Run    | `npm install @skeletonlabs/skeleton@next` (v3)                                        |
| Modify | `tailwind.config.js` — actualizar plugin de Skeleton                                  |
| Modify | `src/app.pcss` — actualizar imports de Skeleton                                       |
| Modify | `src/routes/+layout.svelte` — eliminar `initializeStores()`, nuevo sistema de modales |
| Modify | `src/lib/components/BurgerBar.svelte` — runes                                         |
| Modify | `src/lib/components/CasesContainer.svelte` — runes                                    |
| Modify | `src/lib/components/ModalForm.svelte` — runes + nuevo modal API                       |
| Modify | `src/lib/components/ModalToPay.svelte` — runes + nuevo modal API                      |
| Modify | `src/lib/components/ModalDetalles.svelte` — runes + nuevo modal API                   |
| Modify | `src/lib/components/ModalJus.svelte` — runes + nuevo modal API                        |
| Modify | `src/routes/+page.svelte` — runes                                                     |
| Modify | `src/routes/historial/+page.svelte` — runes                                           |
| Modify | `src/routes/signup/+page.svelte` — runes                                              |
| Modify | `src/routes/login/+page.svelte` — runes                                               |
| Modify | `src/routes/[estado]/+page.svelte` — runes                                            |

---

### Task 1: Crear rama y actualizar dependencias Skeleton

**Files:**

- Run: uninstall v2, install v3
- Modify: `tailwind.config.js`
- Modify: `src/app.pcss`

**Interfaces:**

- Ninguna

- [ ] **Step 1: Crear rama**

```bash
git checkout -b feat/skeleton-v3-svelte5
```

- [ ] **Step 2: Desinstalar Skeleton v2**

```bash
npm uninstall @skeletonlabs/skeleton @skeletonlabs/tw-plugin
```

- [ ] **Step 3: Instalar Skeleton v3**

```bash
npm install @skeletonlabs/skeleton@next
```

> **Nota:** Si Skeleton v3 no está en `@next`, verificar la versión exacta en https://www.npmjs.com/package/@skeletonlabs/skeleton y usar `npm install @skeletonlabs/skeleton@3.x.x`.

- [ ] **Step 4: Actualizar tailwind.config.js**

Skeleton v3 cambia el plugin. Leer la documentación de v3 en https://www.skeleton.dev/docs/get-started/installation para obtener la configuración exacta del plugin y reemplazar en `tailwind.config.js`:

```javascript
// La configuración de Skeleton v3 será similar a:
import { skeleton } from '@skeletonlabs/skeleton/plugin';

export default {
	darkMode: 'class',
	content: [
		'./src/**/*.{html,js,svelte,ts}',
		// Path al directorio de Skeleton v3 — verificar en docs
		require('path').join(require.resolve('@skeletonlabs/skeleton'), '../**/*.{html,js,svelte,ts}')
	],
	plugins: [
		skeleton({
			themes: [{ name: 'wintry', properties: {} }] // o el tema actual
		}),
		require('@tailwindcss/forms')
	]
};
```

**Importante:** Consultar la documentación oficial de Skeleton v3 para la config exacta del plugin — puede diferir.

- [ ] **Step 5: Actualizar app.pcss**

Skeleton v3 puede cambiar los imports de CSS. Verificar en docs y actualizar `src/app.pcss` según sea necesario.

- [ ] **Step 6: Verificar que el proyecto compila (aunque con errores esperados)**

```bash
npm run check 2>&1 | head -50
```

Los errores esperados son imports de `getModalStore`, `initializeStores`, `ProgressRadial` — se arreglan en tasks siguientes.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tailwind.config.js src/app.pcss
git commit -m "chore: upgrade Skeleton UI v2 → v3"
```

---

### Task 2: Migrar layout y sistema de modales

**Files:**

- Modify: `src/routes/+layout.svelte`

**Context:** Skeleton v3 reemplaza `getModalStore()` + `initializeStores()` + `<Modal>` con un sistema basado en snippets. Los modales se triggean diferente — leer docs de v3.

**Interfaces:**

- Produce: sistema de modales v3 funcional

- [ ] **Step 1: Leer docs de Skeleton v3 Modal**

Consultar https://www.skeleton.dev/docs/components/modal para entender el nuevo API antes de editar.

- [ ] **Step 2: Actualizar +layout.svelte con Svelte 5 runes**

```svelte
<script lang="ts">
	import BurgerBar from '$lib/components/BurgerBar.svelte';
	import '../app.pcss';
	import type { LayoutData } from './$types';
	// Importar componentes de Modal según API de Skeleton v3
	// (verificar nombre exacto en docs v3)

	let { data }: { data: LayoutData } = $props();
	let user = $derived(data.user);

	// El sistema de modales v3 no usa initializeStores() ni modalRegistry
	// Consultar docs de v3 para el nuevo patrón
</script>

<!-- El componente Modal de v3 puede ser diferente — verificar docs -->
<nav class="nav-bar flex h-20 flex-row items-center justify-between">
	<div class="ml-3 flex w-1/3 justify-between gap-3">
		<a href="/"><h1 class="title text-4xl">Estudio Degoumois</h1></a>
	</div>
	<div class="flex w-1/3 justify-center">
		{#if user}
			<!-- El trigger de modal en v3 es diferente — verificar docs -->
			<button class="btn preset-filled-success-500">Nuevo Caso</button>
		{/if}
	</div>
	<div class="mr-3 flex w-1/3 items-center justify-end gap-10">
		{#if user}
			<span>Hola {user.name}</span>
			<BurgerBar {user} />
		{/if}
	</div>
</nav>
<slot />

<style>
	@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400..900&display=swap');
	.title {
		font-family: 'Cinzel', serif;
		font-optical-sizing: auto;
		font-style: normal;
	}
</style>
```

> **Nota crítica:** Los nombres exactos de clases de Skeleton v3 cambian (ej. `variant-filled-success` → `preset-filled-success-500`). Verificar en docs la tabla de equivalencias de clases v2 → v3.

- [ ] **Step 3: Commit parcial**

```bash
git add src/routes/+layout.svelte
git commit -m "refactor: migrate layout to Svelte 5 runes and Skeleton v3 modal system"
```

---

### Task 3: Migrar componentes sin modales (BurgerBar, CasesContainer)

**Files:**

- Modify: `src/lib/components/BurgerBar.svelte`
- Modify: `src/lib/components/CasesContainer.svelte`

**Context:** Estos componentes no usan el store de modales — son los más simples de migrar a runes.

**Interfaces:**

- BurgerBar consumes: `user: { name: string; role: Role }`
- CasesContainer consumes: `cases: FormattedCase[]`

- [ ] **Step 1: Leer BurgerBar.svelte actual**

```bash
cat src/lib/components/BurgerBar.svelte
```

- [ ] **Step 2: Migrar BurgerBar a runes**

Patrón general de migración:

```svelte
<script lang="ts">
	// ANTES:              DESPUÉS:
	// export let x;   →  let { x } = $props();
	// $: y = x + 1;  →  let y = $derived(x + 1);
	// on:click={fn}  →  onclick={fn}
	// on:input={fn}  →  oninput={fn}
</script>
```

- [ ] **Step 3: Migrar CasesContainer a runes**

```svelte
<script lang="ts">
	import type { FormattedCase } from '$lib/types/case.types';
	// ... otros imports

	let { cases }: { cases: FormattedCase[] } = $props();

	// Reemplazar $: con $derived/$effect según corresponda
	// Reemplazar on:click con onclick
	// Reemplazar on:input con oninput
</script>
```

- [ ] **Step 4: Actualizar trigger de modales en CasesContainer**

Los botones "Cobrar" y "Detalles" triggean modales. Con Skeleton v3 el API cambia — consultar docs para el nuevo patrón de trigger.

- [ ] **Step 5: Verificar TypeScript**

```bash
npm run check
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/BurgerBar.svelte src/lib/components/CasesContainer.svelte
git commit -m "refactor: migrate BurgerBar and CasesContainer to Svelte 5 runes"
```

---

### Task 4: Migrar modales (ModalForm, ModalToPay, ModalDetalles, ModalJus)

**Files:**

- Modify: `src/lib/components/ModalForm.svelte`
- Modify: `src/lib/components/ModalToPay.svelte`
- Modify: `src/lib/components/ModalDetalles.svelte`
- Modify: `src/lib/components/ModalJus.svelte`

**Context:** Los modales usan `getModalStore()` y `$modalStore[0].meta` para recibir datos. Skeleton v3 cambia esto. Consultar docs de v3 para el nuevo patrón de passing data a modales.

**Interfaces:**

- Consumes: API de Skeleton v3 Modal (verificar en docs el patrón exact)

- [ ] **Step 1: Leer docs de Skeleton v3 — pasar data a modales**

Consultar https://www.skeleton.dev/docs/components/modal — sección de custom modals y data passing.

- [ ] **Step 2: Migrar ModalJus (el más simple)**

```svelte
<script lang="ts">
	// $modalStore[0].meta → consultar el nuevo patrón de v3
	// Reemplazar on:click/on:input con onclick/oninput
	// Reemplazar $: con $derived/$effect
</script>
```

- [ ] **Step 3: Migrar ModalForm**

- Reemplazar `getModalStore()` con el API v3
- Reemplazar `on:click|preventDefault` con `onclick` (el `preventDefault` va dentro de la función)
- Reemplazar `on:input` con `oninput`
- Reemplazar `$:` reactivo con `$effect`/`$derived`
- Reemplazar `ProgressRadial` de Skeleton v2 con el componente equivalente de v3 (puede ser `ProgressRing` u otro — verificar en docs)

- [ ] **Step 4: Migrar ModalToPay**

Igual que ModalForm:

- Reemplazar store API con v3
- Migrar todos los event handlers
- Migrar reactive declarations

- [ ] **Step 5: Migrar ModalDetalles**

Reemplazar los `setTimeout` para secuenciar modales con el nuevo API de v3 que puede tener mejor soporte para modal stacking.

- [ ] **Step 6: Verificar TypeScript**

```bash
npm run check
```

Esperado: sin errores.

- [ ] **Step 7: Commit**

```bash
git add src/lib/components/ModalForm.svelte src/lib/components/ModalToPay.svelte src/lib/components/ModalDetalles.svelte src/lib/components/ModalJus.svelte
git commit -m "refactor: migrate all modals to Svelte 5 runes and Skeleton v3 API"
```

---

### Task 5: Migrar páginas de rutas a runes

**Files:**

- Modify: `src/routes/+page.svelte`
- Modify: `src/routes/historial/+page.svelte`
- Modify: `src/routes/signup/+page.svelte`
- Modify: `src/routes/login/+page.svelte`
- Modify: `src/routes/[estado]/+page.svelte`

**Interfaces:**

- Cada página consumes: `data: PageData` vía `$props()`

- [ ] **Step 1: Migrar +page.svelte (home)**

```svelte
<script lang="ts">
	import CasesContainer from '$lib/components/CasesContainer.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="sections mb-10 grid grid-cols-3 gap-4 pt-10">
	<!-- ... cards sin cambios ... -->
</div>
<CasesContainer cases={data.cases} />
```

- [ ] **Step 2: Migrar historial/+page.svelte**

```svelte
<script lang="ts">
	import type { PageData } from './$types';
	// ... otros imports

	let { data }: { data: PageData } = $props();
	let cases = $derived(data.cases);

	// Reemplazar $: con $derived
	// Reemplazar on:click con onclick
	// Reemplazar onMount scroll con $effect
</script>
```

- [ ] **Step 3: Migrar login/+page.svelte**

```svelte
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	// validateOrThrow y manageError — ya son locales en login, dejarlos
	// Reemplazar on:submit con el enhance pattern de Svelte 5 si cambia
</script>
```

- [ ] **Step 4: Migrar signup/+page.svelte**

```svelte
<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { ProgressRing } from '@skeletonlabs/skeleton'; // verificar nombre en v3

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let loading = $state(false);
	let users = $derived(data.users ?? []);
</script>
```

- [ ] **Step 5: Migrar [estado]/+page.svelte**

```bash
cat src/routes/\[estado\]/+page.svelte
```

Aplicar mismo patrón de migración.

- [ ] **Step 6: Verificar TypeScript**

```bash
npm run check
```

Esperado: sin errores.

- [ ] **Step 7: Commit**

```bash
git add src/routes/+page.svelte src/routes/historial/+page.svelte src/routes/signup/+page.svelte src/routes/login/+page.svelte "src/routes/[estado]/+page.svelte"
git commit -m "refactor: migrate all route pages to Svelte 5 runes"
```

---

### Task 6: Verificación integral y merge

**Files:** Ninguno nuevo — solo verificación.

- [ ] **Step 1: Verificar TypeScript completo**

```bash
npm run check
```

Esperado: cero errores, cero warnings de `on:` deprecated.

- [ ] **Step 2: Build de producción**

```bash
npm run build
```

Esperado: build exitoso.

- [ ] **Step 3: Smoke test manual completo**

```bash
npm run dev
```

Verificar:

- [ ] Login funciona
- [ ] Logout funciona
- [ ] Tabla de casos muestra correctamente
- [ ] Buscador filtra casos
- [ ] "Nuevo Caso" abre modal y crea caso
- [ ] "Cobrar" abre modal y registra pago
- [ ] "Detalles" muestra pagos
- [ ] "Saldar" funciona
- [ ] "Eliminar" funciona
- [ ] `/vencido`, `/proximo`, `/atiempo` cargan
- [ ] `/historial` carga y elimina casos
- [ ] Signup crea usuarios (solo ADMIN)
- [ ] Fuente Cinzel carga en el título

- [ ] **Step 4: Merge a main**

```bash
git checkout main
git merge feat/skeleton-v3-svelte5
git push origin main
git branch -d feat/skeleton-v3-svelte5
```

---

## Verificación final del Plan 3

- [ ] `npm run check` — cero errores, cero usos de API Svelte 4 deprecada
- [ ] `npm run build` — sin warnings de compatibilidad
- [ ] Ningún archivo usa `on:` event syntax, `$:` reactive, o `export let`
- [ ] Ningún archivo usa `getModalStore()` o `initializeStores()`
- [ ] Todos los modales funcionan correctamente
