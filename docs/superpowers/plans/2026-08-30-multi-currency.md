# Multi-Currency Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend Estudio Ricardo from JUS-only to JUS + USD + EUR, with each case storing amounts in its native currency and display converting via live rates.

**Architecture:** Cases gain a `currencyId` FK to the existing `Currency` table. All conversion logic centralizes in `src/lib/utils/currency.ts`. The server mapper computes `restAmountPesos` so display components receive pre-computed ARS values. Interactive real-time conversion (typing in modals) uses the same utility functions client-side.

**Tech Stack:** Prisma 6 + MySQL, SvelteKit 2 (Svelte 5 runes), TypeScript, Zod, Vitest, Tailwind v4

**Spec:** `docs/superpowers/specs/2026-08-30-multi-currency-design.md`

## Global Constraints

- Svelte 5 runes mode — use `$state`, `$derived`, `$props`, `$effect`; no stores
- Tailwind v4 — no config file, all tokens in `app.css`
- Prisma 6 — Decimal fields use `.toNumber()` for serialization
- All monetary amounts `Decimal(12,4)` — never `Float`
- No commits between tasks — single commit at the very end
- Run `pnpm check` after Task 7 to catch type errors before touching UI
- Test command: `pnpm vitest run`

---

## File Map

| File | Action | Task |
|------|--------|------|
| `prisma/schema.prisma` | Modify — add `isDefault` to Currency, `currencyId` to Cases | 1 |
| `prisma/seed.ts` | Create | 1 |
| `package.json` | Modify — add prisma seed config | 1 |
| `src/lib/currency.model.ts` | Create — replaces jus.model.ts | 2 |
| `src/lib/utils/currency.ts` | Create — all conversion logic | 3 |
| `src/lib/utils/currency.test.ts` | Create — tests for currency.ts | 3 |
| `src/lib/types/case.types.ts` | Modify — add `currency`, `restAmountPesos` to FormattedCase; `currencyId` to CreateCaseData | 4 |
| `src/lib/types/modal.types.ts` | Modify — add `openConverter`, rename `openJus` → `openCurrencies` | 4 |
| `src/lib/case.model.ts` | Modify — include currency in all queries | 5 |
| `src/routes/+page.server.ts` | Modify — mapper computes restAmountPesos + currency | 5 |
| `src/routes/[estado]/+page.server.ts` | Modify — mapper computes restAmountPesos + currency | 5 |
| `src/routes/historial/+page.server.ts` | Modify — mapper computes restAmountPesos + currency | 5 |
| `src/routes/api/currencies/+server.ts` | Create — GET + POST handler | 6 |
| `src/routes/+layout.server.ts` | Modify — return `currencies` array instead of `jus_value` | 7 |
| `src/routes/api/newCase/+server.ts` | Modify — accept currencyId, remove jusValue conversion | 7 |
| `src/routes/api/newPayment/+server.ts` | Modify — remove jusValue, native currency amounts | 7 |
| `src/routes/api/jusValue/+server.ts` | Delete | 7 |
| `src/lib/jus.model.ts` | Delete | 7 |
| `src/lib/components/ModalCurrencies.svelte` | Create — replaces ModalJus | 8 |
| `src/lib/components/ModalConverter.svelte` | Create — read-only conversion table | 9 |
| `src/lib/components/ModalForm.svelte` | Modify — currency selector + live converter | 10 |
| `src/lib/components/ModalToPay.svelte` | Modify — currency-aware input | 11 |
| `src/routes/+layout.svelte` | Modify — wire ModalCurrencies + ModalConverter | 12 |
| `src/lib/components/CasesContainer.svelte` | Modify — formatAmount + restAmountPesos | 12 |
| `src/routes/+page.svelte` | Modify — show currency badge on cards | 12 |
| `src/routes/[estado]/+page.svelte` | Modify — show currency info | 12 |
| `src/routes/historial/+page.svelte` | Modify — show currency info | 12 |

---

### Task 1: Prisma Schema + Seed

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `Currency` model with `isDefault: Boolean`; `Cases` model with `currencyId: Int @default(1)`; seed data for JUS/USD/EUR

- [ ] **Step 1: Update Currency model in schema.prisma**

Add `isDefault` field and inverse relation:

```prisma
model Currency {
  id        Int     @id @default(autoincrement())
  name      String  @unique
  value     Decimal @db.Decimal(12, 4)
  isDefault Boolean @default(false)
  cases     Cases[]
}
```

- [ ] **Step 2: Add currencyId to Cases model in schema.prisma**

Add after the `type` field, before the closing `}`:

```prisma
  currencyId Int      @default(1)
  currency   Currency @relation(fields: [currencyId], references: [id])
```

Add `@@index([currencyId])` to the existing index block:

```prisma
  @@index([userId])
  @@index([restAmount])
  @@index([closed])
  @@index([currencyId])
```

- [ ] **Step 3: Run Prisma migration**

```bash
pnpm exec prisma migrate dev --name add-multi-currency
```

Expected: migration file created in `prisma/migrations/`, Prisma client regenerated. Existing cases get `currencyId = 1` (DB default).

- [ ] **Step 4: Add prisma seed config to package.json**

In `package.json`, add a top-level `"prisma"` key alongside `"scripts"`:

```json
"prisma": {
  "seed": "npx tsx prisma/seed.ts"
},
```

- [ ] **Step 5: Create prisma/seed.ts**

```typescript
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
	await db.currency.upsert({
		where: { name: 'JUS' },
		update: {},
		create: { name: 'JUS', value: 5000, isDefault: true }
	});
	await db.currency.upsert({
		where: { name: 'USD' },
		update: {},
		create: { name: 'USD', value: 1500, isDefault: false }
	});
	await db.currency.upsert({
		where: { name: 'EUR' },
		update: {},
		create: { name: 'EUR', value: 1650, isDefault: false }
	});
	console.log('Currencies seeded: JUS (default), USD, EUR');
}

main()
	.catch((e) => { console.error(e); process.exit(1); })
	.finally(() => db.$disconnect());
```

- [ ] **Step 6: Run seed**

```bash
pnpm exec prisma db seed
```

Expected output: `Currencies seeded: JUS (default), USD, EUR`

---

### Task 2: currency.model.ts

**Files:**
- Create: `src/lib/currency.model.ts`

**Interfaces:**
- Consumes: `db` from `$lib/db`, Prisma `Currency` model
- Produces:
  - `getCurrencies(): Promise<CurrencyRecord[]>`
  - `getCurrencyRates(): Promise<Record<string, number>>`
  - `getDefaultCurrency(): Promise<CurrencyRecord>`
  - `setCurrencyValue(name, value): Promise<number>`
  - `setCurrencyAsDefault(name): Promise<void>`
  - `getJusValue(): Promise<number | undefined>` (compat shim — removed in Task 7)

- [ ] **Step 1: Create src/lib/currency.model.ts**

```typescript
import { db } from './db';

export type CurrencyRecord = {
	id: number;
	name: string;
	value: number;
	isDefault: boolean;
};

/**
 * Returns all currencies sorted by id.
 * value is converted from Decimal to number.
 */
export async function getCurrencies(): Promise<CurrencyRecord[]> {
	const rows = await db.currency.findMany({ orderBy: { id: 'asc' } });
	return rows.map((r) => ({ ...r, value: r.value.toNumber() }));
}

/**
 * Returns { JUS: 5000, USD: 1500, EUR: 1650 }
 */
export async function getCurrencyRates(): Promise<Record<string, number>> {
	const currencies = await getCurrencies();
	return Object.fromEntries(currencies.map((c) => [c.name, c.value]));
}

/**
 * Returns the currency with isDefault = true.
 * Throws if none configured (should not happen after seed).
 */
export async function getDefaultCurrency(): Promise<CurrencyRecord> {
	const currency = await db.currency.findFirst({ where: { isDefault: true } });
	if (!currency) throw new Error('No default currency configured');
	return { ...currency, value: currency.value.toNumber() };
}

/**
 * Updates the value (pesos per unit) for a named currency.
 */
export async function setCurrencyValue(name: string, value: number): Promise<number> {
	const updated = await db.currency.update({ where: { name }, data: { value } });
	return updated.value.toNumber();
}

/**
 * Sets a currency as default in a transaction — unsets all others first.
 */
export async function setCurrencyAsDefault(name: string): Promise<void> {
	await db.$transaction([
		db.currency.updateMany({ data: { isDefault: false } }),
		db.currency.update({ where: { name }, data: { isDefault: true } })
	]);
}

/**
 * Backward-compat shim — used during migration until jus.model.ts callers are updated.
 */
export async function getJusValue(): Promise<number | undefined> {
	const rates = await getCurrencyRates();
	return rates['JUS'];
}
```

---

### Task 3: currency.ts utils + tests (TDD)

**Files:**
- Create: `src/lib/utils/currency.ts`
- Create: `src/lib/utils/currency.test.ts`

**Interfaces:**
- Produces (all exported from `$lib/utils/currency`):
  - `type CurrencyRates = Record<string, number>`
  - `toRatesMap(currencies: { name: string; value: number }[]): CurrencyRates`
  - `toARS(amount: number, rate: number): number`
  - `fromARS(amountARS: number, rate: number): number`
  - `convert(amount: number, fromRate: number, toRate: number): number`
  - `formatAmount(amount: number, currencyName: string): string`
  - `getEquivalents(amount, fromCurrency, rates): Record<string, number>`

- [ ] **Step 1: Write failing tests**

Create `src/lib/utils/currency.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { toRatesMap, toARS, fromARS, convert, formatAmount, getEquivalents } from './currency';

const rates = { JUS: 5000, USD: 1500, EUR: 1650 };

const currencies = [
	{ id: 1, name: 'JUS', value: 5000, isDefault: true },
	{ id: 2, name: 'USD', value: 1500, isDefault: false },
	{ id: 3, name: 'EUR', value: 1650, isDefault: false }
];

describe('toRatesMap', () => {
	it('convierte array a mapa name→value', () => {
		expect(toRatesMap(currencies)).toEqual({ JUS: 5000, USD: 1500, EUR: 1650 });
	});
});

describe('toARS', () => {
	it('100 USD × 1500 = 150000', () => expect(toARS(100, 1500)).toBe(150000));
	it('10 JUS × 5000 = 50000', () => expect(toARS(10, 5000)).toBe(50000));
});

describe('fromARS', () => {
	it('150000 ARS ÷ 1500 = 100 USD', () => expect(fromARS(150000, 1500)).toBe(100));
	it('50000 ARS ÷ 5000 = 10 JUS', () => expect(fromARS(50000, 5000)).toBe(10));
});

describe('convert', () => {
	it('100 USD → JUS: 100×1500÷5000 = 30', () => expect(convert(100, 1500, 5000)).toBe(30));
	it('30 JUS → USD: 30×5000÷1500 = 100', () => expect(convert(30, 5000, 1500)).toBe(100));
});

describe('formatAmount', () => {
	it('JUS: usa coma decimal y sufijo JUS', () => {
		expect(formatAmount(10.5, 'JUS')).toBe('10,500 JUS');
	});
	it('USD: prefijo U$D y formato argentino', () => {
		expect(formatAmount(1000, 'USD')).toMatch(/U\$D/);
	});
	it('EUR: prefijo €', () => {
		expect(formatAmount(850, 'EUR')).toMatch(/€/);
	});
	it('ARS: prefijo $', () => {
		expect(formatAmount(150000, 'ARS')).toMatch(/\$/);
	});
});

describe('getEquivalents', () => {
	it('100 USD → incluye ARS, JUS, EUR', () => {
		const result = getEquivalents(100, 'USD', rates);
		expect(result.ARS).toBe(150000);
		expect(result.JUS).toBeCloseTo(30, 2);
		expect(result.EUR).toBeCloseTo(90.91, 1);
		expect(result.USD).toBeUndefined(); // no se incluye a sí misma
	});
	it('10 JUS → incluye ARS, USD, EUR', () => {
		const result = getEquivalents(10, 'JUS', rates);
		expect(result.ARS).toBe(50000);
		expect(result.USD).toBeCloseTo(33.33, 1);
	});
	it('moneda desconocida → objeto vacío', () => {
		expect(getEquivalents(100, 'BTC', rates)).toEqual({});
	});
});
```

- [ ] **Step 2: Run tests — verify they FAIL**

```bash
pnpm vitest run src/lib/utils/currency.test.ts
```

Expected: FAIL — `currency.ts not found`

- [ ] **Step 3: Create src/lib/utils/currency.ts**

```typescript
// Minimal interface — satisfied by both CurrencyRecord (from currency.model.ts)
// and any Prisma Currency result. No need for a separate CurrencyMeta type.
export type CurrencyRates = Record<string, number>;

const CURRENCY_SYMBOLS: Record<string, string> = {
	JUS: 'JUS',
	USD: 'U$D',
	EUR: '€',
	ARS: '$'
};

/**
 * Derives a { name: rate } map from any array that has name + value.
 * Accepts CurrencyRecord from currency.model.ts or raw Prisma results.
 */
export function toRatesMap(currencies: { name: string; value: number }[]): CurrencyRates {
	return Object.fromEntries(currencies.map((c) => [c.name, c.value]));
}

/**
 * Converts amount in any currency to ARS using pesos-per-unit rate.
 */
export function toARS(amount: number, rate: number): number {
	return amount * rate;
}

/**
 * Converts ARS amount to any currency using pesos-per-unit rate.
 */
export function fromARS(amountARS: number, rate: number): number {
	return amountARS / rate;
}

/**
 * Converts between two currencies using ARS as pivot.
 * convert(100, 1500, 5000) = 100 USD → 150000 ARS → 30 JUS
 */
export function convert(amount: number, fromRate: number, toRate: number): number {
	return toARS(amount, fromRate) / toRate;
}

/**
 * Formats an amount for display with the appropriate symbol.
 * JUS: "10,500 JUS"   USD: "U$D 1.000,00"   EUR: "€ 850,00"   ARS: "$ 150.000,00"
 */
export function formatAmount(amount: number, currencyName: string): string {
	if (currencyName === 'JUS') {
		return `${amount.toFixed(3).replace('.', ',')} JUS`;
	}
	const symbol = CURRENCY_SYMBOLS[currencyName] ?? currencyName;
	const formatted = amount.toLocaleString('es-AR', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
	return `${symbol} ${formatted}`;
}

/**
 * Returns equivalents of `amount` in fromCurrency across all currencies in rates.
 * Always includes ARS. Never includes the source currency in the result.
 * Returns {} if fromCurrency is not in rates.
 */
export function getEquivalents(
	amount: number,
	fromCurrency: string,
	rates: CurrencyRates
): Record<string, number> {
	const fromRate = rates[fromCurrency];
	if (fromRate === undefined) return {};
	const amountARS = toARS(amount, fromRate);
	const result: Record<string, number> = { ARS: amountARS };
	for (const [name, rate] of Object.entries(rates)) {
		if (name !== fromCurrency) {
			result[name] = parseFloat((amountARS / rate).toFixed(4));
		}
	}
	return result;
}
```

- [ ] **Step 4: Run tests — verify they PASS**

```bash
pnpm vitest run src/lib/utils/currency.test.ts
```

Expected: all tests PASS

---

### Task 4: Update Types

**Files:**
- Modify: `src/lib/types/case.types.ts`
- Modify: `src/lib/types/modal.types.ts`

**Interfaces:**
- Consumes: `Currency` from `@prisma/client`
- Produces: updated `FormattedCase`, `CaseWithPayments`, `CreateCaseData`, `ModalContext`

- [ ] **Step 1: Update src/lib/types/case.types.ts**

Replace the entire file with:

```typescript
import type { Cases, Payment, PaymentType, PaymentStatus, typeCase, Currency } from '@prisma/client';

/**
 * Raw Prisma result — includes payments and currency relation.
 * Only used in model layer, never sent to client directly.
 */
export interface CaseWithPayments extends Cases {
	payments: Payment[];
	currency: Currency;
}

/**
 * Payment with amount as number — safe for SvelteKit serialization.
 */
export interface ClientPayment extends Omit<Payment, 'amount'> {
	amount: number | null;
}

/**
 * Currency info serialized for the client (Decimal → number).
 */
export interface ClientCurrency {
	id: number;
	name: string;
	value: number;
	isDefault: boolean;
}

/**
 * Formatted case for the UI — all Decimal fields as number.
 * restAmountPesos is pre-computed server-side (restAmount × currency.value).
 */
export interface FormattedCase
	extends Omit<CaseWithPayments, 'amount' | 'restAmount' | 'payments' | 'currency'> {
	amount: number;
	restAmount: number;
	restAmountPesos: number;
	closed: boolean;
	payments: ClientPayment[];
	currency: ClientCurrency;
	dueDate?: string;
	quantityPaymentsToPay: number;
	searchTerms?: string;
	created?: string;
}

/**
 * Data to create a new case — currencyId links to Currency table.
 */
export interface CreateCaseData {
	description: string;
	type: typeCase;
	clientName: string;
	clientPhone: string;
	userId: number;
	amount: number;
	restAmount: number;
	currencyId: number;
	payments: {
		create: CreatePaymentData[];
	};
}

export interface CreatePaymentData {
	payment_number: number;
	due_date: Date;
	typepayment?: PaymentType;
	collector?: string;
	amount?: number;
	current: boolean;
	payment_date?: Date;
}

export interface NewCaseFormData {
	description: string;
	amount: string;
	clientName: string;
	clientPhone: string;
	quantity_payment: string;
	due_date: string;
	type: string;
	period: string;
	currencyId: string;
	amount_payment?: string;
	typepayment?: string;
	collector?: string;
}

export interface RegisterPaymentData {
	amount: number;
	typepayment: PaymentType;
	paymentNumber: number;
	collector: string;
}

export interface FormattedPayment extends Omit<ClientPayment, 'due_date'> {
	due_date: string;
}
```

- [ ] **Step 2: Update src/lib/types/modal.types.ts**

Replace entire file:

```typescript
import type { FormattedCase } from './case.types';

export interface ModalContext {
	openNewCase: () => void;
	openToPay: (caso: FormattedCase) => void;
	openCurrencies: () => void;
	openDetails: (caso: FormattedCase) => void;
	openConverter: () => void;
}
```

---

### Task 5: Update case.model.ts and page.server.ts mappers

**Files:**
- Modify: `src/lib/case.model.ts`
- Modify: `src/routes/+page.server.ts`
- Modify: `src/routes/[estado]/+page.server.ts`
- Modify: `src/routes/historial/+page.server.ts`

**Interfaces:**
- Consumes: `CaseWithPayments` (now includes `currency: Currency`)
- Produces: queries that include `currency: true`; mappers that output `restAmountPesos` and `currency: ClientCurrency`

- [ ] **Step 1: Update all case queries in case.model.ts to include currency**

In `getCasesWithDebt`:
```typescript
return db.cases.findMany({
	where: { closed: false },
	include: { payments: true, currency: true }
});
```

In `getCases` (historial):
```typescript
return db.cases.findMany({
	where: { closed: true },
	include: { payments: true, currency: true }
});
```

In `createPayment` (the findUnique call):
```typescript
const caso = await db.cases.findUnique({
	where: { id: caseId },
	include: { payments: true, currency: true }
});
```

In `saldarCase`:
```typescript
const caso = await db.cases.findUnique({ where: { id: caseId }, include: { currency: true } });
```

In `closeCase`:
```typescript
const caso = await db.cases.findUnique({
	where: { id: caseId },
	include: { payments: true, currency: true }
});
```

- [ ] **Step 2: Update the FormattedCase mapper helper**

Each `+page.server.ts` file has a mapper function that converts `CaseWithPayments → FormattedCase`. Find the mapper in each file (it maps `amount` and `restAmount` via `.toNumber()`) and add:

```typescript
// Add these two fields to every FormattedCase mapping:
restAmountPesos: caso.restAmount.toNumber() * caso.currency.value.toNumber(),
currency: {
	id: caso.currency.id,
	name: caso.currency.name,
	value: caso.currency.value.toNumber(),
	isDefault: caso.currency.isDefault
},
```

Do this in `src/routes/+page.server.ts`, `src/routes/[estado]/+page.server.ts`, and `src/routes/historial/+page.server.ts`.

---

### Task 6: /api/currencies endpoint

**Files:**
- Create: `src/routes/api/currencies/+server.ts`

**Interfaces:**
- Consumes: `getCurrencies`, `setCurrencyValue` from `$lib/currency.model`
- Produces:
  - `GET /api/currencies` → `CurrencyRecord[]`
  - `POST /api/currencies` → `{ name: string, value: number }` → updated value

- [ ] **Step 1: Create src/routes/api/currencies/+server.ts**

```typescript
import { getCurrencies, setCurrencyValue } from '$lib/currency.model';
import { createErrorResponse } from '$lib/utils/api';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/login');
	try {
		const currencies = await getCurrencies();
		return new Response(JSON.stringify(currencies), { status: 200 });
	} catch (error) {
		console.error('Error fetching currencies:', error);
		return createErrorResponse('Error al obtener monedas', 500);
	}
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) throw redirect(302, '/login');

	const data = (await request.json()) as Record<string, string>;
	const { name, value } = data;

	if (!name || !value) {
		return createErrorResponse('Faltan datos: name y value requeridos', 400);
	}

	const numericValue = Number(value.toString().replaceAll('.', ''));
	if (isNaN(numericValue) || numericValue <= 0) {
		return createErrorResponse('Valor inválido', 400);
	}

	try {
		const updated = await setCurrencyValue(name, numericValue);
		return new Response(JSON.stringify({ value: updated }), { status: 200 });
	} catch (error) {
		console.error('Error updating currency:', error);
		return createErrorResponse('Error al actualizar moneda', 500);
	}
};
```

---

### Task 7: Backend route updates + cleanup

**Files:**
- Modify: `src/routes/+layout.server.ts`
- Modify: `src/routes/api/newCase/+server.ts`
- Modify: `src/routes/api/newPayment/+server.ts`
- Delete: `src/routes/api/jusValue/+server.ts`
- Delete: `src/lib/jus.model.ts`

**Interfaces:**
- Consumes: `getCurrencies`, `getDefaultCurrency` from `$lib/currency.model`
- Produces: layout returns `currencies: CurrencyRecord[]`; newCase accepts `currencyId`; newPayment is currency-agnostic

- [ ] **Step 1: Update src/routes/+layout.server.ts**

```typescript
import { getCurrencies } from '$lib/currency.model';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const user = locals.user;
	try {
		const currencies = await getCurrencies();
		return { user, currencies };
	} catch (error) {
		console.error('Error fetching currencies:', error);
		return { user, currencies: [] };
	}
};
```

- [ ] **Step 2: Update src/routes/api/newCase/+server.ts**

Replace the import of `getJusValue` with `getDefaultCurrency`:

```typescript
import { getDefaultCurrency } from '$lib/currency.model';
```

Update the Zod schema — add `currencyId`, remove nothing else:

```typescript
const NewCaseSchema = z.object({
	description: z.string().min(1),
	amount: z.string().min(1),
	clientName: z.string().min(1),
	clientPhone: z.string().min(1),
	quantity_payment: z.string().min(1),
	due_date: z.string().min(1),
	type: z.string().min(1),
	period: z.enum(['SEMANAL', 'QUINCENAL', 'MENSUAL']),
	currencyId: z.coerce.number().int().positive().optional(),
	amount_payment: z.string().optional(),
	typepayment: z.string().optional(),
	collector: z.string().optional()
});
```

Replace the handler's currency resolution (replaces `getJusValue` call):

```typescript
// Resolve currency — use provided currencyId or fall back to default
let resolvedCurrencyId: number;
if (rawData.currencyId) {
	resolvedCurrencyId = Number(rawData.currencyId);
} else {
	const defaultCurrency = await getDefaultCurrency();
	resolvedCurrencyId = defaultCurrency.id;
}
```

Update `buildCaseData` signature — remove `jusValue`, add `currencyId`:

```typescript
function buildCaseData(data: NewCaseFormData, userId: number, currencyId: number) {
	const { description, amount, clientName, clientPhone, quantity_payment,
		amount_payment, due_date, typepayment, collector, type, period } = data;

	// amount is already in native currency (JUS, USD, or EUR)
	const amountNative = parseFloat(amount.replace(',', '.'));
	const amountPaymentNative = amount_payment
		? parseFloat(amount_payment.replaceAll('.', ''))
		: undefined;

	const payments = buildPayments(
		parseInt(quantity_payment, 10),
		due_date,
		period,
		typepayment,
		collector,
		amountPaymentNative
	);

	// restAmount is in native currency — direct subtraction, no rate conversion
	const restAmount = amountPaymentNative
		? parseFloat((amountNative - amountPaymentNative).toFixed(3))
		: amountNative;

	return {
		description,
		type: type as typeCase,
		clientName,
		clientPhone,
		userId,
		currencyId,
		payments: { create: payments },
		amount: amountNative,
		restAmount
	};
}
```

Update `buildPayments` — remove `jusValue` param, store payment amount directly in native currency:

```typescript
function buildPayments(
	quantity: number,
	startDate: string,
	period: string,
	typepayment?: string,
	collector?: string,
	amountPayment?: number
): CreatePaymentData[] {
	return Array.from({ length: quantity }, (_, i) => {
		const dueDate = calculateDueDate(startDate, period, i);
		const isFirstPayment = i === 0;
		const hasInitialPayment = Boolean(amountPayment);
		return {
			payment_number: i + 1,
			due_date: dueDate,
			typepayment: typepayment && isFirstPayment ? (typepayment as PaymentType) : undefined,
			collector: collector && isFirstPayment ? collector : undefined,
			// amount already in native currency — no conversion needed
			amount: amountPayment && isFirstPayment
				? parseFloat(amountPayment.toFixed(3))
				: undefined,
			current: (isFirstPayment && !hasInitialPayment) || (i === 1 && hasInitialPayment),
			payment_date: isFirstPayment && hasInitialPayment ? dueDate : undefined
		};
	});
}
```

Update the handler call to `buildCaseData`:

```typescript
const caso = buildCaseData(data, user.id, resolvedCurrencyId);
```

- [ ] **Step 3: Update src/routes/api/newPayment/+server.ts**

Remove `getJusValue` import and call. Payment amount now arrives in native currency from ModalToPay — no conversion needed:

```typescript
import { createPayment } from '$lib/case.model';
import { createErrorResponse } from '$lib/utils/api';
import type { PaymentType } from '@prisma/client';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z, ZodError } from 'zod';

const PaymentSchema = z.object({
	caseId: z.string().min(1),
	amount: z.string().min(1),
	typepayment: z.string().min(1),
	paymentNumber: z.string().min(1),
	collector: z.string().min(1)
});

export const POST: RequestHandler = async ({ locals, request }) => {
	const user = locals.user;
	if (!user) throw redirect(302, '/login');

	const rawData = await request.json();

	let data: z.infer<typeof PaymentSchema>;
	try {
		data = PaymentSchema.parse(rawData);
	} catch (error) {
		if (error instanceof ZodError) {
			return createErrorResponse(error.errors[0]?.message ?? 'Datos inválidos', 400);
		}
		return createErrorResponse('Datos inválidos', 400);
	}

	const { caseId, amount, typepayment, paymentNumber, collector } = data;

	try {
		// amount arrives in native currency from ModalToPay — parse directly
		const amountNative = parseFloat(amount.replace(',', '.'));
		const response = await createPayment(parseInt(caseId, 10), {
			amount: parseFloat(amountNative.toFixed(3)),
			typepayment: typepayment as PaymentType,
			paymentNumber: parseInt(paymentNumber, 10),
			collector
		});
		return new Response(JSON.stringify({ response }), { status: 200 });
	} catch (error) {
		console.error('Error creating payment:', error);
		return createErrorResponse('Error al registrar pago', 500);
	}
};
```

- [ ] **Step 4: Delete obsolete files**

```bash
rm src/routes/api/jusValue/+server.ts
rm src/lib/jus.model.ts
```

- [ ] **Step 5: Run type check**

```bash
pnpm check
```

Expected: zero errors. If there are errors referencing `jus_value` or `jus.model`, find the callers and update them to use `currencies` from `page.data` instead.

---

### Task 8: ModalCurrencies.svelte

**Files:**
- Create: `src/lib/components/ModalCurrencies.svelte`

**Interfaces:**
- Consumes: `page.data.currencies: CurrencyRecord[]`, `addThousandSeparator` from `$lib/utils/formatters`
- Produces: modal to update any currency's value via `POST /api/currencies`

- [ ] **Step 1: Create src/lib/components/ModalCurrencies.svelte**

```svelte
<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { addThousandSeparator } from '$lib/utils/formatters';
	import { X } from '@lucide/svelte';
	import type { CurrencyRecord } from '$lib/currency.model';

	let { dialog = $bindable<HTMLDialogElement | undefined>() }: { dialog?: HTMLDialogElement } =
		$props();

	let loading = $state(false);
	let response_state = $state<number | undefined>();
	let editingName = $state<string | null>(null);
	let editValue = $state('');

	const currencies: CurrencyRecord[] = $derived(page.data.currencies ?? []);

	function addThousandSep(value: string): string {
		const numeric = value.replace(/\./g, '');
		if (isNaN(+numeric)) return value;
		return addThousandSeparator(+numeric);
	}

	function startEdit(currency: CurrencyRecord) {
		editingName = currency.name;
		editValue = addThousandSeparator(currency.value);
	}

	async function saveValue() {
		if (!editingName) return;
		loading = true;
		try {
			const response = await fetch('/api/currencies', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: editingName, value: editValue })
			});
			response_state = response.status;
			if (response.status === 200) {
				editingName = null;
				editValue = '';
				await invalidateAll();
			}
		} catch {
			response_state = 500;
		} finally {
			loading = false;
		}
	}

	function onValueInput(event: Event) {
		const input = event.target as HTMLInputElement;
		const raw = input.value.replace(/\./g, '');
		if (isNaN(+raw)) { input.value = input.value.slice(0, -1); return; }
		editValue = addThousandSep(raw);
		input.value = editValue;
	}

	function handleClose() {
		dialog?.close();
		response_state = undefined;
		editingName = null;
		editValue = '';
		loading = false;
	}
</script>

<dialog bind:this={dialog}>
	<div class="modal-panel modal-panel-sm">
		<div class="modal-header">
			<h2 class="modal-title">Monedas</h2>
			<button class="modal-icon-btn" onclick={handleClose} aria-label="Cerrar">
				<X size={18} />
			</button>
		</div>

		{#if loading}
			<div class="spinner-wrap"><div class="er-spinner"></div></div>
		{:else}
			<div class="form-section">
				{#each currencies as currency (currency.name)}
					<div class="label" style="margin-bottom: 0.75rem;">
						<span>
							{currency.name}
							{#if currency.isDefault}<span style="font-size: 0.75rem; opacity: 0.6;">(defecto)</span>{/if}
						</span>
						{#if editingName === currency.name}
							<div style="display: flex; gap: 0.5rem;">
								<input
									class="input"
									type="text"
									value={editValue}
									oninput={onValueInput}
									placeholder="Valor en pesos"
								/>
								<button class="btn btn-success btn-sm" onclick={saveValue}>✓</button>
								<button class="btn btn-ghost btn-sm" onclick={() => (editingName = null)}>✕</button>
							</div>
						{:else}
							<div style="display: flex; justify-content: space-between; align-items: center;">
								<span class="input" style="background: transparent; cursor: default;">
									$ {addThousandSeparator(currency.value)}
								</span>
								<button class="btn btn-ghost btn-sm" onclick={() => startEdit(currency)}>
									Editar
								</button>
							</div>
						{/if}
					</div>
				{/each}

				{#if response_state && response_state !== 200}
					<p class="text-error" style="margin-top: 0.5rem;">Error al guardar. Intente nuevamente.</p>
				{/if}
			</div>

			<div style="display: flex; justify-content: flex-end; margin-top: 1rem;">
				<button class="btn btn-ghost" onclick={handleClose}>Cerrar</button>
			</div>
		{/if}
	</div>
</dialog>
```

---

### Task 9: ModalConverter.svelte

**Files:**
- Create: `src/lib/components/ModalConverter.svelte`

**Interfaces:**
- Consumes: `page.data.currencies: CurrencyRecord[]`, `toRatesMap`, `formatAmount` from `$lib/utils/currency`
- Produces: read-only cross-conversion table modal

- [ ] **Step 1: Create src/lib/components/ModalConverter.svelte**

```svelte
<script lang="ts">
	import { page } from '$app/state';
	import { toRatesMap, formatAmount, toARS } from '$lib/utils/currency';
	import { X } from '@lucide/svelte';
	import type { CurrencyRecord } from '$lib/currency.model';

	let { dialog = $bindable<HTMLDialogElement | undefined>() }: { dialog?: HTMLDialogElement } =
		$props();

	const currencies: CurrencyRecord[] = $derived(page.data.currencies ?? []);
	const rates = $derived(toRatesMap(currencies));

	// Build cross-conversion table: for each unit of each currency, show equivalents
	const rows = $derived(
		currencies.map((c) => {
			const amountARS = toARS(1, c.value);
			return {
				name: c.name,
				equivalents: currencies
					.filter((other) => other.name !== c.name)
					.map((other) => ({
						name: other.name,
						value: amountARS / other.value,
						formatted: formatAmount(amountARS / other.value, other.name)
					}))
					.concat([{ name: 'ARS', value: amountARS, formatted: formatAmount(amountARS, 'ARS') }])
			};
		})
	);

	function handleClose() {
		dialog?.close();
	}
</script>

<dialog bind:this={dialog}>
	<div class="modal-panel modal-panel-sm">
		<div class="modal-header">
			<h2 class="modal-title">Conversiones</h2>
			<button class="modal-icon-btn" onclick={handleClose} aria-label="Cerrar">
				<X size={18} />
			</button>
		</div>

		<div class="form-section">
			{#each rows as row (row.name)}
				<div style="margin-bottom: 1rem;">
					<p style="font-weight: 600; margin-bottom: 0.25rem;">1 {row.name} =</p>
					<ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.2rem;">
						{#each row.equivalents as eq}
							<li style="display: flex; justify-content: space-between; font-size: 0.9rem; opacity: 0.85;">
								<span>{eq.name}</span>
								<span>{eq.formatted}</span>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>

		<div style="display: flex; justify-content: flex-end; margin-top: 0.5rem;">
			<button class="btn btn-ghost" onclick={handleClose}>Cerrar</button>
		</div>
	</div>
</dialog>
```

---

### Task 10: ModalForm.svelte — currency selector + live converter

**Files:**
- Modify: `src/lib/components/ModalForm.svelte`

**Interfaces:**
- Consumes: `page.data.currencies: CurrencyRecord[]`, `toRatesMap`, `toARS`, `formatAmount` from `$lib/utils/currency`; `getContext('modals').openConverter`
- Produces: sends `currencyId` to `/api/newCase`; amount in native currency

- [ ] **Step 1: Update ModalForm.svelte script block**

Replace the imports and reactive state at the top of the `<script>` block:

```typescript
import { page } from '$app/state';
import { getContext } from 'svelte';
import { modalSchema } from '$lib/components/modalSchema';
import { typeCases } from '$lib/utils/casesTypes';
import { PaymentType, Timing } from '$lib/utils/paymentsTypes';
import { differenceInHours } from 'date-fns';
import { fade } from 'svelte/transition';
import { addThousandSeparator } from '$lib/utils/formatters';
import { validateOrThrow, manageFormError } from '$lib/utils/form';
import { toARS, toRatesMap, formatAmount } from '$lib/utils/currency';
import { X, ArrowLeftRight } from '@lucide/svelte';
import type { ModalContext } from '$lib/types/modal.types';
import type { CurrencyRecord } from '$lib/currency.model';

let { dialog = $bindable<HTMLDialogElement | undefined>() }: { dialog?: HTMLDialogElement } =
	$props();

const { openConverter } = getContext<ModalContext>('modals');

let loading = $state(false);
let input_native = $state<HTMLInputElement | undefined>(); // was input_JUS
let input_pesos = $state<HTMLInputElement | undefined>();  // was input_PESOS
let input_quantity_payment = $state<HTMLInputElement | undefined>();
let amount_payment = $state('');
let case_form = $state<HTMLFormElement | undefined>();
let response_state = $state<number | undefined>();
let due_date = $state<Date | undefined>();
let isToday = $state(false);
let formErrors = $state<{ errors: Record<string, string | undefined | string[]> } | undefined>();

const user = page.data.user;
const currencies: CurrencyRecord[] = $derived(page.data.currencies ?? []);
const rates = $derived(toRatesMap(currencies));

// Selected currency — default to the isDefault one
let selectedCurrencyId = $state<number>(
	currencies.find((c) => c.isDefault)?.id ?? currencies[0]?.id ?? 1
);
const selectedCurrency = $derived(
	currencies.find((c) => c.id === selectedCurrencyId) ?? currencies[0]
);
```

- [ ] **Step 2: Update onInputTransform in ModalForm.svelte**

Replace `onInputTransform` function:

```typescript
function onInputTransform(event: Event) {
	const input = event.target as HTMLInputElement;
	const lastChar = input.value.slice(-1);
	if (lastChar === '.') { input.value = input.value.slice(0, -1); return; }
	if (input === input_native) {
		if (lastChar && !/[\d,]/.test(lastChar)) { input.value = input.value.slice(0, -1); return; }
		if (lastChar === ',' && (input.value.match(/,/g) || []).length > 1) { input.value = input.value.slice(0, -1); return; }
	} else if (input === input_pesos) {
		if (lastChar && !/\d/.test(lastChar)) { input.value = input.value.slice(0, -1); return; }
	}
	const cleanValue = input.value.replace(/\./g, '').replace(',', '.');
	const numericValue = +cleanValue;
	if (cleanValue && isNaN(numericValue)) { input.value = input.value.slice(0, -1); return; }
	if (!cleanValue) { input_native!.value = ''; input_pesos!.value = ''; return; }
	if (!selectedCurrency) return;
	if (input === input_native) {
		// native → show ARS equivalent
		input_pesos!.value = addThousandSeparator(Math.round(toARS(numericValue, selectedCurrency.value)));
	} else if (input === input_pesos) {
		input_pesos!.value = addThousandSeparator(numericValue);
		// pesos → show native equivalent
		const nativeVal = numericValue / selectedCurrency.value;
		input_native!.value = selectedCurrency.name === 'JUS'
			? nativeVal.toFixed(3).replace('.', ',')
			: nativeVal.toFixed(2).replace('.', ',');
	}
}
```

- [ ] **Step 3: Update calculatePayment in ModalForm.svelte**

```typescript
function calculatePayment() {
	// amount_payment is in native currency
	const nativeAmount = input_native!.value.replace(',', '.').replace(/\./g, '');
	const quantity = +input_quantity_payment!.value;
	if (!quantity || !nativeAmount) { amount_payment = ''; return; }
	const perPayment = +nativeAmount / quantity;
	amount_payment = selectedCurrency?.name === 'JUS'
		? perPayment.toFixed(3).replace('.', ',')
		: addThousandSeparator(Math.round(perPayment));
}
```

- [ ] **Step 4: Update ModalForm.svelte template**

In the modal header div, add the converter icon button after the title:

```svelte
<div class="modal-header">
	<h2 class="modal-title">Nuevo caso</h2>
	<div style="display: flex; gap: 0.5rem; align-items: center;">
		<button class="modal-icon-btn" onclick={(e) => { e.preventDefault(); openConverter(); }} aria-label="Ver conversiones">
			<ArrowLeftRight size={16} />
		</button>
		<button class="modal-icon-btn" onclick={handleClose} aria-label="Cerrar"><X size={18} /></button>
	</div>
</div>
```

In the form, add currency selector as first field in `form-grid`:

```svelte
<div class="label" style="grid-column: 1 / -1;">
	<span>Moneda del caso</span>
	<div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
		{#each currencies as currency (currency.id)}
			<button
				type="button"
				class="btn btn-sm {selectedCurrencyId === currency.id ? 'btn-primary' : 'btn-ghost'}"
				onclick={() => { selectedCurrencyId = currency.id; input_native!.value = ''; input_pesos!.value = ''; amount_payment = ''; }}
			>
				{currency.name}
			</button>
		{/each}
	</div>
	<input type="hidden" name="currencyId" value={selectedCurrencyId} />
</div>
```

Replace the "Cantidad JUS" label:

```svelte
<div class="label">
	<span>{selectedCurrency?.name ?? 'Monto'}</span>
	<input autocomplete="off" class="input" bind:this={input_native} oninput={onInputTransform} type="text" placeholder={selectedCurrency?.name ?? 'Monto'} name="amount" />
	{#if formErrors?.errors?.['amount']}<span class="text-error">{formErrors.errors['amount']}</span>{/if}
</div>
<div class="label">
	<span>Equivalente en pesos</span>
	<input autocomplete="off" class="input" type="text" bind:this={input_pesos} oninput={(e) => { onInputTransform(e); calculatePayment(); }} placeholder="$ PESOS" />
</div>
```

In the conditional payment section (amount_payment input), update placeholder:

```svelte
<input autocomplete="off" class="input" type="text" bind:value={amount_payment} oninput={verifyPayment} placeholder="Monto ({selectedCurrency?.name})" name="amount_payment" />
```

---

### Task 11: ModalToPay.svelte — currency-aware

**Files:**
- Modify: `src/lib/components/ModalToPay.svelte`

**Interfaces:**
- Consumes: `caso.currency: ClientCurrency`, `toARS`, `formatAmount` from `$lib/utils/currency`
- Produces: amount input in native currency; ARS shown informatively; sends native amount to `/api/newPayment`

- [ ] **Step 1: Update ModalToPay.svelte imports**

Add to imports:

```typescript
import { toARS, formatAmount } from '$lib/utils/currency';
```

Remove `jus_value` from page.data destructuring. Replace:

```typescript
const { jus_value, user } = page.data;
```

With:

```typescript
const { user } = page.data;
```

- [ ] **Step 2: Update calculatePayment (the $effect)**

Rename `input_JUS` → `input_native` and update the calculation. The locked amount for last payment is `caso.restAmount` (in native currency — no conversion needed):

```typescript
$effect(() => {
	if (caso && input_native && input_pesos) {
		// Last payment: lock to restAmount in native currency
		input_native!.value = caso.restAmount.toFixed(3).replace(/\./, ',');
		input_pesos!.value = addThousandSeparator(
			Math.round(toARS(caso.restAmount, caso.currency.value))
		);
	}
});
```

- [ ] **Step 3: Update onInputTransform in ModalToPay.svelte**

Replace with currency-aware version:

```typescript
function onInputTransform(event: Event) {
	if (!caso) return;
	const input = event.target as HTMLInputElement;
	const { currency } = caso;

	if (input === input_pesos) {
		input.value = addThousandSeparator(+input.value.replace(/\./g, ''));
	}

	const value = input === input_pesos
		? +input.value.replace(/\./g, '')
		: +input.value.replace(/,/g, '.');

	if (isNaN(value)) { input.value = input.value.slice(0, -1); return; }

	if (caso.quantityPaymentsToPay === 1) {
		// Lock to restAmount
		input_native!.value = caso.restAmount.toFixed(3).replace(/\./, ',');
		input_pesos!.value = addThousandSeparator(Math.round(toARS(caso.restAmount, currency.value)));
		return;
	}

	if (input === input_pesos) {
		const nativeVal = value / currency.value;
		if (nativeVal > caso.restAmount) {
			input_native!.value = caso.restAmount.toFixed(3).replace(/\./, ',');
			input_pesos!.value = addThousandSeparator(Math.round(toARS(caso.restAmount, currency.value)));
		} else {
			input_native!.value = nativeVal.toFixed(3).replace(/\./, ',');
		}
	} else if (input === input_native) {
		const capped = Math.min(value, caso.restAmount);
		input_native!.value = capped.toFixed(3).replace(/\./, ',');
		input_pesos!.value = addThousandSeparator(Math.round(toARS(capped, currency.value)));
	}
}
```

- [ ] **Step 4: Update ModalToPay.svelte template**

Rename `input_JUS` binding to `input_native` in the template. Update the label from "JUS" to the case's currency:

```svelte
<!-- bind:this references -->
bind:this={input_native}   <!-- was input_JUS -->

<!-- Label for native input -->
<span>{caso?.currency.name ?? 'Monto'}</span>
```

Change the hidden input that sends the amount — it now sends native currency amount:

```svelte
<input type="hidden" name="amount" value={input_native?.value} />
```

Add ARS informative display below the inputs:

```svelte
{#if caso?.currency.name !== 'ARS'}
	<p style="font-size: 0.8rem; opacity: 0.6; margin-top: 0.25rem;">
		≈ {input_pesos?.value} pesos
	</p>
{/if}
```

---

### Task 12: Layout wiring + display pages

**Files:**
- Modify: `src/routes/+layout.svelte`
- Modify: `src/lib/components/CasesContainer.svelte`
- Modify: `src/routes/+page.svelte`
- Modify: `src/routes/[estado]/+page.svelte`
- Modify: `src/routes/historial/+page.svelte`

**Interfaces:**
- Consumes: `ModalCurrencies`, `ModalConverter`; `formatAmount` from `$lib/utils/currency`; `FormattedCase.currency` + `FormattedCase.restAmountPesos`
- Produces: working multi-currency UI end to end

- [ ] **Step 1: Update src/routes/+layout.svelte**

Replace `ModalJus` import with new modals:

```typescript
import ModalCurrencies from '$lib/components/ModalCurrencies.svelte';
import ModalConverter from '$lib/components/ModalConverter.svelte';
```

Add state variables for new dialogs:

```typescript
let currenciesDialog = $state<HTMLDialogElement | undefined>();
let converterDialog = $state<HTMLDialogElement | undefined>();
```

Remove `jusDialog`. Update `setContext`:

```typescript
setContext<ModalContext>('modals', {
	openNewCase: () => formDialog?.showModal(),
	openToPay: (caso: FormattedCase) => { activeCaso = caso; toPayDialog?.showModal(); },
	openCurrencies: () => currenciesDialog?.showModal(),
	openDetails: (caso: FormattedCase) => { activeCaso = caso; detailsDialog?.showModal(); },
	openConverter: () => converterDialog?.showModal()
});
```

Replace `<ModalJus bind:dialog={jusDialog} />` with:

```svelte
<ModalCurrencies bind:dialog={currenciesDialog} />
<ModalConverter bind:dialog={converterDialog} />
```

- [ ] **Step 2: Update BurgerBar to call openCurrencies instead of openJus**

Find where `openJus` is called in `BurgerBar.svelte` and change to `openCurrencies`.

- [ ] **Step 3: Update CasesContainer.svelte**

Add import:

```typescript
import { formatAmount } from '$lib/utils/currency';
```

In the display of each case's amount, replace the JUS-hardcoded display with:

```svelte
<!-- Instead of: {caso.restAmount.toFixed(3)} JUS -->
{formatAmount(caso.restAmount, caso.currency.name)}
```

For the ARS equivalent (pre-computed):

```svelte
<!-- Instead of: {addThousandSeparator(Math.round(caso.restAmount * jus_value))} pesos -->
$ {addThousandSeparator(Math.round(caso.restAmountPesos))}
```

Remove any reference to `jus_value` from `page.data` in this component.

- [ ] **Step 4: Update display pages**

In `src/routes/+page.svelte`, `src/routes/[estado]/+page.svelte`, and `src/routes/historial/+page.svelte`:

Replace any hardcoded "JUS" labels or `jus_value` calculations with `formatAmount` calls and `restAmountPesos` from the case object.

- [ ] **Step 5: Run type check**

```bash
pnpm check
```

Expected: zero errors.

- [ ] **Step 6: Run all tests**

```bash
pnpm test
```

Expected: all tests pass including `currency.test.ts`.

- [ ] **Step 7: Start dev server and smoke test**

```bash
pnpm dev
```

Verify manually:
- Home page loads without errors
- Open "Nuevo Caso" modal → currency selector shows JUS / USD / EUR
- Select USD → amount label changes, pesos equivalent updates on input
- Converter icon opens ModalConverter with cross-rates table
- Burger menu → Monedas opens ModalCurrencies with all three currencies editable
- Create a USD case → appears in case list with USD amount
- Register payment on USD case → amount in USD, ARS shown informatively

- [ ] **Step 8: Single commit for the entire feature**

```bash
git add -p
git commit -m "$(cat <<'EOF'
feat: add multi-currency support (JUS, USD, EUR)

Cases now store amounts in native currency via currencyId FK.
All conversion logic centralized in currency.ts utils.
Server mapper pre-computes restAmountPesos for display.
New modals: ModalCurrencies (manage rates), ModalConverter (cross-rates view).
ModalForm gets currency selector; ModalToPay is currency-aware.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```
