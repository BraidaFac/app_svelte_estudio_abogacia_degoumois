# Plan 1: Bug Fixes & Quick Wins

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corregir bugs críticos, eliminar debug logs, configurar Vitest, agregar índices de DB, y limpiar archivos de entorno.

**Architecture:** Cambios atómicos e independientes. Ninguno rompe funcionalidad existente. El setup de Vitest habilita tests para el resto de los planes.

**Tech Stack:** SvelteKit 2, Svelte 5, Prisma 6, Vitest, TypeScript

## Global Constraints

- No modificar lógica de negocio — solo bugs y configuración
- Mantener compatibilidad con Svelte 4 syntax (la migración a Svelte 5 runes es el Plan 3)
- Comandos ejecutar desde raíz del proyecto: `C:/Users/frbra/Desktop/Proyectos/Svelte/estudio_ricardo_project`
- `npm run dev` debe seguir funcionando tras cada task

---

## File Map

| Acción | Archivo                                                                     |
| ------ | --------------------------------------------------------------------------- |
| Create | `vitest.config.ts`                                                          |
| Create | `src/lib/stores/filter.test.ts`                                             |
| Modify | `src/lib/stores/filter.ts` — fix `filtered = []` bug                        |
| Modify | `src/routes/+layout.svelte` — fix `href="/="`                               |
| Modify | `src/lib/case.model.ts` — remove `console.log(caseId)`                      |
| Modify | `src/lib/components/ModalToPay.svelte` — remove `console.log(data)`         |
| Modify | `src/app.html` — mover Google Fonts a `<head>` con preconnect               |
| Modify | `src/routes/+layout.svelte` — eliminar `@import` Google Fonts del `<style>` |
| Modify | `package.json` — remover `dotenv`, agregar script de test                   |
| Create | `.env.example`                                                              |
| Create | `src/routes/+error.svelte`                                                  |
| Modify | `prisma/schema.prisma` — agregar `@@index`                                  |
| Run    | `npx prisma migrate dev`                                                    |

---

### Task 1: Setup Vitest

**Files:**

- Create: `vitest.config.ts`
- Modify: `package.json` — agregar script `test`

**Interfaces:**

- Produce: runner de tests disponible vía `npm test`

- [ ] **Step 1: Instalar Vitest**

```bash
npm install -D vitest @vitest/ui
```

- [ ] **Step 2: Crear vitest.config.ts**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'node'
	}
});
```

- [ ] **Step 3: Agregar script en package.json**

En la sección `"scripts"` de `package.json`, agregar:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verificar que el runner funciona**

```bash
npm test
```

Esperado: `No test files found` (sin error de configuración)

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts package.json package-lock.json
git commit -m "chore: add Vitest test runner"
```

---

### Task 2: Fix bug — search store muestra tabla vacía cuando no hay búsqueda

**Files:**

- Create: `src/lib/stores/filter.test.ts`
- Modify: `src/lib/stores/filter.ts:40`

**Context:** `searchHandler` setea `store.filtered = []` cuando el término de búsqueda está vacío. Esto hace que la tabla principal muestre cero filas al cargar la página, sin que el usuario haya escrito nada.

**Interfaces:**

- Consumes: `createSearchStore`, `searchHandler` de `src/lib/stores/filter.ts`
- Produce: comportamiento correcto — sin búsqueda → mostrar todos los items

- [ ] **Step 1: Escribir el test que falla**

Crear `src/lib/stores/filter.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createSearchStore, searchHandler } from './filter';

describe('searchHandler', () => {
	const mockData = [
		{ id: 1, searchTerms: 'García civil' },
		{ id: 2, searchTerms: 'López penal' }
	];

	it('muestra todos los items cuando la búsqueda está vacía', () => {
		const store = { data: mockData, filtered: [], search: '' };
		searchHandler(store);
		expect(store.filtered).toEqual(mockData);
	});

	it('filtra correctamente cuando hay término de búsqueda', () => {
		const store = { data: mockData, filtered: [], search: 'García' };
		searchHandler(store);
		expect(store.filtered).toHaveLength(1);
		expect(store.filtered[0].id).toBe(1);
	});

	it('filtra por múltiples palabras (todas deben coincidir)', () => {
		const store = { data: mockData, filtered: [], search: 'García civil' };
		searchHandler(store);
		expect(store.filtered).toHaveLength(1);
	});

	it('retorna vacío si ningún item coincide', () => {
		const store = { data: mockData, filtered: [], search: 'xyz' };
		searchHandler(store);
		expect(store.filtered).toHaveLength(0);
	});
});
```

- [ ] **Step 2: Verificar que el test falla**

```bash
npm test
```

Esperado: FAIL en `muestra todos los items cuando la búsqueda está vacía`

- [ ] **Step 3: Corregir el bug en filter.ts**

En `src/lib/stores/filter.ts`, línea 40, cambiar:

```typescript
// ANTES (línea ~38-41):
if (!searchTerm) {
	store.filtered = [];
	return;
}
```

por:

```typescript
if (!searchTerm) {
	store.filtered = store.data;
	return;
}
```

- [ ] **Step 4: Verificar que los tests pasan**

```bash
npm test
```

Esperado: PASS en todos los tests de `filter.test.ts`

- [ ] **Step 5: Verificar manualmente**

```bash
npm run dev
```

Abrir `http://localhost:5173` — la tabla debe mostrar todos los casos al cargar, sin necesidad de escribir en el buscador.

- [ ] **Step 6: Commit**

```bash
git add src/lib/stores/filter.ts src/lib/stores/filter.test.ts
git commit -m "fix: show all cases when search input is empty"
```

---

### Task 3: Fix typo href y eliminar console.logs

**Files:**

- Modify: `src/routes/+layout.svelte` — `href="/="` → `href="/"`
- Modify: `src/lib/case.model.ts:153` — eliminar `console.log(caseId)`
- Modify: `src/lib/components/ModalToPay.svelte` — eliminar `console.log(data)`

**Interfaces:**

- Ninguna

- [ ] **Step 1: Corregir href en layout**

En `src/routes/+layout.svelte`, cambiar:

```svelte
<!-- ANTES -->
<a href="/="><h1 class="title text-4xl">Estudio Degoumois</h1></a>
```

por:

```svelte
<!-- DESPUÉS -->
<a href="/"><h1 class="title text-4xl">Estudio Degoumois</h1></a>
```

- [ ] **Step 2: Eliminar console.log en case.model.ts**

En `src/lib/case.model.ts`, dentro de `deleteCase`, eliminar la línea:

```typescript
// ANTES (líneas ~153-154):
export async function deleteCase(caseId: number) {
    console.log(caseId);  // ← eliminar esta línea

    // Primero eliminar todos los pagos...
```

Resultado:

```typescript
export async function deleteCase(caseId: number) {
    // Primero eliminar todos los pagos asociados al caso
    await db.payment.deleteMany({
```

- [ ] **Step 3: Eliminar console.log en ModalToPay.svelte**

En `src/lib/components/ModalToPay.svelte`, dentro de `onFormSubmit`, eliminar:

```typescript
// ANTES:
const data = Object.fromEntries(form.entries());
console.log(data); // ← eliminar esta línea

validateOrThrow(data, paymentSchema);
```

Resultado:

```typescript
const data = Object.fromEntries(form.entries());
validateOrThrow(data, paymentSchema);
```

- [ ] **Step 4: Verificar que la app compila**

```bash
npm run check
```

Esperado: sin errores TypeScript.

- [ ] **Step 5: Commit**

```bash
git add src/routes/+layout.svelte src/lib/case.model.ts src/lib/components/ModalToPay.svelte
git commit -m "fix: correct homepage link typo and remove debug console.logs"
```

---

### Task 4: Mover Google Fonts a app.html

**Files:**

- Modify: `src/app.html` — agregar preconnect + link de Google Fonts
- Modify: `src/routes/+layout.svelte` — eliminar `@import` del bloque `<style>`

**Context:** `@import` de fuentes dentro de un bloque `<style>` de Svelte bloquea el render. Moverlo a `<head>` con `preconnect` lo carga en paralelo.

**Interfaces:**

- Ninguna — cambio puramente de performance/HTML

- [ ] **Step 1: Leer app.html actual**

Abrir `src/app.html` y localizar el bloque `<head>`.

- [ ] **Step 2: Agregar preconnect y font link en app.html**

En `src/app.html`, dentro de `<head>`, agregar antes de `%sveltekit.head%`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
<link
	href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400..900&display=swap"
	rel="stylesheet"
/>
```

- [ ] **Step 3: Eliminar @import del layout**

En `src/routes/+layout.svelte`, el bloque `<style>` al final debe quedar:

```svelte
<style>
	.title {
		font-family: 'Cinzel', serif;
		font-optical-sizing: auto;
		font-style: normal;
	}
</style>
```

(eliminar solo la línea `@import url(...)`)

- [ ] **Step 4: Verificar que la fuente sigue cargando**

```bash
npm run dev
```

Abrir `http://localhost:5173` — el título "Estudio Degoumois" debe seguir en fuente Cinzel.

- [ ] **Step 5: Commit**

```bash
git add src/app.html src/routes/+layout.svelte
git commit -m "perf: move Google Fonts to head with preconnect for faster loading"
```

---

### Task 5: Remover dotenv y crear .env.example

**Files:**

- Modify: `package.json` — remover `dotenv` de `dependencies`
- Create: `.env.example`

**Context:** SvelteKit carga variables de entorno nativamente desde `.env`. `dotenv` es redundante en producción y suma bundle weight.

**Interfaces:**

- Ninguna

- [ ] **Step 1: Desinstalar dotenv**

```bash
npm uninstall dotenv
```

- [ ] **Step 2: Verificar que ningún archivo importa dotenv**

```bash
grep -r "dotenv" src/
```

Esperado: sin resultados. Si aparece alguno, eliminarlo.

- [ ] **Step 3: Crear .env.example**

Crear `.env.example` en la raíz:

```env
# Base de datos MySQL
DATABASE_URL="mysql://usuario:password@localhost:3306/estudio_ricardo"

# JWT Secret — usar un valor aleatorio largo en producción
# Generarlo con: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_ACCESS_SECRET="tu-secret-muy-largo-aqui"
```

- [ ] **Step 4: Agregar .env al .gitignore (verificar)**

```bash
grep "\.env" .gitignore
```

Esperado: `.env` debe estar listado. Si no está, agregarlo.

- [ ] **Step 5: Verificar que la app compila sin dotenv**

```bash
npm run build
```

Esperado: build exitoso sin errores.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore: remove unused dotenv dependency, add .env.example"
```

---

### Task 6: Agregar página de error

**Files:**

- Create: `src/routes/+error.svelte`

**Context:** SvelteKit usa `+error.svelte` como fallback para errores 404/500. Sin él, el error se muestra en un layout genérico sin estilos.

**Interfaces:**

- Produce: página de error con estilos Skeleton UI

- [ ] **Step 1: Crear +error.svelte**

Crear `src/routes/+error.svelte`:

```svelte
<script lang="ts">
	import { page } from '$app/stores';
</script>

<div class="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-8">
	<div class="card p-8 text-center shadow-xl">
		<h1 class="text-error-500 mb-2 text-6xl font-bold">
			{$page.status}
		</h1>
		<p class="mb-6 text-2xl">
			{$page.error?.message ?? 'Ocurrió un error inesperado'}
		</p>
		<a href="/" class="btn variant-filled-primary"> Volver al inicio </a>
	</div>
</div>
```

- [ ] **Step 2: Verificar que compila**

```bash
npm run check
```

Esperado: sin errores.

- [ ] **Step 3: Verificar manualmente**

```bash
npm run dev
```

Navegar a `http://localhost:5173/ruta-que-no-existe` — debe mostrar la página de error con status 404.

- [ ] **Step 4: Commit**

```bash
git add src/routes/+error.svelte
git commit -m "feat: add custom error page for 404/500 responses"
```

---

### Task 7: Agregar índices en schema Prisma

**Files:**

- Modify: `prisma/schema.prisma` — agregar `@@index`

**Context:** `restAmount`, `userId` en `Cases` y `current` + `caseId` en `Payment` son filtrados frecuentemente sin índice. Con pocos registros no importa, pero al crecer degrada las queries.

**Interfaces:**

- Ninguna visible desde código — mejora de DB interna

- [ ] **Step 1: Modificar schema.prisma**

En `prisma/schema.prisma`, actualizar los modelos:

```prisma
model Cases {
  id          Int       @id @default(autoincrement())
  description String
  createdAt   DateTime  @default(now())
  updatedAt   DateTime? @updatedAt
  userId      Int
  user        User      @relation(fields: [userId], references: [id])
  clientName  String
  clientPhone String
  amount      Float
  restAmount  Float
  payments    Payment[]
  type        typeCase

  @@index([userId])
  @@index([restAmount])
}

model Payment {
  payment_number Int
  due_date       DateTime
  payment_date   DateTime?
  caseId         Int
  case           Cases        @relation(fields: [caseId], references: [id])
  typepayment    PaymentType?
  amount         Float?
  current        Boolean
  collector      String?

  @@id([payment_number, caseId])
  @@index([caseId, current])
}
```

- [ ] **Step 2: Crear y aplicar migración**

```bash
npx prisma migrate dev --name add_performance_indexes
```

Esperado: migración aplicada sin errores.

- [ ] **Step 3: Verificar que Prisma Client se regeneró**

```bash
npx prisma generate
```

- [ ] **Step 4: Verificar que la app levanta**

```bash
npm run dev
```

Esperado: sin errores de conexión ni de Prisma.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "perf: add database indexes on restAmount, userId, and Payment(caseId, current)"
```

---

## Verificación final del Plan 1

- [ ] `npm test` — todos los tests pasan
- [ ] `npm run check` — sin errores TypeScript
- [ ] `npm run build` — build exitoso
- [ ] Navegar a `/` — tabla muestra casos sin necesidad de buscar
- [ ] Click en logo "Estudio Degoumois" — navega a `/` (no a `/=`)
- [ ] Navegar a ruta inexistente — muestra página de error customizada
