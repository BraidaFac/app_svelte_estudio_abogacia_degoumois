<script lang="ts">
	import DashboardAging from '$lib/components/dashboard/DashboardAging.svelte';
	import DashboardCartera from '$lib/components/dashboard/DashboardCartera.svelte';
	import DashboardHero from '$lib/components/dashboard/DashboardHero.svelte';
	import DashboardProximos from '$lib/components/dashboard/DashboardProximos.svelte';
	import DashboardTendencia from '$lib/components/dashboard/DashboardTendencia.svelte';
	import DashboardTopDeuda from '$lib/components/dashboard/DashboardTopDeuda.svelte';
	import { formatAmount, fromARS } from '$lib/utils/currency';
	import { untrack } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type CurrencyOption = { id: number; name: string; value: number; isDefault: boolean };

	// ARS is the pivot (rate = 1) — synthetic, not in DB
	const ARS_OPTION: CurrencyOption = { id: 0, name: 'ARS', value: 1, isDefault: false };
	const currencyOptions = $derived([...data.currencies, ARS_OPTION]);

	let selectedCurrency = $state<CurrencyOption>(
		untrack(() => data.currencies.find((c) => c.isDefault) ?? data.currencies[0] ?? ARS_OPTION)
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
