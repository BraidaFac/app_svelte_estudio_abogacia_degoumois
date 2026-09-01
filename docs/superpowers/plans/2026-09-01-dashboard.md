# Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/dashboard` route with business KPIs, debt aging, portfolio metrics, monthly trend chart, and action lists — all convertible between JUS/USD/EUR/ARS via a client-side currency toggle.

**Architecture:** Single `load()` in `+page.server.ts` runs all DB queries in parallel (8 `$queryRaw` calls via `Promise.all`), normalizes every monetary amount to ARS using `JOIN Currency`, and returns a typed `DashboardData` object. The page component holds `$state selectedCurrency` and converts ARS → selected currency at render time using `fromARS()` + `formatAmount()` from the existing `currency.ts` utils. No additional API endpoints.

**Tech Stack:** SvelteKit 2 · Svelte 5 runes · Prisma 6 `$queryRaw` · MySQL · svelte-chartjs + chart.js · date-fns · `$lib/utils/currency.ts`

**Spec:** `docs/superpowers/specs/2026-09-01-dashboard-design.md`

## Global Constraints

- **Prerequisite:** Multi-currency feature (`2026-08-30-multi-currency-design.md`) must be implemented before this plan. Imports `fromARS(arsAmount, rate)` and `formatAmount(amount, currencyName)` from `$lib/utils/currency.ts`.
- Svelte 5 runes only — no `$:`, no `export let`, no `onMount`. Use `$props()`, `$state()`, `$derived()`, `$effect()`.
- All monetary DB values are `Decimal` — call `Number()` on every raw query result field.
- Brand scarlet for chart bars and interactive elements: `#d43124`. Semantic state colors: vencida `#ff6b5e`, proximo `#e6a93c`, pagada `#3fb98a`. Never use scarlet for state data.
- Font stack: display `'Cinzel'`, body `'IBM Plex Sans'`, mono `'IBM Plex Mono'`.
- No new Zod schemas, no new API routes, no new Prisma migrations.
- Run `pnpm check` before every commit to catch type errors.

---

## File Map

| Status | File | Purpose |
|---|---|---|
| Create | `src/lib/types/dashboard.types.ts` | `DashboardData` and sub-types |
| Create | `src/lib/dashboard.model.ts` | All DB queries returning `DashboardData` |
| Create | `src/routes/dashboard/+page.server.ts` | Auth guard + `load()` |
| Create | `src/routes/dashboard/+page.svelte` | Layout + currency selector |
| Create | `src/lib/components/dashboard/DashboardHero.svelte` | 4 KPI cards |
| Create | `src/lib/components/dashboard/DashboardAging.svelte` | Aging rows + oldest unpaid |
| Create | `src/lib/components/dashboard/DashboardCartera.svelte` | Portfolio metrics |
| Create | `src/lib/components/dashboard/DashboardTendencia.svelte` | Monthly bar chart |
| Create | `src/lib/components/dashboard/DashboardProximos.svelte` | Upcoming payments list |
| Create | `src/lib/components/dashboard/DashboardTopDeuda.svelte` | Top 5 cases by overdue debt |
| Modify | `src/routes/login/+page.server.ts` | Change both `/` redirects → `/dashboard` |
| Modify | `src/lib/components/BurgerBar.svelte` | Add Dashboard nav link |

---

### Task 1: Install dependency + TypeScript types

**Files:**
- Create: `src/lib/types/dashboard.types.ts`

**Interfaces:**
- Produces: `AgingBucket`, `ProximoVencimiento`, `TopCasoDeuda`, `TendenciaMes`, `DashboardData` — imported by Tasks 2, 3, 4, 5, 6, 7, 8, 9, 10

- [ ] **Step 1: Install svelte-chartjs and chart.js**

```bash
pnpm add svelte-chartjs chart.js
```

- [ ] **Step 2: Create dashboard types**

Create `src/lib/types/dashboard.types.ts`:

```typescript
export type AgingBucket = {
	d0_30: number;   // ARS
	d31_60: number;  // ARS
	d61_90: number;  // ARS
	d90plus: number; // ARS
};

export type ProximoVencimiento = {
	caseId: number;
	clientName: string;
	description: string;
	dueDate: string;    // "dd-mm-yyyy"
	arsAmount: number;
};

export type TopCasoDeuda = {
	caseId: number;
	clientName: string;
	description: string;
	deudaVencidaARS: number;
};

export type TendenciaMes = {
	mes: string;        // "Sep 25"
	cobradoARS: number;
};

export type DashboardData = {
	// Hero KPIs (ARS)
	cobradoEsteMesARS: number;
	porCobrarEsteMesARS: number;
	totalVencidoARS: number;
	casosActivos: number;

	// Aging — active cases only (ARS)
	aging: AgingBucket;
	cuotaMasAntigua: string | null; // "dd-mm-yyyy"

	// Portfolio — active cases only (ARS)
	saldoPendienteTotalARS: number;
	porcentajeCobrado: number; // 0–100
	valorTotalCarteraARS: number;

	// Action lists
	proximosVencimientos: ProximoVencimiento[];
	topCasosDeuda: TopCasoDeuda[];

	// Trend chart
	tendenciaMensual: TendenciaMes[];
};
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/types/dashboard.types.ts
git commit -m "feat(dashboard): add DashboardData TypeScript types"
```

---

### Task 2: Dashboard model — DB queries

**Files:**
- Create: `src/lib/dashboard.model.ts`

**Interfaces:**
- Consumes: `DashboardData`, `AgingBucket`, `ProximoVencimiento`, `TopCasoDeuda`, `TendenciaMes` from `$lib/types/dashboard.types`; `db` from `$lib/db`; `differenceInDays`, `addDays`, `addMonths`, `format` from `date-fns`; `formatDateToDashDMY` from `$lib/utils/formatters`
- Produces: `getDashboardData(): Promise<DashboardData>` — called by Task 3

All monetary amounts are normalized to ARS in SQL via `JOIN Currency ON Cases.currencyId = Currency.id` and `p.amount * cu.value`. MySQL SUM() returns DECIMAL which arrives as a string — always wrap in `Number()`. Run all 8 queries in parallel with `Promise.all`.

- [ ] **Step 1: Write the unit test for aging partition**

Create `src/lib/dashboard.model.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { partitionAging } from './dashboard.model';

describe('partitionAging', () => {
	const now = new Date('2026-09-01T00:00:00Z');

	it('assigns row to d0_30 when 15 days overdue', () => {
		const rows = [{ due_date: new Date('2026-08-17T00:00:00Z'), arsAmount: '1000' }];
		const { aging, total } = partitionAging(rows, now);
		expect(aging.d0_30).toBe(1000);
		expect(aging.d31_60).toBe(0);
		expect(total).toBe(1000);
	});

	it('assigns row to d31_60 when 45 days overdue', () => {
		const rows = [{ due_date: new Date('2026-07-17T00:00:00Z'), arsAmount: '500' }];
		const { aging } = partitionAging(rows, now);
		expect(aging.d31_60).toBe(500);
	});

	it('assigns row to d61_90 when 75 days overdue', () => {
		const rows = [{ due_date: new Date('2026-06-18T00:00:00Z'), arsAmount: '200' }];
		const { aging } = partitionAging(rows, now);
		expect(aging.d61_90).toBe(200);
	});

	it('assigns row to d90plus when 120 days overdue', () => {
		const rows = [{ due_date: new Date('2026-05-04T00:00:00Z'), arsAmount: '800' }];
		const { aging } = partitionAging(rows, now);
		expect(aging.d90plus).toBe(800);
	});

	it('returns oldest date from first row (ASC order)', () => {
		const rows = [
			{ due_date: new Date('2026-05-04T00:00:00Z'), arsAmount: '100' },
			{ due_date: new Date('2026-08-17T00:00:00Z'), arsAmount: '100' },
		];
		const { oldest } = partitionAging(rows, now);
		expect(oldest?.toISOString()).toBe('2026-05-04T00:00:00.000Z');
	});

	it('returns null oldest when no rows', () => {
		const { oldest, total } = partitionAging([], now);
		expect(oldest).toBeNull();
		expect(total).toBe(0);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run src/lib/dashboard.model.test.ts
```

Expected: FAIL — `partitionAging` not defined.

- [ ] **Step 3: Create dashboard.model.ts with partitionAging + getDashboardData**

Create `src/lib/dashboard.model.ts`:

```typescript
import { db } from '$lib/db';
import type {
	AgingBucket,
	DashboardData,
	ProximoVencimiento,
	TendenciaMes,
	TopCasoDeuda
} from '$lib/types/dashboard.types';
import { formatDateToDashDMY } from '$lib/utils/formatters';
import { addDays, addMonths, differenceInDays, format } from 'date-fns';

// Raw query row shapes — MySQL SUM/DECIMAL comes back as string
type CobradoRow = { cobradoARS: string };
type PorCobrarRow = { porCobrarARS: string };
type VencidaRow = { due_date: Date; arsAmount: string };
type CarteraRow = { saldoARS: string; totalARS: string };
type ProximoRow = {
	due_date: Date;
	arsAmount: string;
	caseId: number;
	clientName: string;
	description: string;
};
type TopDeudaRow = {
	caseId: number;
	clientName: string;
	description: string;
	deudaVencidaARS: string;
};
type TendenciaRow = { yr: number; mo: number; cobradoARS: string };

export function partitionAging(
	rows: { due_date: Date; arsAmount: string }[],
	now: Date
): { aging: AgingBucket; total: number; oldest: Date | null } {
	const aging: AgingBucket = { d0_30: 0, d31_60: 0, d61_90: 0, d90plus: 0 };
	let total = 0;
	let oldest: Date | null = null;

	for (const row of rows) {
		const days = differenceInDays(now, new Date(row.due_date));
		const amount = Number(row.arsAmount ?? 0);
		total += amount;
		if (!oldest) oldest = new Date(row.due_date); // rows ordered ASC → first = oldest
		if (days <= 30) aging.d0_30 += amount;
		else if (days <= 60) aging.d31_60 += amount;
		else if (days <= 90) aging.d61_90 += amount;
		else aging.d90plus += amount;
	}

	return { aging, total, oldest };
}

export async function getDashboardData(): Promise<DashboardData> {
	const now = new Date();
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
	const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
	const in7Days = addDays(now, 7);
	const twelveMonthsAgo = addMonths(now, -12);

	const [
		cobradoRows,
		porCobrarRows,
		vencidasRows,
		carteraRows,
		casosActivos,
		proximosRows,
		topDeudaRows,
		tendenciaRows
	] = await Promise.all([
		db.$queryRaw<CobradoRow[]>`
      SELECT SUM(p.amount * cu.value) AS cobradoARS
      FROM Payment p
      JOIN Cases ca ON p.caseId = ca.id
      JOIN Currency cu ON ca.currencyId = cu.id
      WHERE p.payment_date >= ${startOfMonth} AND p.payment_date < ${startOfNextMonth}
    `,
		db.$queryRaw<PorCobrarRow[]>`
      SELECT SUM(p.amount * cu.value) AS porCobrarARS
      FROM Payment p
      JOIN Cases ca ON p.caseId = ca.id
      JOIN Currency cu ON ca.currencyId = cu.id
      WHERE p.payment_date IS NULL
        AND p.due_date >= ${now} AND p.due_date < ${startOfNextMonth}
        AND ca.restAmount > 0 AND ca.closed = false
    `,
		db.$queryRaw<VencidaRow[]>`
      SELECT p.due_date, p.amount * cu.value AS arsAmount
      FROM Payment p
      JOIN Cases ca ON p.caseId = ca.id
      JOIN Currency cu ON ca.currencyId = cu.id
      WHERE p.payment_date IS NULL
        AND p.due_date < ${now}
        AND ca.restAmount > 0 AND ca.closed = false
      ORDER BY p.due_date ASC
    `,
		db.$queryRaw<CarteraRow[]>`
      SELECT
        SUM(ca.restAmount * cu.value) AS saldoARS,
        SUM(ca.amount * cu.value) AS totalARS
      FROM Cases ca
      JOIN Currency cu ON ca.currencyId = cu.id
      WHERE ca.restAmount > 0 AND ca.closed = false
    `,
		db.cases.count({ where: { restAmount: { gt: 0 }, closed: false } }),
		db.$queryRaw<ProximoRow[]>`
      SELECT p.due_date, p.amount * cu.value AS arsAmount,
             ca.id AS caseId, ca.clientName, ca.description
      FROM Payment p
      JOIN Cases ca ON p.caseId = ca.id
      JOIN Currency cu ON ca.currencyId = cu.id
      WHERE p.payment_date IS NULL
        AND p.due_date >= ${now} AND p.due_date < ${in7Days}
        AND ca.restAmount > 0 AND ca.closed = false
      ORDER BY p.due_date ASC
    `,
		db.$queryRaw<TopDeudaRow[]>`
      SELECT ca.id AS caseId, ca.clientName, ca.description,
             SUM(p.amount * cu.value) AS deudaVencidaARS
      FROM Payment p
      JOIN Cases ca ON p.caseId = ca.id
      JOIN Currency cu ON ca.currencyId = cu.id
      WHERE p.payment_date IS NULL
        AND p.due_date < ${now}
        AND ca.restAmount > 0 AND ca.closed = false
      GROUP BY ca.id, ca.clientName, ca.description
      ORDER BY deudaVencidaARS DESC
      LIMIT 5
    `,
		db.$queryRaw<TendenciaRow[]>`
      SELECT YEAR(p.payment_date) AS yr, MONTH(p.payment_date) AS mo,
             SUM(p.amount * cu.value) AS cobradoARS
      FROM Payment p
      JOIN Cases ca ON p.caseId = ca.id
      JOIN Currency cu ON ca.currencyId = cu.id
      WHERE p.payment_date >= ${twelveMonthsAgo}
      GROUP BY yr, mo
      ORDER BY yr, mo
    `
	]);

	const { aging, total: totalVencidoARS, oldest } = partitionAging(vencidasRows, now);

	const saldoARS = Number(carteraRows[0]?.saldoARS ?? 0);
	const totalCarteraARS = Number(carteraRows[0]?.totalARS ?? 0);
	const porcentajeCobrado =
		totalCarteraARS > 0 ? ((totalCarteraARS - saldoARS) / totalCarteraARS) * 100 : 0;

	const tendenciaMensual: TendenciaMes[] = tendenciaRows.map((row) => ({
		mes: format(new Date(Number(row.yr), Number(row.mo) - 1, 1), 'MMM yy'),
		cobradoARS: Number(row.cobradoARS ?? 0)
	}));

	const proximosVencimientos: ProximoVencimiento[] = proximosRows.map((row) => ({
		caseId: Number(row.caseId),
		clientName: row.clientName,
		description: row.description,
		dueDate: formatDateToDashDMY(new Date(row.due_date).toISOString()),
		arsAmount: Number(row.arsAmount ?? 0)
	}));

	const topCasosDeuda: TopCasoDeuda[] = topDeudaRows.map((row) => ({
		caseId: Number(row.caseId),
		clientName: row.clientName,
		description: row.description,
		deudaVencidaARS: Number(row.deudaVencidaARS ?? 0)
	}));

	return {
		cobradoEsteMesARS: Number(cobradoRows[0]?.cobradoARS ?? 0),
		porCobrarEsteMesARS: Number(porCobrarRows[0]?.porCobrarARS ?? 0),
		totalVencidoARS,
		casosActivos,
		aging,
		cuotaMasAntigua: oldest ? formatDateToDashDMY(oldest.toISOString()) : null,
		saldoPendienteTotalARS: saldoARS,
		porcentajeCobrado,
		valorTotalCarteraARS: totalCarteraARS,
		proximosVencimientos,
		topCasosDeuda,
		tendenciaMensual
	};
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm vitest run src/lib/dashboard.model.test.ts
```

Expected: 6 tests PASS.

- [ ] **Step 5: Type check**

```bash
pnpm check
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/dashboard.model.ts src/lib/dashboard.model.test.ts
git commit -m "feat(dashboard): add dashboard model with parallel queries and aging partition"
```

---

### Task 3: Page server load

**Files:**
- Create: `src/routes/dashboard/+page.server.ts`

**Interfaces:**
- Consumes: `getDashboardData()` from `$lib/dashboard.model`
- Produces: `PageData` with `{ dashboard: DashboardData }` — consumed by Task 10

- [ ] **Step 1: Create the load function**

```bash
mkdir -p src/routes/dashboard
```

Create `src/routes/dashboard/+page.server.ts`:

```typescript
import { getDashboardData } from '$lib/dashboard.model';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/login');

	const dashboard = await getDashboardData();
	return { dashboard };
};
```

- [ ] **Step 2: Type check**

```bash
pnpm check
```

Expected: no errors. SvelteKit generates `./$types` automatically on next dev/check run. If types error: run `pnpm check` once more (sync generates types on first pass).

- [ ] **Step 3: Commit**

```bash
git add src/routes/dashboard/+page.server.ts
git commit -m "feat(dashboard): add page server load with auth guard"
```

---

### Task 4: DashboardHero — 4 KPI cards

**Files:**
- Create: `src/lib/components/dashboard/DashboardHero.svelte`

**Interfaces:**
- Consumes: `cobradoEsteMesARS`, `porCobrarEsteMesARS`, `totalVencidoARS`, `casosActivos: number` props; `displayAmount: (ars: number) => string` prop from Task 10
- Produces: rendered 4-card grid

- [ ] **Step 1: Create component directory and file**

```bash
mkdir -p src/lib/components/dashboard
```

Create `src/lib/components/dashboard/DashboardHero.svelte`:

```svelte
<script lang="ts">
	let {
		cobradoEsteMesARS,
		porCobrarEsteMesARS,
		totalVencidoARS,
		casosActivos,
		displayAmount
	}: {
		cobradoEsteMesARS: number;
		porCobrarEsteMesARS: number;
		totalVencidoARS: number;
		casosActivos: number;
		displayAmount: (ars: number) => string;
	} = $props();
</script>

<div class="hero-grid">
	<div class="card hero-card">
		<p class="hero-label">Cobrado este mes</p>
		<p class="hero-value">{displayAmount(cobradoEsteMesARS)}</p>
	</div>
	<div class="card hero-card">
		<p class="hero-label">Por cobrar este mes</p>
		<p class="hero-value" style="color: var(--color-proximo);">
			{displayAmount(porCobrarEsteMesARS)}
		</p>
	</div>
	<div class="card hero-card">
		<p class="hero-label">Total vencido</p>
		<p class="hero-value" style="color: var(--color-vencida);">
			{displayAmount(totalVencidoARS)}
		</p>
	</div>
	<div class="card hero-card">
		<p class="hero-label">Casos activos</p>
		<p class="hero-value">{casosActivos}</p>
	</div>
</div>

<style>
	.hero-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
	}

	@media (max-width: 768px) {
		.hero-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 480px) {
		.hero-grid {
			grid-template-columns: 1fr;
		}
	}

	.hero-card {
		padding: 1.5rem;
		text-align: center;
	}

	.hero-label {
		font-family: 'Cinzel', Georgia, serif;
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-brand);
		margin: 0 0 0.75rem;
	}

	.hero-value {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 1.75rem;
		font-weight: 500;
		font-variant-numeric: tabular-nums;
		line-height: 1;
		margin: 0;
		color: var(--color-text-primary);
		word-break: break-all;
	}
</style>
```

- [ ] **Step 2: Type check**

```bash
pnpm check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/dashboard/DashboardHero.svelte
git commit -m "feat(dashboard): add DashboardHero KPI cards component"
```

---

### Task 5: DashboardAging — debt aging rows

**Files:**
- Create: `src/lib/components/dashboard/DashboardAging.svelte`

**Interfaces:**
- Consumes: `aging: AgingBucket`, `cuotaMasAntigua: string | null`, `displayAmount: (ars: number) => string`
- Produces: aging rows with colored CSS bar + oldest unpaid date

- [ ] **Step 1: Create component**

Create `src/lib/components/dashboard/DashboardAging.svelte`:

```svelte
<script lang="ts">
	import type { AgingBucket } from '$lib/types/dashboard.types';

	let {
		aging,
		cuotaMasAntigua,
		displayAmount
	}: {
		aging: AgingBucket;
		cuotaMasAntigua: string | null;
		displayAmount: (ars: number) => string;
	} = $props();

	const total = $derived(aging.d0_30 + aging.d31_60 + aging.d61_90 + aging.d90plus);

	function pct(amount: number): number {
		return total > 0 ? (amount / total) * 100 : 0;
	}

	const buckets = $derived([
		{ label: '0–30 días', amount: aging.d0_30, color: '#ff6b5e' },
		{ label: '31–60 días', amount: aging.d31_60, color: '#e6a93c' },
		{ label: '61–90 días', amount: aging.d61_90, color: '#3fb98a' },
		{ label: '+90 días', amount: aging.d90plus, color: '#6e6e6e' }
	]);
</script>

<div class="card aging-card">
	<h2 class="section-title">Antigüedad de deuda</h2>

	{#if total === 0}
		<p class="empty">Sin cuotas vencidas</p>
	{:else}
		<div class="aging-rows">
			{#each buckets as bucket}
				<div class="aging-row">
					<span class="aging-label">{bucket.label}</span>
					<div class="bar-track">
						<div
							class="bar-fill"
							style="width: {pct(bucket.amount)}%; background: {bucket.color};"
						></div>
					</div>
					<span class="aging-amount" style="color: {bucket.color};">
						{displayAmount(bucket.amount)}
					</span>
				</div>
			{/each}
		</div>

		{#if cuotaMasAntigua}
			<p class="oldest">
				Cuota más antigua: <strong>{cuotaMasAntigua}</strong>
			</p>
		{/if}
	{/if}
</div>

<style>
	.aging-card {
		padding: 1.5rem;
	}

	.section-title {
		font-family: 'Cinzel', Georgia, serif;
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-brand);
		margin: 0 0 1.25rem;
	}

	.aging-rows {
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}

	.aging-row {
		display: grid;
		grid-template-columns: 6rem 1fr 10rem;
		align-items: center;
		gap: 0.75rem;
	}

	.aging-label {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		white-space: nowrap;
	}

	.bar-track {
		height: 6px;
		background: var(--color-surface-2);
		border-radius: 3px;
		overflow: hidden;
	}

	.bar-fill {
		height: 100%;
		border-radius: 3px;
		transition: width 400ms ease;
	}

	.aging-amount {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.8rem;
		font-variant-numeric: tabular-nums;
		text-align: right;
	}

	.oldest {
		margin: 1rem 0 0;
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	.oldest strong {
		color: var(--color-text-secondary);
	}

	.empty {
		color: var(--color-text-muted);
		font-size: 0.875rem;
	}
</style>
```

- [ ] **Step 2: Type check**

```bash
pnpm check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/dashboard/DashboardAging.svelte
git commit -m "feat(dashboard): add DashboardAging component with colored CSS bars"
```

---

### Task 6: DashboardCartera — portfolio metrics

**Files:**
- Create: `src/lib/components/dashboard/DashboardCartera.svelte`

**Interfaces:**
- Consumes: `saldoPendienteTotalARS`, `porcentajeCobrado`, `valorTotalCarteraARS: number`, `displayAmount: (ars: number) => string`
- Produces: 3-metric card + progress bar

- [ ] **Step 1: Create component**

Create `src/lib/components/dashboard/DashboardCartera.svelte`:

```svelte
<script lang="ts">
	let {
		saldoPendienteTotalARS,
		porcentajeCobrado,
		valorTotalCarteraARS,
		displayAmount
	}: {
		saldoPendienteTotalARS: number;
		porcentajeCobrado: number;
		valorTotalCarteraARS: number;
		displayAmount: (ars: number) => string;
	} = $props();

	const pct = $derived(Math.min(100, Math.max(0, porcentajeCobrado)));
</script>

<div class="card cartera-card">
	<h2 class="section-title">Cartera</h2>

	<div class="metrics">
		<div class="metric">
			<span class="metric-label">Valor total</span>
			<span class="metric-value">{displayAmount(valorTotalCarteraARS)}</span>
		</div>
		<div class="metric">
			<span class="metric-label">Saldo pendiente</span>
			<span class="metric-value" style="color: var(--color-vencida);">
				{displayAmount(saldoPendienteTotalARS)}
			</span>
		</div>
		<div class="metric progress-metric">
			<span class="metric-label">% cobrado</span>
			<span class="metric-value" style="color: var(--color-pagada);">
				{pct.toFixed(1)}%
			</span>
			<div class="progress-track">
				<div class="progress-fill" style="width: {pct}%;"></div>
			</div>
		</div>
	</div>
</div>

<style>
	.cartera-card {
		padding: 1.5rem;
	}

	.section-title {
		font-family: 'Cinzel', Georgia, serif;
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-brand);
		margin: 0 0 1.25rem;
	}

	.metrics {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.metric {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.metric-label {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.metric-value {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 1.1rem;
		font-variant-numeric: tabular-nums;
		color: var(--color-text-primary);
	}

	.progress-track {
		height: 4px;
		background: var(--color-surface-2);
		border-radius: 2px;
		margin-top: 0.4rem;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: var(--color-pagada);
		border-radius: 2px;
		transition: width 400ms ease;
	}
</style>
```

- [ ] **Step 2: Type check**

```bash
pnpm check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/dashboard/DashboardCartera.svelte
git commit -m "feat(dashboard): add DashboardCartera portfolio metrics component"
```

---

### Task 7: DashboardTendencia — monthly bar chart

**Files:**
- Create: `src/lib/components/dashboard/DashboardTendencia.svelte`

**Interfaces:**
- Consumes: `tendenciaMensual: TendenciaMes[]`, `selectedCurrency: { name: string; value: number }`; `fromARS` from `$lib/utils/currency`
- Produces: chart.js Bar chart showing last 12 months of collections

- [ ] **Step 1: Create component**

Create `src/lib/components/dashboard/DashboardTendencia.svelte`:

```svelte
<script lang="ts">
	import type { TendenciaMes } from '$lib/types/dashboard.types';
	import { fromARS } from '$lib/utils/currency';
	import {
		BarElement,
		CategoryScale,
		Chart as ChartJS,
		LinearScale,
		Tooltip
	} from 'chart.js';
	import { Bar } from 'svelte-chartjs';

	ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

	let {
		tendenciaMensual,
		selectedCurrency
	}: {
		tendenciaMensual: TendenciaMes[];
		selectedCurrency: { name: string; value: number };
	} = $props();

	const chartData = $derived({
		labels: tendenciaMensual.map((t) => t.mes),
		datasets: [
			{
				data: tendenciaMensual.map((t) =>
					selectedCurrency.name === 'ARS' ? t.cobradoARS : fromARS(t.cobradoARS, selectedCurrency.value)
				),
				backgroundColor: '#d43124',
				borderRadius: 3,
				borderSkipped: false
			}
		]
	});

	const chartOptions = $derived({
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: { display: false },
			tooltip: {
				callbacks: {
					label: (ctx: { parsed: { y: number } }) =>
						` ${selectedCurrency.name} ${ctx.parsed.y.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
				}
			}
		},
		scales: {
			x: {
				grid: { display: false },
				ticks: { color: '#a8a8a8', font: { family: 'IBM Plex Mono', size: 11 } }
			},
			y: {
				grid: { color: '#2a2a2a' },
				ticks: {
					color: '#a8a8a8',
					font: { family: 'IBM Plex Mono', size: 11 },
					callback: (value: number | string) =>
						Number(value).toLocaleString('es-AR', { maximumFractionDigits: 0 })
				}
			}
		}
	});
</script>

<div class="card tendencia-card">
	<h2 class="section-title">Cobranza mensual</h2>
	{#if tendenciaMensual.length === 0}
		<p class="empty">Sin datos de cobranza</p>
	{:else}
		<div class="chart-wrap">
			<Bar data={chartData} options={chartOptions} />
		</div>
	{/if}
</div>

<style>
	.tendencia-card {
		padding: 1.5rem;
	}

	.section-title {
		font-family: 'Cinzel', Georgia, serif;
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-brand);
		margin: 0 0 1.25rem;
	}

	.chart-wrap {
		height: 260px;
		position: relative;
	}

	.empty {
		color: var(--color-text-muted);
		font-size: 0.875rem;
	}
</style>
```

- [ ] **Step 2: Type check**

```bash
pnpm check
```

Expected: no errors. If chart.js types error, check that `pnpm add svelte-chartjs chart.js` ran in Task 1.

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/dashboard/DashboardTendencia.svelte
git commit -m "feat(dashboard): add DashboardTendencia bar chart component"
```

---

### Task 8: DashboardProximos + DashboardTopDeuda — action lists

**Files:**
- Create: `src/lib/components/dashboard/DashboardProximos.svelte`
- Create: `src/lib/components/dashboard/DashboardTopDeuda.svelte`

**Interfaces:**
- `DashboardProximos` consumes: `proximosVencimientos: ProximoVencimiento[]`, `displayAmount: (ars: number) => string`
- `DashboardTopDeuda` consumes: `topCasosDeuda: TopCasoDeuda[]`, `displayAmount: (ars: number) => string`

- [ ] **Step 1: Create DashboardProximos**

Create `src/lib/components/dashboard/DashboardProximos.svelte`:

```svelte
<script lang="ts">
	import type { ProximoVencimiento } from '$lib/types/dashboard.types';

	let {
		proximosVencimientos,
		displayAmount
	}: {
		proximosVencimientos: ProximoVencimiento[];
		displayAmount: (ars: number) => string;
	} = $props();
</script>

<div class="card list-card">
	<h2 class="section-title">Vencimientos esta semana</h2>

	{#if proximosVencimientos.length === 0}
		<p class="empty">Sin vencimientos esta semana</p>
	{:else}
		<ul class="item-list">
			{#each proximosVencimientos as item (item.caseId + item.dueDate)}
				<li class="item">
					<div class="item-main">
						<span class="item-name">{item.clientName}</span>
						<span class="item-desc">{item.description}</span>
					</div>
					<div class="item-right">
						<span class="item-date" style="color: var(--color-proximo);">{item.dueDate}</span>
						<span class="item-amount">{displayAmount(item.arsAmount)}</span>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.list-card {
		padding: 1.5rem;
	}

	.section-title {
		font-family: 'Cinzel', Georgia, serif;
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-brand);
		margin: 0 0 1rem;
	}

	.item-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	.item {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		padding: 0.625rem 0;
		border-bottom: 1px solid var(--color-border);
	}

	.item:last-child {
		border-bottom: none;
	}

	.item-main {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		min-width: 0;
	}

	.item-name {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.item-desc {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.item-right {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.15rem;
		flex-shrink: 0;
	}

	.item-date {
		font-size: 0.75rem;
		font-family: 'IBM Plex Mono', monospace;
	}

	.item-amount {
		font-size: 0.8rem;
		font-family: 'IBM Plex Mono', monospace;
		font-variant-numeric: tabular-nums;
		color: var(--color-text-secondary);
	}

	.empty {
		color: var(--color-text-muted);
		font-size: 0.875rem;
	}
</style>
```

- [ ] **Step 2: Create DashboardTopDeuda**

Create `src/lib/components/dashboard/DashboardTopDeuda.svelte`:

```svelte
<script lang="ts">
	import type { TopCasoDeuda } from '$lib/types/dashboard.types';

	let {
		topCasosDeuda,
		displayAmount
	}: {
		topCasosDeuda: TopCasoDeuda[];
		displayAmount: (ars: number) => string;
	} = $props();

	const max = $derived(Math.max(...topCasosDeuda.map((c) => c.deudaVencidaARS), 1));
</script>

<div class="card list-card">
	<h2 class="section-title">Top deuda vencida</h2>

	{#if topCasosDeuda.length === 0}
		<p class="empty">Sin deuda vencida</p>
	{:else}
		<ul class="item-list">
			{#each topCasosDeuda as item, i (item.caseId)}
				<li class="item">
					<span class="rank">{i + 1}</span>
					<div class="item-main">
						<span class="item-name">{item.clientName}</span>
						<div class="bar-track">
							<div
								class="bar-fill"
								style="width: {(item.deudaVencidaARS / max) * 100}%;"
							></div>
						</div>
					</div>
					<span class="item-amount" style="color: var(--color-vencida);">
						{displayAmount(item.deudaVencidaARS)}
					</span>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.list-card {
		padding: 1.5rem;
	}

	.section-title {
		font-family: 'Cinzel', Georgia, serif;
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-brand);
		margin: 0 0 1rem;
	}

	.item-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.item {
		display: grid;
		grid-template-columns: 1.25rem 1fr auto;
		align-items: center;
		gap: 0.75rem;
	}

	.rank {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.75rem;
		color: var(--color-text-muted);
		text-align: right;
	}

	.item-main {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		min-width: 0;
	}

	.item-name {
		font-size: 0.875rem;
		color: var(--color-text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.bar-track {
		height: 3px;
		background: var(--color-surface-2);
		border-radius: 2px;
		overflow: hidden;
	}

	.bar-fill {
		height: 100%;
		background: var(--color-vencida);
		border-radius: 2px;
	}

	.item-amount {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.8rem;
		font-variant-numeric: tabular-nums;
		flex-shrink: 0;
	}

	.empty {
		color: var(--color-text-muted);
		font-size: 0.875rem;
	}
</style>
```

- [ ] **Step 3: Type check**

```bash
pnpm check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/dashboard/DashboardProximos.svelte src/lib/components/dashboard/DashboardTopDeuda.svelte
git commit -m "feat(dashboard): add DashboardProximos and DashboardTopDeuda action list components"
```

---

### Task 9: +page.svelte — layout, currency selector, wiring

**Files:**
- Create: `src/routes/dashboard/+page.svelte`

**Interfaces:**
- Consumes: `data.dashboard: DashboardData`, `data.currencies: CurrencyMeta[]` (from layout); all 6 dashboard sub-components; `fromARS`, `formatAmount` from `$lib/utils/currency`
- Produces: rendered dashboard route

The page holds `$state selectedCurrency`. A synthetic ARS option (`{ id: 0, name: 'ARS', value: 1, isDefault: false }`) is appended to the currency list in the selector. `displayAmount(arsAmount)` converts + formats based on selection.

- [ ] **Step 1: Create +page.svelte**

Create `src/routes/dashboard/+page.svelte`:

```svelte
<script lang="ts">
	import DashboardAging from '$lib/components/dashboard/DashboardAging.svelte';
	import DashboardCartera from '$lib/components/dashboard/DashboardCartera.svelte';
	import DashboardHero from '$lib/components/dashboard/DashboardHero.svelte';
	import DashboardProximos from '$lib/components/dashboard/DashboardProximos.svelte';
	import DashboardTendencia from '$lib/components/dashboard/DashboardTendencia.svelte';
	import DashboardTopDeuda from '$lib/components/dashboard/DashboardTopDeuda.svelte';
	import { formatAmount, fromARS } from '$lib/utils/currency';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type CurrencyOption = { id: number; name: string; value: number; isDefault: boolean };

	// ARS is the pivot (rate = 1) — synthetic, not in DB
	const ARS_OPTION: CurrencyOption = { id: 0, name: 'ARS', value: 1, isDefault: false };
	const currencyOptions: CurrencyOption[] = [...data.currencies, ARS_OPTION];

	let selectedCurrency = $state<CurrencyOption>(
		data.currencies.find((c) => c.isDefault) ?? data.currencies[0] ?? ARS_OPTION
	);

	function displayAmount(arsAmount: number): string {
		if (selectedCurrency.name === 'ARS') {
			return `$ ${arsAmount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
		}
		const converted = fromARS(arsAmount, selectedCurrency.value);
		return formatAmount(converted, selectedCurrency.name);
	}
</script>

<div class="dashboard">
	<div class="dashboard-header">
		<h1 class="dashboard-title">Dashboard</h1>
		<div class="currency-selector" role="group" aria-label="Moneda">
			{#each currencyOptions as currency (currency.id)}
				<button
					class="currency-btn"
					class:active={selectedCurrency.name === currency.name}
					onclick={() => (selectedCurrency = currency)}
				>
					{currency.name}
				</button>
			{/each}
		</div>
	</div>

	<DashboardHero
		cobradoEsteMesARS={data.dashboard.cobradoEsteMesARS}
		porCobrarEsteMesARS={data.dashboard.porCobrarEsteMesARS}
		totalVencidoARS={data.dashboard.totalVencidoARS}
		casosActivos={data.dashboard.casosActivos}
		{displayAmount}
	/>

	<div class="mid-grid">
		<DashboardAging
			aging={data.dashboard.aging}
			cuotaMasAntigua={data.dashboard.cuotaMasAntigua}
			{displayAmount}
		/>
		<DashboardCartera
			saldoPendienteTotalARS={data.dashboard.saldoPendienteTotalARS}
			porcentajeCobrado={data.dashboard.porcentajeCobrado}
			valorTotalCarteraARS={data.dashboard.valorTotalCarteraARS}
			{displayAmount}
		/>
	</div>

	<DashboardTendencia
		tendenciaMensual={data.dashboard.tendenciaMensual}
		{selectedCurrency}
	/>

	<div class="bottom-grid">
		<DashboardProximos
			proximosVencimientos={data.dashboard.proximosVencimientos}
			{displayAmount}
		/>
		<DashboardTopDeuda
			topCasosDeuda={data.dashboard.topCasosDeuda}
			{displayAmount}
		/>
	</div>
</div>

<style>
	.dashboard {
		padding: 1.5rem 1rem 3rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		max-width: 1280px;
		margin: 0 auto;
	}

	.dashboard-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.dashboard-title {
		font-family: 'Cinzel', Georgia, serif;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-editorial);
		margin: 0;
	}

	.currency-selector {
		display: flex;
		gap: 0.25rem;
		background: var(--color-surface-1);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		padding: 0.25rem;
	}

	.currency-btn {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.75rem;
		font-weight: 500;
		letter-spacing: 0.03em;
		padding: 0.3rem 0.75rem;
		border: none;
		border-radius: 4px;
		background: transparent;
		color: var(--color-text-muted);
		cursor: pointer;
		transition: background 150ms ease, color 150ms ease;
	}

	.currency-btn:hover {
		color: var(--color-text-secondary);
	}

	.currency-btn.active {
		background: var(--color-brand);
		color: #fff;
	}

	.mid-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.25rem;
	}

	.bottom-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.25rem;
	}

	@media (max-width: 768px) {
		.mid-grid,
		.bottom-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
```

- [ ] **Step 2: Type check**

```bash
pnpm check
```

Expected: no errors.

- [ ] **Step 3: Smoke test in browser**

```bash
pnpm dev
```

Navigate to `http://localhost:5173/dashboard`. Verify:
- Page loads without console errors
- 4 KPI cards render (may show 0 if DB empty)
- Currency selector buttons appear
- Clicking JUS/USD/EUR/ARS switches displayed amounts

- [ ] **Step 4: Commit**

```bash
git add src/routes/dashboard/+page.svelte
git commit -m "feat(dashboard): add dashboard page with currency toggle"
```

---

### Task 10: Navigation — login redirect + BurgerBar link

**Files:**
- Modify: `src/routes/login/+page.server.ts` (lines 8 and 32)
- Modify: `src/lib/components/BurgerBar.svelte`

**Interfaces:**
- No new interfaces — navigation changes only

- [ ] **Step 1: Update login redirects**

In `src/routes/login/+page.server.ts`, change **both** redirect targets from `'/'` to `'/dashboard'`:

Line 8 — already-logged-in redirect:
```typescript
// Before:
throw redirect(302, '/');
// After:
throw redirect(302, '/dashboard');
```

Line 32 — post-login action redirect:
```typescript
// Before:
throw redirect(302, '/');
// After:
throw redirect(302, '/dashboard');
```

The file should look like:

```typescript
import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { loginUser } from '$lib/user.model';

export const load: PageServerLoad = (event) => {
	const user = event.locals.user;
	if (user) {
		throw redirect(302, '/dashboard');
	}
};

export const actions: Actions = {
	default: async (event) => {
		const formData = Object.fromEntries(await event.request.formData());
		const { name, password } = formData as { name: string; password: string };

		const { error, token, jwtUser: user } = await loginUser(name, password);
		if (error) {
			return {
				status: 401,
				message: error
			};
		}
		event.cookies.set('AuthorizationToken', `Bearer ${token}`, {
			httpOnly: true,
			path: '/',
			secure: true,
			sameSite: 'strict',
			maxAge: 60 * 60 * 24 * 5
		});
		throw redirect(302, '/dashboard');
	}
};
```

- [ ] **Step 2: Add Dashboard link to BurgerBar**

In `src/lib/components/BurgerBar.svelte`, add `LayoutDashboard` to imports and insert a Dashboard item as the first item in the dropdown, before "Nuevo caso":

```svelte
<script lang="ts">
	import type { Role } from '@prisma/client';
	import type { ModalContext } from '$lib/types/modal.types';
	import { getContext } from 'svelte';
	import { DropdownMenu } from 'bits-ui';
	import { ChevronDown, FilePlus, LayoutDashboard, Scale, UserPlus, History, LogOut } from '@lucide/svelte';

	let { user }: { user: { id: number; name: string; role: Role } } = $props();

	const { openNewCase, openCurrencies } = getContext<ModalContext>('modals');

	let logoutForm = $state<HTMLFormElement | undefined>();
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<button {...props} class="btn btn-ghost btn-sm">
				Acciones
				<ChevronDown size={14} />
			</button>
		{/snippet}
	</DropdownMenu.Trigger>

	<DropdownMenu.Portal>
		<DropdownMenu.Content class="dropdown-content" sideOffset={6} align="end">
			<DropdownMenu.Item class="dropdown-item">
				{#snippet child({ props })}
					<a {...props} href="/dashboard">
						<LayoutDashboard size={14} />
						Dashboard
					</a>
				{/snippet}
			</DropdownMenu.Item>

			<DropdownMenu.Separator class="dropdown-separator" />

			<DropdownMenu.Item class="dropdown-item" onSelect={openNewCase}>
				<FilePlus size={14} />
				Nuevo caso
			</DropdownMenu.Item>

			<DropdownMenu.Item class="dropdown-item" onSelect={openCurrencies}>
				<Scale size={14} />
				Monedas
			</DropdownMenu.Item>

			{#if user.role === 'ADMIN'}
				<DropdownMenu.Separator class="dropdown-separator" />
				<DropdownMenu.Item class="dropdown-item">
					{#snippet child({ props })}
						<a {...props} href="/signup">
							<UserPlus size={14} />
							Alta Usuario
						</a>
					{/snippet}
				</DropdownMenu.Item>
				<DropdownMenu.Item class="dropdown-item">
					{#snippet child({ props })}
						<a {...props} href="/historial">
							<History size={14} />
							Historial
						</a>
					{/snippet}
				</DropdownMenu.Item>
			{/if}

			<DropdownMenu.Separator class="dropdown-separator" />

			<form method="POST" action="/logout" bind:this={logoutForm} style="display:contents">
				<DropdownMenu.Item class="dropdown-item danger" onSelect={() => logoutForm?.submit()}>
					<LogOut size={14} />
					Cerrar sesión
				</DropdownMenu.Item>
			</form>
		</DropdownMenu.Content>
	</DropdownMenu.Portal>
</DropdownMenu.Root>
```

- [ ] **Step 3: Type check**

```bash
pnpm check
```

Expected: no errors.

- [ ] **Step 4: Full smoke test**

```bash
pnpm dev
```

Verify:
- Logging in redirects to `/dashboard`
- Visiting `/login` when already logged in redirects to `/dashboard`
- BurgerBar dropdown shows "Dashboard" as first item
- Clicking Dashboard in menu navigates to `/dashboard`
- `/` (cases table) still works from direct navigation

- [ ] **Step 5: Commit**

```bash
git add src/routes/login/+page.server.ts src/lib/components/BurgerBar.svelte
git commit -m "feat(dashboard): redirect login to dashboard, add nav link"
```
