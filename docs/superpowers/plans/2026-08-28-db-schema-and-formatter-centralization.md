# DB Schema Improvements + Formatter Centralization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate monetary columns from Float to Decimal(12,4), add PaymentStatus tracking, caseNumber field, due_date index, and centralize Argentine-locale number formatting across the entire app.

**Architecture:** All four schema changes land in a single Prisma migration. The `Prisma.Decimal` type is never sent to the client — it gets converted to `number` at the server/client boundary in each `+page.server.ts` mapper. A new `formatJUS()` utility replaces every `toString().replace(/\./, ',')` call. Repeated scroll-back-to-top logic is extracted into a `BackToTop` component. The `[estado]` page table triplicated across three `{#if}` blocks becomes one.

**Tech Stack:** Prisma 6 + MySQL, SvelteKit 2, Svelte 5 runes, TypeScript strict, Vitest, Tailwind v4

## Global Constraints

- Branch: `Upgrade`
- Node >= 20.19.0 (full ICU included — `Intl.NumberFormat('es-AR')` is safe)
- pnpm as package manager
- Single commit at end of plan (per repo convention)
- No changes to business logic (cuota calculation, payment registration flow)
- Do NOT run any destructive SQL — backfill only adds/updates data, never deletes

---

## ⚠️ PREREQUISITE — Backup production database before ANY migration step

```bash
mysqldump -u <user> -p <database_name> > backup_$(date +%Y%m%d_%H%M%S).sql
```

Verify the dump file is non-zero and store it somewhere safe before proceeding.

---

## File Map

| File                                       | Action                  | Reason                                                                                                      |
| ------------------------------------------ | ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| `prisma/schema.prisma`                     | Modify                  | Float → Decimal(12,4), add PaymentStatus enum, caseNumber, due_date index                                   |
| `prisma/migrations/…/migration.sql`        | Modify after generation | Append PaymentStatus backfill UPDATE statements                                                             |
| `src/lib/types/case.types.ts`              | Modify                  | Add `ClientPayment`, update `FormattedCase` to use `number` not `Prisma.Decimal`, update `FormattedPayment` |
| `src/lib/case.model.ts`                    | Modify                  | Fix restAmount arithmetic for Decimal; set `status: 'PAGADA'` when registering payment                      |
| `src/routes/+page.server.ts`               | Modify                  | Mapper converts `amount`/`restAmount`/`payments.amount` Decimal → number                                    |
| `src/routes/[estado]/+page.server.ts`      | Modify                  | Same mapper conversion                                                                                      |
| `src/routes/historial/+page.server.ts`     | Modify                  | Same mapper conversion                                                                                      |
| `src/lib/utils/formatters.ts`              | Modify                  | Add `formatJUS()` and `formatNumber()` using `Intl.NumberFormat('es-AR')`                                   |
| `src/lib/utils/formatters.test.ts`         | Create                  | Tests for the new formatter functions                                                                       |
| `src/lib/components/CasesContainer.svelte` | Modify                  | Use `formatJUS()`                                                                                           |
| `src/routes/[estado]/+page.svelte`         | Modify                  | Use `formatJUS()`, deduplicate three table blocks → one                                                     |
| `src/lib/components/ModalDetalles.svelte`  | Modify                  | Use `ClientPayment` type, use `formatJUS()`                                                                 |
| `src/routes/historial/+page.svelte`        | Modify                  | Use `formatJUS()`, use `BackToTop`                                                                          |
| `src/lib/components/BackToTop.svelte`      | Create                  | Extracted scroll-back-to-top, fixes off-center positioning bug                                              |

---

## Task 1: Prisma schema changes

**Files:**

- Modify: `prisma/schema.prisma`

**Interfaces:**

- Produces: Prisma client with `Decimal` types for all monetary fields, `PaymentStatus` enum, `Payment.status`, `Cases.caseNumber`, index on `Payment.due_date`

- [ ] **Step 1: Update schema.prisma**

Replace the entire file with the following (only the changed sections shown — keep User model and Role/typeCase/PaymentType enums unchanged):

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id       Int      @id @default(autoincrement())
  name     String   @unique
  password String
  role     Role     @default(USER)
  cases    Cases[]
}

model Cases {
  id          Int       @id @default(autoincrement())
  description String
  createdAt   DateTime  @default(now())
  updatedAt   DateTime? @updatedAt
  userId      Int
  user        User      @relation(fields: [userId], references: [id])
  clientName  String
  clientPhone String
  amount      Decimal   @db.Decimal(12, 4)
  restAmount  Decimal   @db.Decimal(12, 4)
  payments    Payment[]
  type        typeCase
  caseNumber  String?   @unique @db.VarChar(50)

  @@index([userId])
  @@index([restAmount])
}

model Payment {
  payment_number Int
  due_date       DateTime
  payment_date   DateTime?
  caseId         Int
  case           Cases         @relation(fields: [caseId], references: [id])
  typepayment    PaymentType?
  amount         Decimal?      @db.Decimal(12, 4)
  current        Boolean
  collector      String?
  status         PaymentStatus @default(PENDIENTE)

  @@id([payment_number, caseId])
  @@index([caseId, current])
  @@index([due_date])
}

model Currency {
  id    Int     @id @default(autoincrement())
  name  String  @unique
  value Decimal @db.Decimal(12, 4)
}

enum Role {
  ADMIN
  USER
}

enum typeCase {
  CIVIL
  PENAL
  LABORAL
  FAMILIAR
  OTRO
}

enum PaymentType {
  EFECTIVO
  TRANSFERENCIA
  CHEQUE
  TARJETA
  DEBITO
  MERCADOPAGO
  DEPOSITO
}

enum PaymentStatus {
  PENDIENTE
  PAGADA
  VENCIDA
}
```

- [ ] **Step 2: Generate the migration (dev only — NOT production yet)**

```bash
cd C:/Users/frbra/Desktop/Proyectos/Svelte/estudio_ricardo_project
pnpm prisma migrate dev --name decimal_and_schema_improvements
```

Expected: Prisma creates `prisma/migrations/<timestamp>_decimal_and_schema_improvements/migration.sql` and applies it to your local dev DB. The Prisma client is regenerated automatically.

If Prisma asks "Is this migration safe?" — answer yes. No data is deleted.

- [ ] **Step 3: Open the generated migration.sql and append PaymentStatus backfill**

Find the file at `prisma/migrations/<timestamp>_decimal_and_schema_improvements/migration.sql`. At the **end** of the file, append these lines:

```sql
-- Backfill PaymentStatus for existing data
UPDATE `Payment` SET `status` = 'PAGADA' WHERE `payment_date` IS NOT NULL;
UPDATE `Payment` SET `status` = 'VENCIDA'
  WHERE `payment_date` IS NULL AND `due_date` < NOW();
```

The first UPDATE marks all payments that have a `payment_date` (already collected) as PAGADA.
The second UPDATE marks overdue unpaid payments (past due_date, no payment_date) as VENCIDA.
Remaining rows keep the DEFAULT 'PENDIENTE'.

**For production:** Run `pnpm prisma migrate deploy` AFTER verifying the migration on your dev DB and confirming the backup from the prerequisite step exists.

- [ ] **Step 4: Verify Prisma client was regenerated**

```bash
pnpm prisma generate
```

Expected: "Generated Prisma Client" with no errors. Check `node_modules/.prisma/client/index.d.ts` — `Cases.amount` should now be typed as `Prisma.Decimal`, not `number`.

---

## Task 2: TypeScript DTO types

**Files:**

- Modify: `src/lib/types/case.types.ts`

**Interfaces:**

- Consumes: Prisma types after Task 1 regeneration — `Cases.amount: Prisma.Decimal`, `Payment.amount: Prisma.Decimal | null`
- Produces: `ClientPayment` interface (all amounts as `number | null`), updated `FormattedCase` that uses `number` for monetary fields — safe to serialize across server/client boundary

**Why this matters:** SvelteKit uses `devalue` to serialize `+page.server.ts` return values. `Prisma.Decimal` is a class instance (`Decimal.js`) and does NOT serialize correctly — it arrives at the client as a plain object, losing all methods. Every mapper in `+page.server.ts` must convert Decimal → number before returning.

- [ ] **Step 1: Update case.types.ts**

Replace the entire file:

```typescript
/**
 * Tipos centralizados para Cases
 */

import type { Cases, Payment, PaymentType, PaymentStatus, typeCase } from '@prisma/client';

/**
 * Caso con sus pagos incluidos (resultado directo de Prisma — contiene Prisma.Decimal)
 * Solo usar en model layer, NO enviar al cliente directamente.
 */
export interface CaseWithPayments extends Cases {
	payments: Payment[];
}

/**
 * Pago con amount convertido a number — seguro para enviar al cliente via SvelteKit
 */
export interface ClientPayment extends Omit<Payment, 'amount'> {
	amount: number | null;
}

/**
 * Caso formateado para la UI — todos los campos monetarios como number.
 * Este tipo es el que viaja de +page.server.ts al componente.
 */
export interface FormattedCase extends Omit<
	CaseWithPayments,
	'amount' | 'restAmount' | 'payments'
> {
	amount: number;
	restAmount: number;
	payments: ClientPayment[];
	dueDate?: string;
	quantityPaymentsToPay: number;
	searchTerms?: string;
	created?: string;
}

/**
 * Datos para crear un nuevo caso
 */
export interface CreateCaseData {
	description: string;
	type: typeCase;
	clientName: string;
	clientPhone: string;
	userId: number;
	amount: number;
	restAmount: number;
	payments: {
		create: CreatePaymentData[];
	};
}

/**
 * Datos para crear un nuevo pago
 */
export interface CreatePaymentData {
	payment_number: number;
	due_date: Date;
	typepayment?: PaymentType;
	collector?: string;
	amount?: number;
	current: boolean;
	payment_date?: Date;
}

/**
 * Datos del formulario de nuevo caso
 */
export interface NewCaseFormData {
	description: string;
	amount: string;
	clientName: string;
	clientPhone: string;
	quantity_payment: string;
	due_date: string;
	type: string;
	period: string;
	amount_payment?: string;
	typepayment?: string;
	collector?: string;
}

/**
 * Datos para registrar un pago
 */
export interface RegisterPaymentData {
	amount: number;
	typepayment: PaymentType;
	paymentNumber: number;
	collector: string;
}

/**
 * Pago formateado para la UI (due_date como string)
 */
export interface FormattedPayment extends Omit<ClientPayment, 'due_date'> {
	due_date: string;
}
```

- [ ] **Step 2: Verify no TypeScript errors in types file**

```bash
pnpm check 2>&1 | head -30
```

Expected: Some errors in other files (we haven't updated them yet) but `case.types.ts` itself should have zero errors. If there are errors in `case.types.ts`, fix them before proceeding.

---

## Task 3: Fix model arithmetic and PaymentStatus update

**Files:**

- Modify: `src/lib/case.model.ts`

**Interfaces:**

- Consumes: `CaseWithPayments` where `restAmount: Prisma.Decimal` (from Prisma after Task 1)
- Produces: `createPayment()` correctly computes `restAmount` using `.toNumber()`, sets `status: 'PAGADA'` on paid payments

- [ ] **Step 1: Fix restAmount arithmetic in createPayment()**

In `src/lib/case.model.ts`, find the `createPayment` function. The line:

```typescript
const restAmount = Number((caso.restAmount - amount).toFixed(3));
```

After migration, `caso.restAmount` is `Prisma.Decimal` — you cannot subtract a `number` from it directly. Replace that single line with:

```typescript
const restAmount = parseFloat((caso.restAmount.toNumber() - amount).toFixed(4));
```

(Changed `toFixed(3)` → `toFixed(4)` to match the `DECIMAL(12,4)` DB precision.)

- [ ] **Step 2: Add status: 'PAGADA' in updatePaymentWithNext()**

Find `updatePaymentWithNext`. In the `db.payment.update` for the paid payment, add `status: 'PAGADA'`:

```typescript
async function updatePaymentWithNext(
	caseId: number,
	paymentNumber: number,
	amount: number,
	typepayment: PaymentType,
	collector: string,
	restAmount: number,
	paymentDate: Date
) {
	const [, , casoUpdated] = await db.$transaction([
		db.payment.update({
			where: { payment_number_caseId: { payment_number: paymentNumber, caseId } },
			data: {
				amount,
				typepayment,
				payment_date: paymentDate,
				current: false,
				collector,
				status: 'PAGADA'
			}
		}),
		db.payment.update({
			where: { payment_number_caseId: { payment_number: paymentNumber + 1, caseId } },
			data: { current: true }
		}),
		db.cases.update({
			where: { id: caseId },
			data: { restAmount, updatedAt: paymentDate }
		})
	]);

	return casoUpdated;
}
```

- [ ] **Step 3: Add status: 'PAGADA' in updateFinalPayment()**

Find `updateFinalPayment`. Same change:

```typescript
async function updateFinalPayment(
	caseId: number,
	paymentNumber: number,
	amount: number,
	typepayment: PaymentType,
	collector: string,
	restAmount: number,
	paymentDate: Date
) {
	const [, casoUpdated] = await db.$transaction([
		db.payment.update({
			where: { payment_number_caseId: { payment_number: paymentNumber, caseId } },
			data: {
				amount,
				typepayment,
				payment_date: paymentDate,
				current: false,
				collector,
				status: 'PAGADA'
			}
		}),
		db.cases.update({
			where: { id: caseId },
			data: { restAmount, updatedAt: paymentDate }
		})
	]);

	return casoUpdated;
}
```

- [ ] **Step 4: Run existing tests to confirm no regressions**

```bash
pnpm test
```

Expected: All tests pass. The `classifyCaseByDate` tests in `case.model.test.ts` don't involve amounts, so they should be unaffected.

---

## Task 4: Update +page.server.ts mappers — Decimal → number at boundary

All three page.server.ts files spread `...c` from Prisma results. After the migration, `c.amount` and `c.restAmount` are `Prisma.Decimal`. They must be converted to `number` before returning from `load()`.

**Files:**

- Modify: `src/routes/+page.server.ts`
- Modify: `src/routes/[estado]/+page.server.ts`
- Modify: `src/routes/historial/+page.server.ts`

---

### 4a — Root page (`/`)

- [ ] **Step 1: Update src/routes/+page.server.ts**

Replace the entire file:

```typescript
import { classifyCaseByDate, getCasesWithDebt } from '$lib/case.model';
import type { ClientPayment, FormattedCase } from '$lib/types/case.types';
import { formatDateToDashDMY } from '$lib/utils/formatters';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('update:cases');
	const user = locals.user;

	if (!user) {
		throw redirect(302, '/login');
	}

	const rawCases = await getCasesWithDebt();

	if (rawCases.length === 0) {
		return { user, cases: [], counts: { overdue: 0, soon: 0, onTime: 0 } };
	}

	const currentDate = new Date();
	const counts = { overdue: 0, soon: 0, onTime: 0 };

	const cases: FormattedCase[] = rawCases
		.map((c) => {
			const category = classifyCaseByDate(c, currentDate);
			if (category === 'overdue') counts.overdue++;
			else if (category === 'soon') counts.soon++;
			else if (category === 'onTime') counts.onTime++;

			const currentPayment = c.payments.find((p) => p.current);
			const dueDate = currentPayment
				? formatDateToDashDMY(currentPayment.due_date.toISOString())
				: undefined;

			const payments: ClientPayment[] = c.payments.map((p) => ({
				...p,
				amount: p.amount ? p.amount.toNumber() : null
			}));

			return {
				...c,
				amount: c.amount.toNumber(),
				restAmount: c.restAmount.toNumber(),
				payments,
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

---

### 4b — Estado page (`/[estado]`)

- [ ] **Step 1: Update src/routes/[estado]/+page.server.ts**

Replace the entire file:

```typescript
import { getOnTimeCases, getOverDueCases, getSoonDueCases } from '$lib/case.model';
import type { ClientPayment, FormattedCase } from '$lib/types/case.types';
import { formatDateToDMY } from '$lib/utils/formatters';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

type CaseStatus = 'VENCIDO' | 'PROXIMO' | 'ATIEMPO';

const caseStatusHandlers: Record<
	CaseStatus,
	() => Promise<import('$lib/types/case.types').CaseWithPayments[]>
> = {
	VENCIDO: getOverDueCases,
	PROXIMO: getSoonDueCases,
	ATIEMPO: getOnTimeCases
};

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = locals.user;

	if (!user) {
		throw redirect(302, '/login');
	}

	const estado = params.estado.toUpperCase() as CaseStatus;
	const handler = caseStatusHandlers[estado];

	if (!handler) {
		throw redirect(302, '/');
	}

	const rawCases = await handler();

	if (rawCases.length === 0) {
		return { user, cases: [] };
	}

	const cases = rawCases
		.map((c) => {
			const currentPayment = c.payments.find((p) => p.current);
			const payments: ClientPayment[] = c.payments.map((p) => ({
				...p,
				amount: p.amount ? p.amount.toNumber() : null
			}));
			return {
				...c,
				amount: c.amount.toNumber(),
				restAmount: c.restAmount.toNumber(),
				payments,
				quantityPaymentsToPay: c.payments.filter((p) => !p.payment_date).length,
				dueDate: currentPayment?.due_date, // keep as Date for sorting
				_sortMs: currentPayment?.due_date?.getTime() ?? Infinity
			};
		})
		.sort((a, b) => a._sortMs - b._sortMs)
		.map((c): FormattedCase => {
			const { _sortMs, ...rest } = c;
			return {
				...rest,
				dueDate: rest.dueDate ? formatDateToDMY(rest.dueDate as Date) : undefined
			};
		});

	return { user, cases };
};
```

---

### 4c — Historial page

- [ ] **Step 1: Update src/routes/historial/+page.server.ts**

Replace the entire file:

```typescript
import { deleteCase, getCases } from '$lib/case.model';
import type { ClientPayment, FormattedCase } from '$lib/types/case.types';
import { formatDateToDMY } from '$lib/utils/formatters';
import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;

	if (!user) {
		throw redirect(302, '/login');
	}

	const rawCases = await getCases();

	if (rawCases.length === 0) {
		return { user, cases: [] };
	}

	const cases: FormattedCase[] = rawCases
		.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
		.map((c) => {
			const payments: ClientPayment[] = c.payments.map((p) => ({
				...p,
				amount: p.amount ? p.amount.toNumber() : null
			}));
			return {
				...c,
				amount: c.amount.toNumber(),
				restAmount: c.restAmount.toNumber(),
				payments,
				created: formatDateToDMY(c.createdAt),
				quantityPaymentsToPay: c.payments.filter((p) => !p.payment_date).length
			};
		});

	return { user, cases };
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const user = locals.user;

		if (!user) {
			throw redirect(302, '/login');
		}

		const formData = await request.formData();
		const caseIdStr = formData.get('caseId')?.toString();

		if (!caseIdStr) {
			throw error(400, 'Faltan datos');
		}

		const caseId = parseInt(caseIdStr);

		try {
			const caso = await deleteCase(caseId);
			if (caso) {
				return { success: true };
			}
			throw error(500, 'Error al eliminar caso');
		} catch (err) {
			console.error('Error deleting case:', err);
			throw error(500, 'Error servidor');
		}
	}
};
```

- [ ] **Step 2: Quick type check**

```bash
pnpm check 2>&1 | grep -E "error|Error" | head -20
```

Expected: Errors only in the component files (Tasks 5 and 6 fix those). If errors in `+page.server.ts` files, fix before moving on.

---

## Task 5: Add formatJUS + formatNumber utilities with tests

**Files:**

- Modify: `src/lib/utils/formatters.ts`
- Create: `src/lib/utils/formatters.test.ts`

**Interfaces:**

- Produces: `formatJUS(value: number): string` — formats with Argentine locale + " JUS" suffix. `formatNumber(value: number): string` — same locale, no suffix.

---

- [ ] **Step 1: Write the failing tests first**

Create `src/lib/utils/formatters.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { formatDateToDMY, formatDateToDashDMY, formatJUS, formatNumber } from './formatters';

describe('formatJUS', () => {
	it('appends JUS suffix', () => {
		expect(formatJUS(50)).toBe('50 JUS');
	});

	it('formats thousands with dot separator (Argentine locale)', () => {
		expect(formatJUS(1234)).toBe('1.234 JUS');
	});

	it('formats decimals with comma separator', () => {
		expect(formatJUS(1234.75)).toBe('1.234,75 JUS');
	});

	it('handles zero', () => {
		expect(formatJUS(0)).toBe('0 JUS');
	});

	it('trims trailing zeros while keeping precision', () => {
		// 50.5 has one decimal place — formats as "50,5"
		expect(formatJUS(50.5)).toBe('50,5 JUS');
	});

	it('supports up to 4 decimal places', () => {
		expect(formatJUS(10.1234)).toBe('10,1234 JUS');
	});
});

describe('formatNumber', () => {
	it('formats without suffix', () => {
		expect(formatNumber(1234.75)).toBe('1.234,75');
	});

	it('handles zero', () => {
		expect(formatNumber(0)).toBe('0');
	});
});

describe('formatDateToDMY', () => {
	it('formats ISO date string', () => {
		expect(formatDateToDMY('2024-03-15T00:00:00.000Z')).toBe('15/03/2024');
	});
});

describe('formatDateToDashDMY', () => {
	it('formats with dash separator', () => {
		expect(formatDateToDashDMY('2024-03-15T00:00:00.000Z')).toBe('15-03-2024');
	});
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
pnpm test src/lib/utils/formatters.test.ts
```

Expected: FAIL — `formatJUS is not a function` (or similar).

- [ ] **Step 3: Add formatJUS and formatNumber to formatters.ts**

Append to `src/lib/utils/formatters.ts` (keep all existing functions, add at the end):

```typescript
// ============================================
// JUS / CURRENCY FORMATTERS
// ============================================

const _jusFormatter = new Intl.NumberFormat('es-AR', {
	minimumFractionDigits: 0,
	maximumFractionDigits: 4
});

/**
 * Formats a JUS amount with Argentine locale (dot as thousands separator,
 * comma as decimal separator) and appends " JUS".
 * Example: 1234.75 → "1.234,75 JUS"
 * @param value - Numeric JUS amount (number, already converted from Prisma.Decimal)
 */
export function formatJUS(value: number): string {
	return `${_jusFormatter.format(value)} JUS`;
}

/**
 * Formats a number with Argentine locale without a suffix.
 * Example: 1234.75 → "1.234,75"
 * @param value - Numeric value to format
 */
export function formatNumber(value: number): string {
	return _jusFormatter.format(value);
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
pnpm test src/lib/utils/formatters.test.ts
```

Expected: All 9 tests pass.

---

## Task 6: Extract BackToTop component

The scroll-handler `$effect` and floating "Volver" button are duplicated in `[estado]/+page.svelte` and `historial/+page.svelte`. Extract into a reusable component. Also fixes the off-center `left-1/2` bug (needs `-translate-x-1/2`).

**Files:**

- Create: `src/lib/components/BackToTop.svelte`

- [ ] **Step 1: Create BackToTop.svelte**

```svelte
<script lang="ts">
	let visible = $state(false);

	$effect(() => {
		const handler = () => {
			const navBar = document.querySelector('.nav-bar');
			visible = !!(navBar && window.scrollY > navBar.clientHeight + 100);
		};
		document.addEventListener('scroll', handler, { passive: true });
		return () => document.removeEventListener('scroll', handler);
	});
</script>

{#if visible}
	<button
		class="btn preset-filled-warning-500 fixed bottom-5 left-1/2 z-10 h-8 -translate-x-1/2"
		onclick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
	>
		Volver
	</button>
{/if}
```

---

## Task 7: Update components — formatJUS + BackToTop + [estado] dedup

**Files:**

- Modify: `src/lib/components/CasesContainer.svelte`
- Modify: `src/routes/[estado]/+page.svelte`
- Modify: `src/lib/components/ModalDetalles.svelte`
- Modify: `src/routes/historial/+page.svelte`

---

### 7a — CasesContainer.svelte

- [ ] **Step 1: Add formatJUS import and replace display**

In `src/lib/components/CasesContainer.svelte`, add import at the top of the `<script>`:

```typescript
import { formatJUS } from '$lib/utils/formatters';
```

Find the line:

```svelte
<td>{caso.restAmount.toString().replace(/\./, ',')} JUS</td>
```

Replace with:

```svelte
<td>{formatJUS(caso.restAmount)}</td>
```

---

### 7b — [estado]/+page.svelte — dedup + formatJUS + BackToTop

The current file has three nearly identical `{#if}` blocks for VENCIDO/PROXIMO/ATIEMPO. Replace the entire file:

- [ ] **Step 1: Replace src/routes/[estado]/+page.svelte**

```svelte
<script lang="ts">
	import BackToTop from '$lib/components/BackToTop.svelte';
	import type { ModalContext } from '$lib/types/modal.types';
	import { formatJUS } from '$lib/utils/formatters';
	import { page } from '$app/state';
	import { getContext } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let cases = $derived(data.cases);

	const param = (page.params.estado ?? '').toUpperCase();

	const { openToPay, openDetails } = getContext<ModalContext>('modals');

	const statusConfig: Record<string, { title: string; textClass: string; barClass: string }> = {
		VENCIDO: {
			title: 'Cuotas vencidas',
			textClass: 'text-red-500',
			barClass: 'bg-red-500'
		},
		PROXIMO: {
			title: 'Cuotas por vencer',
			textClass: 'text-amber-500',
			barClass: 'bg-amber-500'
		},
		ATIEMPO: {
			title: 'Cuotas al día',
			textClass: 'text-green-500',
			barClass: 'bg-green-500'
		}
	};

	const config = statusConfig[param] ?? statusConfig['ATIEMPO'];
</script>

<BackToTop />

<section class="p-4">
	<div class="mb-4 flex items-center gap-3">
		<div class="h-8 w-1 rounded-full {config.barClass}"></div>
		<h2 class="text-2xl font-semibold {config.textClass}">{config.title}</h2>
	</div>
	<div class="overflow-x-auto">
		<table class="table min-w-[700px] text-center">
			<thead>
				<tr>
					<th class="text-center">Descripcion</th>
					<th class="text-center">Tipo caso</th>
					<th class="text-center">Nombre cliente</th>
					<th class="text-center">Telefono cliente</th>
					<th class="text-center">Monto a saldar</th>
					<th class="text-center">Cuotas a pagar</th>
					<th class="text-center">Fecha a cobrar</th>
					<th class="text-center">Acciones</th>
				</tr>
			</thead>
			<tbody>
				{#if cases.length === 0}
					<tr>
						<td colspan="8" class="py-8 text-center opacity-60">No hay casos en esta categoría</td>
					</tr>
				{:else}
					{#each cases as caso (caso.id)}
						<tr>
							<td>{caso.description}</td>
							<td>{caso.type}</td>
							<td>{caso.clientName}</td>
							<td>{caso.clientPhone}</td>
							<td>{formatJUS(caso.restAmount)}</td>
							<td>{caso.quantityPaymentsToPay}</td>
							<td>{caso.dueDate ?? '—'}</td>
							<td class="flex justify-center gap-2">
								<button
									class="btn preset-filled-success-500 btn-sm"
									onclick={() => openToPay(caso)}
								>
									Cobrar
								</button>
								<button
									class="btn preset-filled-secondary-500 btn-sm"
									onclick={() => openDetails(caso)}
								>
									Detalles
								</button>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</section>
```

---

### 7c — ModalDetalles.svelte

Two changes: replace `Payment` cast with `ClientPayment`, replace the `toString().replace` display with `formatJUS`.

- [ ] **Step 1: Update imports**

In `src/lib/components/ModalDetalles.svelte`, change the import block. Replace:

```typescript
import type { Payment } from '@prisma/client';
```

With:

```typescript
import type { ClientPayment } from '$lib/types/case.types';
import { formatJUS } from '$lib/utils/formatters';
```

- [ ] **Step 2: Update FormattedPaymentDisplay interface**

Replace:

```typescript
interface FormattedPaymentDisplay extends Omit<Payment, 'due_date'> {
	due_date: string | undefined;
}
```

With:

```typescript
interface FormattedPaymentDisplay extends Omit<ClientPayment, 'due_date'> {
	due_date: string | undefined;
}
```

- [ ] **Step 3: Update payments derived — replace Payment cast with ClientPayment**

Replace:

```typescript
let payments = $derived<FormattedPaymentDisplay[]>(
	caso
		? caso.restAmount > 0
			? caso.payments.map((p: Payment) => ({ ...p, due_date: formatDateToDMY(p.due_date) }))
			: caso.payments
					.filter((p: Payment) => p.payment_date)
					.map((p: Payment) => ({ ...p, due_date: formatDateToDMY(p.due_date) }))
		: []
);
```

With:

```typescript
let payments = $derived<FormattedPaymentDisplay[]>(
	caso
		? caso.restAmount > 0
			? caso.payments.map((p: ClientPayment) => ({ ...p, due_date: formatDateToDMY(p.due_date) }))
			: caso.payments
					.filter((p: ClientPayment) => p.payment_date)
					.map((p: ClientPayment) => ({ ...p, due_date: formatDateToDMY(p.due_date) }))
		: []
);
```

- [ ] **Step 4: Update the payment amount display**

Find:

```svelte
<div class="text-success-600-400 text-center text-sm font-medium">
	{p.amount?.toString().replace(/\./, ',') ?? '0'} JUS
</div>
```

Replace with:

```svelte
<div class="text-success-600-400 text-center text-sm font-medium">
	{formatJUS(p.amount ?? 0)}
</div>
```

---

### 7d — historial/+page.svelte

- [ ] **Step 1: Update imports**

Add at the top of the `<script>` block:

```typescript
import BackToTop from '$lib/components/BackToTop.svelte';
import { formatJUS } from '$lib/utils/formatters';
```

- [ ] **Step 2: Remove the inline scroll $effect and activeBtn state**

Delete these lines:

```typescript
let activeBtn = $state(false);

$effect(() => {
	const handler = () => {
		const navBar = document.querySelector('.nav-bar');
		activeBtn = !!(navBar && window.scrollY > navBar.clientHeight + 100);
	};
	document.addEventListener('scroll', handler);
	return () => document.removeEventListener('scroll', handler);
});
```

- [ ] **Step 3: Replace the inline back-to-top button with BackToTop component**

Remove the block:

```svelte
{#if activeBtn}
	<button
		class="btn preset-filled-warning-500 fixed bottom-5 left-1/2 h-8"
		onclick={() => (document.documentElement.scrollTop = 0)}>Volver</button
	>
{/if}
```

At the top of the template (before `<section>`), add:

```svelte
<BackToTop />
```

- [ ] **Step 4: Update amount display**

Find:

```svelte
<td>{caso.amount} JUS</td>
```

Replace with:

```svelte
<td>{formatJUS(caso.amount)}</td>
```

---

## Task 8: Full type check + tests + commit

- [ ] **Step 1: Full type check**

```bash
pnpm check
```

Expected: `0 errors, 0 warnings`. If any errors remain, fix them before proceeding. Common issues:

- Missing `ClientPayment` import in a server file → add `import type { ClientPayment } from '$lib/types/case.types'`
- `_sortMs` still appearing in a type → make sure the `map(({ _sortMs, ...c }) => c)` destructure is present

- [ ] **Step 2: Run all tests**

```bash
pnpm test
```

Expected: All tests pass. The new `formatters.test.ts` tests plus existing `case.model.test.ts`, `hooks.server.test.ts`, `filter.test.ts`, `api.test.ts`, `form.test.ts`.

- [ ] **Step 3: Build verification**

```bash
pnpm build
```

Expected: Build completes with no errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git add "prisma/migrations/"
git add src/lib/types/case.types.ts
git add src/lib/case.model.ts
git add src/routes/+page.server.ts
git add "src/routes/[estado]/+page.server.ts"
git add "src/routes/[estado]/+page.svelte"
git add src/routes/historial/+page.server.ts
git add src/routes/historial/+page.svelte
git add src/lib/utils/formatters.ts
git add src/lib/utils/formatters.test.ts
git add src/lib/components/CasesContainer.svelte
git add src/lib/components/ModalDetalles.svelte
git add src/lib/components/BackToTop.svelte
git commit -m "$(cat <<'EOF'
feat: Decimal amounts, PaymentStatus, formatter centralization

- Migrate Float → Decimal(12,4) for all monetary columns (Cases.amount,
  Cases.restAmount, Payment.amount, Currency.value) — eliminates float
  rounding risk in financial data
- Add PaymentStatus enum (PENDIENTE/PAGADA/VENCIDA) to Payment with
  backfill migration; set PAGADA on payment registration
- Add Cases.caseNumber (nullable, unique) for future expediente tracking
- Add index on Payment.due_date for classification query performance
- Centralize Argentine-locale number formatting in formatJUS()/formatNumber()
  using Intl.NumberFormat('es-AR') — replaces ad-hoc toString().replace()
- Decimal→number conversion at server/client boundary in all page.server.ts
  mappers (SvelteKit devalue cannot serialize Prisma.Decimal)
- Extract BackToTop component, eliminate scroll-handler duplication
- Deduplicate [estado] page three-block table into single parametric block

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

### Spec coverage

| Requirement                    | Task                                               |
| ------------------------------ | -------------------------------------------------- |
| DB-01: Float → Decimal(12,4)   | Task 1 + Task 4 (mappers)                          |
| DB-02: PaymentStatus           | Task 1 + Task 3                                    |
| DB-05: caseNumber              | Task 1                                             |
| DB-08: due_date index          | Task 1                                             |
| Centralize Argentine formatter | Task 5 + Task 7                                    |
| Find replicated methods        | BackToTop (Task 6), scroll handler dedup (Task 7d) |
| Decimal serialization safety   | Task 2 + Task 4                                    |

### Known edge cases handled

- `p.amount` nullable on unpaid payments → `p.amount ?? 0` in formatJUS calls
- Sort key `_sortMs` removed before returning `FormattedCase[]` — not in type
- `BackToTop` uses `{ passive: true }` on scroll listener for performance
- Left-1/2 centering bug fixed with `-translate-x-1/2`
- `FormattedPayment` in case.types.ts updated to extend `ClientPayment` not `Payment`
