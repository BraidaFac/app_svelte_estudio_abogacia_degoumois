# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

## Commands

```bash
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm check            # TypeScript + Svelte type check (run before commits)
pnpm test             # Run all tests (vitest)
pnpm test:watch       # Tests in watch mode
pnpm lint             # Prettier + ESLint check
pnpm format           # Auto-format
```

Run a single test file:

```bash
pnpm vitest run src/lib/case.model.test.ts
```

## Architecture

### Tech Stack

- **SvelteKit** (Svelte 5 runes) + **TypeScript**
- **Tailwind v4** via `@tailwindcss/vite` plugin (no `tailwind.config.js`)
- **Skeleton Labs v3** (`@skeletonlabs/skeleton` + `@skeletonlabs/skeleton-svelte`) — component library using Zag.js primitives
- **Prisma 6** + **MySQL** — ORM and database
- **JWT** (httpOnly cookie `AuthorizationToken: Bearer <token>`) — authentication
- **Zod** — validation on both client and server
- **date-fns** — date formatting/diffing

### Data Flow

```
hooks.server.ts → JWT verify → event.locals.user
      ↓
+layout.server.ts → loads currencies globally (CurrencyRecord[])
      ↓
+page.server.ts → calls case.model.ts → db (Prisma) → returns typed PageData
      ↓
+page.svelte → passes cases via Svelte context (setContext) to child components
      ↓
Modal components read context via getContext('modals') : ModalContext
```

### Key Files

| File                                  | Purpose                                                                     |
| ------------------------------------- | --------------------------------------------------------------------------- |
| `src/hooks.server.ts`                 | JWT auth + in-memory rate limiting (10 req/15min on POST /login, /signup)   |
| `src/lib/db.ts`                       | Single PrismaClient export (`db`)                                           |
| `src/lib/case.model.ts`               | All DB operations for Cases/Payments. `getCasesGrouped()` is the main query |
| `src/lib/currency.model.ts`           | Currency CRUD — `getCurrencies`, `getDefaultCurrency`, `setCurrencyValue`   |
| `src/lib/utils/currency.ts`          | Conversion utils — `toARS`, `fromARS`, `convert`, `formatAmount`, `getEquivalents` |
| `src/lib/user.model.ts`               | User authentication operations                                              |
| `src/lib/types/case.types.ts`         | `CaseWithPayments`, `FormattedCase`, `CreateCaseData` — never use `any`     |
| `src/lib/types/modal.types.ts`        | `ModalContext` interface for context-based modal coordination               |
| `src/lib/utils/validation.ts`         | Zod helpers: `validateWithSchema`, `validateOrThrow`, `extractFieldErrors`  |
| `src/lib/utils/api.ts`                | `createErrorResponse()` for API endpoints                                   |
| `src/lib/utils/form.ts`               | Form parsing utilities                                                      |
| `src/lib/utils/formatters.ts`         | Date formatters (`formatDateToDMY`, `formatDateToDashDMY`)                  |
| `src/lib/stores/filter.ts`            | `createSearchStore` + `searchHandler` for client-side search                |
| `src/lib/components/modalSchema.ts`   | Zod schema for new case form                                                |
| `src/lib/components/paymentSchema.ts` | Zod schema for payment form                                                 |

### Routes

| Route             | Description                                                                        |
| ----------------- | ---------------------------------------------------------------------------------- |
| `/`               | Home — active cases with debt, grouped by status (overdue/soon/onTime) with counts |
| `/[estado]`       | Cases filtered by status: `VENCIDO`, `PROXIMO`, `ATIEMPO`                          |
| `/historial`      | Completed cases (restAmount = 0), paginated client-side                            |
| `/login`          | Login form (rate limited)                                                          |
| `/signup`         | Registration form (rate limited)                                                   |
| `/logout`         | DELETE cookie and redirect                                                         |
| `/api/newCase`    | POST — create case + payments                                                      |
| `/api/newPayment` | POST — register a payment on an existing case                                      |
| `/api/updateCase` | POST — update or delete a case                                                     |
| `/api/currencies` | GET/POST — currency rates (replaces `/api/jusValue`)                               |

### Modal Architecture

Modals use **native HTML `<dialog>` elements** (no Skeleton modal store). Coordination via Svelte context:

1. `+layout.svelte` calls `setContext('modals', { openNewCase, openToPay, openCurrencies, openDetails, openConverter })`
2. Any child component calls `getContext<ModalContext>('modals')` to open modals
3. Modal components (`ModalForm`, `ModalToPay`, `ModalCurrencies`, `ModalConverter`, `ModalDetalles`) hold their own open/close state

### Case Lifecycle

- `restAmount > 0` → active case (appears on home/status pages)
- `restAmount = 0` → completed (appears in `/historial`)
- Payments have `current: Boolean` — exactly one payment per case is `current` (the next due)
- `classifyCaseByDate()` in `case.model.ts` classifies by `current` payment's `due_date`

### Auth Pattern

All protected routes check `locals.user` (set by `hooks.server.ts`) and redirect to `/login` if absent. No middleware abstraction — each `+page.server.ts` does its own check.

### Design System

- Theme: **wintry** (Skeleton Labs — navy/professional tones), set on `<html>` element in `app.html`
- Font: **Lato** from Google Fonts (loaded in `app.html`)
- CSS custom properties follow Skeleton's `@theme` directive tokens (e.g. `--color-primary-500`)
- Tailwind v4: no config file — all customization via `@theme` blocks in `app.css`
