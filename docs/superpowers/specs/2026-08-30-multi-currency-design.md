# Multi-Currency Support — Design Spec
Date: 2026-08-30  
Status: Approved for implementation

## Overview

Extend Estudio Ricardo from JUS-only to a tri-currency system (JUS, USD, EUR).
Each case stores amounts in its own native currency. Display converts to ARS and
other currencies using live rates. JUS remains the default.

---

## Goals

- Cases can be created in JUS, USD, or EUR
- Amounts stored in native currency — no implicit conversion at write time
- Display shows native amount + ARS equivalent (computed server-side)
- Interactive converters in modals use live rates (client-side)
- Adding a new currency in the future = insert DB row only, no code change

---

## Non-Goals

- Historical exchange rate snapshots (rates are always current, same as JUS today)
- Per-payment currency (payments inherit the case's currency)
- Multi-currency payments on a single case

---

## Schema Changes

### Currency model (extended)

```prisma
model Currency {
  id        Int     @id @default(autoincrement())
  name      String  @unique           // "JUS", "USD", "EUR"
  value     Decimal @db.Decimal(12, 4) // pesos per unit
  isDefault Boolean @default(false)   // exactly one row true
  cases     Cases[]
}
```

Constraint: only one `isDefault = true` enforced at application level via
transaction (MySQL lacks partial unique indexes).

### Cases model (extended)

```prisma
model Cases {
  // ... existing fields unchanged ...
  currencyId Int      @default(1)
  currency   Currency @relation(fields: [currencyId], references: [id])

  @@index([currencyId])
}
```

`amount` and `restAmount` now represent values in the case's native currency.
All existing cases default to `currencyId = 1` (JUS) — no data migration needed.

### Payment model

No changes. `Payment.amount` is implicitly in the case's currency via the
`case` relation. Currency is resolved at query time.

### Seed

```ts
{ name: 'JUS', value: 5000,  isDefault: true  }
{ name: 'USD', value: 1500,  isDefault: false }
{ name: 'EUR', value: 1650,  isDefault: false }
```

---

## Backend

### `src/lib/currency.model.ts` (replaces `jus.model.ts`)

```ts
getCurrencyRates(): Promise<Record<string, number>>
  // → { JUS: 5000, USD: 1500, EUR: 1650 }

getDefaultCurrency(): Promise<{ id: number; name: string; value: number }>

setCurrencyValue(name: string, value: number): Promise<number>

setCurrencyAsDefault(name: string): Promise<void>
  // transaction: updateMany isDefault=false → update target isDefault=true

// Kept during migration, delegates to getCurrencyRates():
getJusValue(): Promise<number | undefined>
```

### `src/routes/+layout.server.ts`

```ts
// Before: { user, jus_value: number }
// After:  { user, currencies: Array<{ id, name, value, isDefault }> }
// Full objects needed: ModalForm needs `id` for currencyId submission,
// UI needs `isDefault` to preselect, currency.ts helpers derive rates from array.
```

### `src/routes/api/newCase/+server.ts`

Zod schema adds:
```ts
currencyId: z.coerce.number().int().positive().optional()
```

If `currencyId` absent, resolve default currency from DB.

`buildCaseData` removes `jusValue` param entirely. Amount math:

```ts
const amountNative = parseFloat(amount.replace(',', '.'));
const restAmount = amountPaymentNative
  ? parseFloat((amountNative - amountPaymentNative).toFixed(3))
  : amountNative;
```

Payment amounts stored directly in native currency (no division by jusValue).

### `src/routes/api/newPayment/+server.ts`

- Loads case to get `currencyId` before processing
- Frontend sends amount already in case's native currency
- Validation: `amount ≤ case.restAmount` (direct comparison, same currency)
- Removes `getJusValue()` call

### `src/lib/case.model.ts`

All Case queries add `currency: true` to `include`. Server mapper computes:

```ts
restAmountPesos: restAmount.toNumber() * currency.value.toNumber()
```

`FormattedCase` type gains:
```ts
currency: { id: number; name: string; value: number }
restAmountPesos: number
```

---

## Frontend

### `src/lib/utils/currency.ts` (new — single source of truth)

All conversion logic lives here. Nothing else reimplements it.

```ts
type CurrencyMeta = { id: number; name: string; value: number; isDefault: boolean }
type CurrencyRates = Record<string, number>  // { JUS: 5000, USD: 1500 }

// Extract rates map from layout currencies array
toRatesMap(currencies: CurrencyMeta[]): CurrencyRates

// ARS as pivot for all cross-currency conversion
toARS(amount: number, rate: number): number
fromARS(amountARS: number, rate: number): number
convert(amount: number, fromRate: number, toRate: number): number
  // toARS(amount, fromRate) / toRate

// Display formatting
formatAmount(amount: number, currencyName: string): string
  // "$ 1.500,00" | "U$D 1.000,00" | "€ 850,00" | "10,500 JUS"

// Full equivalents for UI display
getEquivalents(amount: number, fromCurrency: string, rates: CurrencyRates): Record<string, number>
  // { ARS: 1500000, JUS: 300, EUR: 909 }
```

Used by: server mapper, all modals, display components.

### `ModalCurrencies.svelte` (replaces `ModalJus.svelte`)

- Lists all currencies from DB (dynamic, not hardcoded)
- Edits `value` for each currency
- Shows `isDefault` indicator
- Calls `setCurrencyValue` via `/api/currencies` endpoint

### `ModalForm.svelte` (modified)

- Segmented control: `JUS | USD | EUR` (loaded from `page.data.currencies`)
- Preselects the `isDefault` currency
- Amount input labeled with selected currency symbol
- Live equivalents below input via `getEquivalents()` from `currency.ts`
- Icon button in header → opens `ModalConverter`
- Sends `currencyId` to `/api/newCase`

### `ModalToPay.svelte` (modified)

- Reads `caso.currency` for native currency
- Amount input in native currency
- Shows ARS equivalent below (informative, via `toARS()`)
- Validation: `amount ≤ caso.restAmount` (direct, same currency)

### `ModalConverter.svelte` (new, read-only)

- Cross-conversion reference table
- Built from `page.data.currencies` via `getEquivalents()`
- No state, no API calls — pure display
- Accessible from `ModalForm` header icon

### `CasesContainer.svelte` and display pages

- `formatAmount(caso.restAmount, caso.currency.name)` for native display
- `caso.restAmountPesos` for ARS display (pre-computed, no client math)

### `ModalContext` (updated)

```ts
interface ModalContext {
  openNewCase: () => void
  openToPay: (caso: FormattedCase) => void
  openCurrencies: () => void   // renamed from openJus
  openDetails: (caso: FormattedCase) => void
  openConverter: () => void    // new
}
```

---

## API Endpoints

### `/api/currencies` (new, replaces `/api/jusValue`)

```
GET  → returns all Currency rows
POST → body: { name: string, value: number } → setCurrencyValue()
```

---

## Migration Path

1. Run Prisma migration — adds `currencyId` with DB default 1
2. Seed inserts JUS (id=1, isDefault=true), USD, EUR
3. All existing cases automatically point to JUS — zero data loss
4. `jus.model.ts` stays during transition, callers migrated incrementally

---

## Files Changed

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `currencyId` to Cases, `isDefault` to Currency |
| `src/lib/currency.model.ts` | New — replaces jus.model.ts |
| `src/lib/jus.model.ts` | Deleted after callers migrated |
| `src/lib/utils/currency.ts` | New — all conversion logic |
| `src/lib/types/case.types.ts` | Add `currency`, `restAmountPesos` to FormattedCase |
| `src/lib/types/modal.types.ts` | Add `openConverter`, rename `openJus` → `openCurrencies` |
| `src/lib/case.model.ts` | Include currency in queries, compute restAmountPesos |
| `src/routes/+layout.server.ts` | Return `currencies` map instead of `jus_value` |
| `src/routes/api/newCase/+server.ts` | Accept currencyId, remove jusValue conversion |
| `src/routes/api/newPayment/+server.ts` | Currency-aware, remove jusValue |
| `src/routes/api/jusValue/+server.ts` | Replaced by `/api/currencies` |
| `src/routes/api/currencies/+server.ts` | New endpoint |
| `src/lib/components/ModalJus.svelte` | Replaced by ModalCurrencies |
| `src/lib/components/ModalCurrencies.svelte` | New |
| `src/lib/components/ModalConverter.svelte` | New |
| `src/lib/components/ModalForm.svelte` | Currency selector, live converter |
| `src/lib/components/ModalToPay.svelte` | Currency-aware input |
| `src/routes/+layout.svelte` | Wire ModalCurrencies + ModalConverter into context |
| `src/lib/components/CasesContainer.svelte` | formatAmount, restAmountPesos |
| `src/routes/+page.svelte` | Show currency on case cards |
| `src/routes/[estado]/+page.svelte` | Show currency on detail view |
| `src/routes/historial/+page.svelte` | Show currency on history |
| `prisma/seed.ts` | Seed JUS/USD/EUR with isDefault |
