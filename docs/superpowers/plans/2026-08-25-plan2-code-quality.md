# Plan 2: Code Quality — Deduplicación, Types, Queries

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar código duplicado, unificar queries de DB, reemplazar validación manual con Zod, y erradicar tipos `any`.

**Architecture:** Extraer utilidades compartidas a `src/lib/utils/`, hacer que componentes y routes las importen. Unificar las 3 queries independientes en una sola con filtrado en memoria. Usar Zod schemas en APIs.

**Tech Stack:** SvelteKit 2, Svelte 5, TypeScript, Zod, Prisma 6, Vitest

## Global Constraints

- **Prerequisito:** Plan 1 completado (Vitest disponible)
- No modificar la UI — solo lógica y utilidades
- Mantener compatibilidad con Svelte 4 syntax (migración es Plan 3)
- Cada extracción de util debe ser acompañada de test
- `npm run check` debe pasar limpio después de cada task

---

## File Map

| Acción | Archivo                                                                                   |
| ------ | ----------------------------------------------------------------------------------------- |
| Create | `src/lib/utils/api.ts` — `createErrorResponse` compartida                                 |
| Create | `src/lib/utils/form.ts` — `validateOrThrow`, `manageError` compartidas                    |
| Create | `src/lib/utils/api.test.ts`                                                               |
| Create | `src/lib/utils/form.test.ts`                                                              |
| Modify | `src/routes/api/newCase/+server.ts` — importar desde `api.ts`, usar Zod                   |
| Modify | `src/routes/api/newPayment/+server.ts` — importar desde `api.ts`, usar Zod                |
| Modify | `src/lib/components/ModalForm.svelte` — importar utils desde `form.ts` y `formatters.ts`  |
| Modify | `src/lib/components/ModalToPay.svelte` — importar utils desde `form.ts` y `formatters.ts` |
| Modify | `src/lib/case.model.ts` — unificar 3 queries en 1                                         |
| Create | `src/lib/case.model.test.ts`                                                              |
| Modify | `src/routes/+page.svelte` — eliminar `{#key cases}`, tipar `data`                         |
| Modify | `src/routes/historial/+page.svelte` — tipar `cases`, fix `any`                            |
| Modify | `src/routes/api/newCase/+server.ts` — eliminar `typepayment as any`                       |
| Modify | `src/lib/components/modalSchema.ts` — verificar tipos exportados                          |

---

### Task 1: Extraer `createErrorResponse` a utils compartida

**Files:**

- Create: `src/lib/utils/api.ts`
- Create: `src/lib/utils/api.test.ts`
- Modify: `src/routes/api/newCase/+server.ts`
- Modify: `src/routes/api/newPayment/+server.ts`

**Interfaces:**

- Produce: `createErrorResponse(message: string, status: number): Response`

- [ ] **Step 1: Escribir test**

Crear `src/lib/utils/api.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createErrorResponse } from './api';

describe('createErrorResponse', () => {
	it('retorna Response con status y message correctos', async () => {
		const res = createErrorResponse('Faltan datos', 400);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe('Faltan datos');
	});

	it('retorna Response con status 500', async () => {
		const res = createErrorResponse('Error servidor', 500);
		expect(res.status).toBe(500);
	});
});
```

- [ ] **Step 2: Verificar que falla**

```bash
npm test
```

Esperado: FAIL — `api.ts` no existe.

- [ ] **Step 3: Crear src/lib/utils/api.ts**

```typescript
/**
 * Utilidades compartidas para API endpoints de SvelteKit
 */

/**
 * Crea una Response de error con formato JSON estándar
 */
export function createErrorResponse(message: string, status: number): Response {
	return new Response(JSON.stringify({ error: message }), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}
```

- [ ] **Step 4: Verificar que tests pasan**

```bash
npm test
```

Esperado: PASS.

- [ ] **Step 5: Actualizar newCase/+server.ts**

En `src/routes/api/newCase/+server.ts`:

1. Agregar import al inicio:

```typescript
import { createErrorResponse } from '$lib/utils/api';
```

2. Eliminar la función local `createErrorResponse` al final del archivo (las últimas 3 líneas):

```typescript
// ELIMINAR:
function createErrorResponse(message: string, status: number): Response {
	return new Response(JSON.stringify({ error: message }), { status });
}
```

- [ ] **Step 6: Actualizar newPayment/+server.ts**

En `src/routes/api/newPayment/+server.ts`:

1. Agregar import al inicio:

```typescript
import { createErrorResponse } from '$lib/utils/api';
```

2. Eliminar la función local `createErrorResponse` al final del archivo:

```typescript
// ELIMINAR:
function createErrorResponse(message: string, status: number): Response {
	return new Response(JSON.stringify({ error: message }), { status });
}
```

- [ ] **Step 7: Verificar TypeScript**

```bash
npm run check
```

Esperado: sin errores.

- [ ] **Step 8: Commit**

```bash
git add src/lib/utils/api.ts src/lib/utils/api.test.ts src/routes/api/newCase/+server.ts src/routes/api/newPayment/+server.ts
git commit -m "refactor: extract createErrorResponse to shared api utils"
```

---

### Task 2: Extraer `validateOrThrow`, `manageError`, `addThousandSeparator` duplicadas

**Files:**

- Create: `src/lib/utils/form.ts`
- Create: `src/lib/utils/form.test.ts`
- Modify: `src/lib/components/ModalForm.svelte`
- Modify: `src/lib/components/ModalToPay.svelte`

**Context:**

- `addThousandSeparator` está duplicada en `ModalForm.svelte` y `ModalToPay.svelte` — ya existe en `formatters.ts`
- `validateOrThrow` y `manageError` están duplicadas en `ModalForm.svelte` y `ModalToPay.svelte`
- La versión en `login/+page.svelte` y `signup/+page.svelte` es ligeramente diferente (validan con Error simple y Zod respectivamente) — dejarlas como están, son suficientemente distintas

**Interfaces:**

- Produce:
  - `validateOrThrow(obj: object, schema: ZodObject<any, any>): void` — lanza ZodError si falla
  - `manageFormError(error: unknown): Record<string, string | string[] | undefined>` — retorna fieldErrors de Zod

- [ ] **Step 1: Escribir tests**

Crear `src/lib/utils/form.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { z, ZodError } from 'zod';
import { validateOrThrow, manageFormError } from './form';

const schema = z.object({
	name: z.string().min(1),
	amount: z.string().min(1)
});

describe('validateOrThrow', () => {
	it('no lanza si los datos son válidos', () => {
		expect(() => validateOrThrow({ name: 'García', amount: '100' }, schema)).not.toThrow();
	});

	it('lanza ZodError si faltan campos requeridos', () => {
		expect(() => validateOrThrow({ name: '', amount: '100' }, schema)).toThrow(ZodError);
	});
});

describe('manageFormError', () => {
	it('retorna fieldErrors si el error es ZodError', () => {
		try {
			schema.parse({ name: '', amount: '' });
		} catch (error) {
			const result = manageFormError(error);
			expect(result).toHaveProperty('name');
		}
	});

	it('retorna objeto vacío si el error no es ZodError', () => {
		const result = manageFormError(new Error('otro error'));
		expect(result).toEqual({});
	});
});
```

- [ ] **Step 2: Verificar que falla**

```bash
npm test
```

Esperado: FAIL — `form.ts` no existe.

- [ ] **Step 3: Crear src/lib/utils/form.ts**

```typescript
import { ZodError, type ZodObject, type ZodRawShape } from 'zod';

/**
 * Valida un objeto contra un schema Zod. Lanza ZodError si falla.
 */
export function validateOrThrow(obj: object, schema: ZodObject<ZodRawShape>): void {
	schema.parse(obj);
}

/**
 * Extrae fieldErrors de un ZodError para mostrar en formulario.
 * Retorna objeto vacío para otros tipos de error.
 */
export function manageFormError(error: unknown): Record<string, string | string[] | undefined> {
	if (error instanceof ZodError) {
		return error.flatten().fieldErrors;
	}
	return {};
}
```

- [ ] **Step 4: Verificar que tests pasan**

```bash
npm test
```

Esperado: PASS.

- [ ] **Step 5: Actualizar ModalForm.svelte**

En `src/lib/components/ModalForm.svelte`, en el bloque `<script lang="ts">`:

1. Agregar imports:

```typescript
import { addThousandSeparator } from '$lib/utils/formatters';
import { validateOrThrow, manageFormError } from '$lib/utils/form';
```

2. Eliminar la función local `addThousandSeparator` (líneas ~22-24):

```typescript
// ELIMINAR:
function addThousandSeparator(price: number) {
	return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
```

3. Reemplazar las funciones locales `validateOrThrow` y `manageError`:

```typescript
// ELIMINAR:
function validateOrThrow(obj: Object, schema: ZodObject<any, any>) {
	schema.parse(obj);
}
function manageError(error: any) {
	if (error instanceof ZodError) {
		const { fieldErrors } = error.flatten();
		form = { errors: fieldErrors };
	}
}
```

4. En `onFormSubmit`, reemplazar la llamada a `manageError(error)` por:

```typescript
} catch (error) {
  loading = false;
  form = { errors: manageFormError(error) };
}
```

5. Eliminar los imports de Zod que ya no son necesarios directamente:

```typescript
// ELIMINAR si ya no se usan directamente:
import { ZodError, ZodObject } from 'zod';
```

- [ ] **Step 6: Actualizar ModalToPay.svelte**

En `src/lib/components/ModalToPay.svelte`:

1. Agregar imports:

```typescript
import { addThousandSeparator } from '$lib/utils/formatters';
import { validateOrThrow, manageFormError } from '$lib/utils/form';
```

2. Eliminar la función local `addThousandSeparator` (~línea 20-22).

3. Eliminar las funciones locales `validateOrThrow` y `manageError`.

4. En el catch de `onFormSubmit`, cambiar:

```typescript
} catch (error) {
  loading = false;
  form = { errors: manageFormError(error) };
}
```

5. Eliminar imports de Zod que ya no se usen directamente.

- [ ] **Step 7: Verificar TypeScript**

```bash
npm run check
```

Esperado: sin errores.

- [ ] **Step 8: Verificar manualmente ambos modales**

```bash
npm run dev
```

Probar "Nuevo Caso" y "Cobrar" — deben funcionar igual que antes.

- [ ] **Step 9: Commit**

```bash
git add src/lib/utils/form.ts src/lib/utils/form.test.ts src/lib/components/ModalForm.svelte src/lib/components/ModalToPay.svelte
git commit -m "refactor: extract duplicated form utils, use shared addThousandSeparator"
```

---

### Task 3: Unificar las 3 queries de DB en una

**Files:**

- Modify: `src/lib/case.model.ts` — refactorizar `getOverDueCases`, `getSoonDueCases`, `getOnTimeCases`
- Create: `src/lib/case.model.test.ts`

**Context:** Las 3 funciones llaman `getCasesWithDebt()` individualmente. Si la ruta `/[estado]` carga una categoría, hace 1 query extra. Si la home carga todas, son 3 queries separadas a MySQL. La solución: exponer una función `getCasesWithDebtGrouped()` que retorna las 3 categorías desde 1 query.

**Interfaces:**

- Produce:

```typescript
getCasesGrouped(): Promise<{
  overdue: CaseWithPayments[];
  soon: CaseWithPayments[];
  onTime: CaseWithPayments[];
}>
```

- Las funciones individuales `getOverDueCases`, `getSoonDueCases`, `getOnTimeCases` se mantienen para compatibilidad con `[estado]/+page.server.ts`, pero internamente llaman `getCasesGrouped`.

- [ ] **Step 1: Escribir tests**

Crear `src/lib/case.model.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock del módulo db
vi.mock('./db', () => ({
	db: {
		cases: {
			findMany: vi.fn()
		}
	}
}));

import { db } from './db';
import { classifyCaseByDate } from './case.model';

describe('classifyCaseByDate', () => {
	const now = new Date();

	const makeCase = (daysOffset: number, current: boolean = true) => ({
		id: 1,
		payments: [
			{
				current,
				due_date: new Date(now.getTime() + daysOffset * 24 * 60 * 60 * 1000)
			}
		]
	});

	it('clasifica como overdue si la fecha es pasada', () => {
		const caso = makeCase(-1);
		expect(classifyCaseByDate(caso as any, now)).toBe('overdue');
	});

	it('clasifica como soon si faltan menos de 5 días', () => {
		const caso = makeCase(3);
		expect(classifyCaseByDate(caso as any, now)).toBe('soon');
	});

	it('clasifica como onTime si faltan 5 o más días', () => {
		const caso = makeCase(10);
		expect(classifyCaseByDate(caso as any, now)).toBe('onTime');
	});

	it('retorna null si no hay pago actual', () => {
		const caso = makeCase(10, false);
		expect(classifyCaseByDate(caso as any, now)).toBeNull();
	});
});
```

- [ ] **Step 2: Verificar que falla**

```bash
npm test
```

Esperado: FAIL — `classifyCaseByDate` no está exportada.

- [ ] **Step 3: Refactorizar case.model.ts**

En `src/lib/case.model.ts`, reemplazar las funciones de clasificación:

```typescript
// ============================================
// CLASSIFICATION HELPER (exportada para testing)
// ============================================

type CaseCategory = 'overdue' | 'soon' | 'onTime' | null;

/**
 * Clasifica un caso según el vencimiento de su pago actual
 */
export function classifyCaseByDate(caso: CaseWithPayments, currentDate: Date): CaseCategory {
	const currentPayment = findCurrentPayment(caso);
	if (!currentPayment) return null;

	const daysUntilDue = differenceInDays(currentPayment.due_date, currentDate);

	if (currentPayment.due_date < currentDate) return 'overdue';
	if (daysUntilDue < 5) return 'soon';
	return 'onTime';
}

// ============================================
// READ OPERATIONS — GROUPED (1 query para todas las categorías)
// ============================================

/**
 * Obtiene todos los casos con deuda y los clasifica en 1 sola query
 */
export async function getCasesGrouped(): Promise<{
	overdue: CaseWithPayments[];
	soon: CaseWithPayments[];
	onTime: CaseWithPayments[];
}> {
	const cases = await getCasesWithDebt();
	const currentDate = new Date();

	const result = {
		overdue: [] as CaseWithPayments[],
		soon: [] as CaseWithPayments[],
		onTime: [] as CaseWithPayments[]
	};

	for (const caso of cases) {
		const category = classifyCaseByDate(caso, currentDate);
		if (category) result[category].push(caso);
	}

	return result;
}

/**
 * Obtiene casos con pagos vencidos
 */
export async function getOverDueCases(): Promise<CaseWithPayments[]> {
	const { overdue } = await getCasesGrouped();
	return overdue;
}

/**
 * Obtiene casos con pagos próximos a vencer (menos de 5 días)
 */
export async function getSoonDueCases(): Promise<CaseWithPayments[]> {
	const { soon } = await getCasesGrouped();
	return soon;
}

/**
 * Obtiene casos con pagos al día (5 o más días hasta vencimiento)
 */
export async function getOnTimeCases(): Promise<CaseWithPayments[]> {
	const { onTime } = await getCasesGrouped();
	return onTime;
}
```

**Nota:** Eliminar las implementaciones anteriores de `getOverDueCases`, `getSoonDueCases`, `getOnTimeCases` que duplicaban la query.

- [ ] **Step 4: Verificar tests pasan**

```bash
npm test
```

Esperado: PASS en todos los tests de `case.model.test.ts`.

- [ ] **Step 5: Verificar TypeScript**

```bash
npm run check
```

Esperado: sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/lib/case.model.ts src/lib/case.model.test.ts
git commit -m "perf: unify 3 separate DB queries into one with in-memory classification"
```

---

### Task 4: Reemplazar validación manual con Zod en APIs

**Files:**

- Modify: `src/routes/api/newCase/+server.ts` — reemplazar `isValidCaseData` con Zod
- Modify: `src/routes/api/newPayment/+server.ts` — reemplazar `isValidPaymentData` con Zod
- Modify: `src/lib/components/modalSchema.ts` — verificar y re-exportar si es necesario

**Context:** `isValidCaseData` y `isValidPaymentData` usan `Boolean(a && b && c)` — no dan mensajes de error descriptivos. Zod ya existe en el proyecto. Los schemas de Zod del frontend (`modalSchema.ts`, `paymentSchema.ts`) se pueden reutilizar o crear schemas de servidor.

**Interfaces:**

- Consumes: schemas Zod existentes en `src/lib/components/modalSchema.ts` y `paymentSchema.ts`
- Produce: validación descriptiva con `ZodError` en lugar de `400 Faltan datos`

- [ ] **Step 1: Leer modalSchema.ts y paymentSchema.ts**

```bash
cat src/lib/components/modalSchema.ts
cat src/lib/components/paymentSchema.ts
```

Tomar nota de los campos que valida cada schema.

- [ ] **Step 2: Actualizar newCase/+server.ts**

En `src/routes/api/newCase/+server.ts`, reemplazar la validación manual:

```typescript
// Agregar imports al inicio:
import { z, ZodError } from 'zod';

// Schema de validación para nuevo caso:
const NewCaseSchema = z.object({
	description: z.string().min(1),
	amount: z.string().min(1),
	clientName: z.string().min(1),
	clientPhone: z.string().min(1),
	quantity_payment: z.string().min(1),
	due_date: z.string().min(1),
	type: z.string().min(1),
	period: z.enum(['SEMANAL', 'QUINCENAL', 'MENSUAL']),
	// Opcionales (solo si se paga la primera cuota hoy):
	amount_payment: z.string().optional(),
	typepayment: z.string().optional(),
	collector: z.string().optional()
});

// En el handler POST, reemplazar la llamada a isValidCaseData:
export const POST: RequestHandler = async ({ locals, request }) => {
	const user = locals.user;
	if (!user) throw redirect(302, '/login');

	const jusValue = await getJusValue();
	if (!jusValue) return createErrorResponse('No se pudo obtener el valor del JUS', 500);

	const rawData = await request.json();

	let data: NewCaseFormData;
	try {
		data = NewCaseSchema.parse(rawData) as NewCaseFormData;
	} catch (error) {
		if (error instanceof ZodError) {
			return createErrorResponse(error.errors[0]?.message ?? 'Datos inválidos', 400);
		}
		return createErrorResponse('Datos inválidos', 400);
	}

	try {
		const caso = buildCaseData(data, user.id, jusValue);
		const response = await saveCase(caso);
		return new Response(JSON.stringify(response), { status: 201 });
	} catch (error) {
		console.error('Error creating case:', error);
		return createErrorResponse('Error al crear caso', 500);
	}
};

// ELIMINAR la función isValidCaseData que ya no se usa.
```

- [ ] **Step 3: Actualizar newPayment/+server.ts**

```typescript
// Agregar imports:
import { z, ZodError } from 'zod';

// Schema de validación:
const PaymentSchema = z.object({
	caseId: z.string().min(1),
	amount: z.string().min(1),
	typepayment: z.string().min(1),
	paymentNumber: z.string().min(1),
	collector: z.string().min(1)
});

// En POST handler, reemplazar isValidPaymentData:
export const POST: RequestHandler = async ({ locals, request }) => {
	const user = locals.user;
	if (!user) throw redirect(302, '/login');

	const jusValue = await getJusValue();
	if (!jusValue) return createErrorResponse('No se pudo obtener el valor del JUS', 500);

	const rawData = await request.json();

	let data: ReturnType<typeof PaymentSchema.parse>;
	try {
		data = PaymentSchema.parse(rawData);
	} catch (error) {
		if (error instanceof ZodError) {
			return createErrorResponse(error.errors[0]?.message ?? 'Datos inválidos', 400);
		}
		return createErrorResponse('Datos inválidos', 400);
	}

	try {
		const amountJus = parseFloat(data.amount.replace(',', '.'));
		const response = await createPayment(parseInt(data.caseId, 10), {
			amount: parseFloat(amountJus.toFixed(3)),
			typepayment: data.typepayment as PaymentType,
			paymentNumber: parseInt(data.paymentNumber, 10),
			collector: data.collector
		});
		return new Response(JSON.stringify({ response }), { status: 200 });
	} catch (error) {
		console.error('Error creating payment:', error);
		return createErrorResponse('Error al registrar pago', 500);
	}
};

// ELIMINAR la función isValidPaymentData y la interface PaymentRequestData.
```

- [ ] **Step 4: Fix typepayment as any en buildPayments**

En `src/routes/api/newCase/+server.ts`, en la función `buildPayments`, cambiar:

```typescript
// ANTES:
typepayment: typepayment && isFirstPayment ? (typepayment as any) : undefined,
```

por:

```typescript
// DESPUÉS:
typepayment: typepayment && isFirstPayment ? (typepayment as PaymentType) : undefined,
```

Asegurarse que `PaymentType` está importado desde `@prisma/client`.

- [ ] **Step 5: Verificar TypeScript**

```bash
npm run check
```

Esperado: sin errores y sin `as any`.

- [ ] **Step 6: Commit**

```bash
git add src/routes/api/newCase/+server.ts src/routes/api/newPayment/+server.ts
git commit -m "refactor: replace manual boolean validation with Zod schemas in API endpoints"
```

---

### Task 5: Limpiar tipos `any` y eliminar `{#key cases}`

**Files:**

- Modify: `src/routes/+page.svelte` — tipar `data`, eliminar `{#key cases}`
- Modify: `src/routes/historial/+page.svelte` — tipar `cases`

**Interfaces:**

- Consumes: tipos generados por SvelteKit en `./$types`

- [ ] **Step 1: Actualizar +page.svelte**

En `src/routes/+page.svelte`, reemplazar el bloque `<script>`:

```svelte
<script lang="ts">
	import CasesContainer from '$lib/components/CasesContainer.svelte';
	import type { PageData } from './$types';

	export let data: PageData;
</script>
```

Y en el template, eliminar el `{#key cases}`:

```svelte
<!-- ANTES: -->
{#key cases}
	<CasesContainer {cases} />
{/key}
```

```svelte
<!-- DESPUÉS: -->
<CasesContainer cases={data.cases} />
```

- [ ] **Step 2: Actualizar historial/+page.svelte**

En `src/routes/historial/+page.svelte`, reemplazar la declaración de `cases`:

```svelte
<script lang="ts">
	// Cambiar:
	export let data;
	let cases: any;
	$: {
		if (data?.cases) {
			cases = data.cases;
		}
	}

	// Por:
	import type { PageData } from './$types';
	export let data: PageData;
	$: cases = data.cases;
</script>
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npm run check
```

Esperado: sin errores ni warnings de `any`.

- [ ] **Step 4: Verificar manualmente**

```bash
npm run dev
```

Navegar a `/` y `/historial` — deben funcionar igual.

- [ ] **Step 5: Commit**

```bash
git add src/routes/+page.svelte src/routes/historial/+page.svelte
git commit -m "refactor: replace any types with PageData, remove unnecessary {#key} block"
```

---

## Verificación final del Plan 2

- [ ] `npm test` — todos los tests pasan (incluyendo los del Plan 1)
- [ ] `npm run check` — cero errores TypeScript, cero `any` sueltos
- [ ] `npm run build` — build exitoso
- [ ] Probar "Nuevo Caso" con datos válidos — se crea correctamente
- [ ] Probar "Nuevo Caso" con datos inválidos — muestra errores de validación
- [ ] Probar "Cobrar" — funciona correctamente
- [ ] Navegar a `/vencido`, `/proximo`, `/atiempo` — cargan correctamente (1 query each, no 3)
