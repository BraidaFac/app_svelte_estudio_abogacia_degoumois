<script lang="ts">
	import type { TendenciaDia, TendenciaMes, TendenciaPago } from '$lib/types/dashboard.types';
	import { formatAmount, fromARS } from '$lib/utils/currency';
	import {
		BarElement,
		CategoryScale,
		Chart as ChartJS,
		LinearScale,
		Tooltip
	} from 'chart.js';
	import { Bar } from 'svelte-chartjs';
	import { ChevronLeft } from '@lucide/svelte';

	ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

	let {
		tendenciaMensual,
		selectedCurrency
	}: {
		tendenciaMensual: TendenciaMes[];
		selectedCurrency: { name: string; value: number };
	} = $props();

	type DrillLevel = 'year' | 'month' | 'day';

	let drillLevel = $state<DrillLevel>('year');
	let selectedYr = $state<number | null>(null);
	let selectedMo = $state<number | null>(null);
	let selectedDay = $state<number | null>(null);
	let selectedMesLabel = $state<string | null>(null);
	let dailyData = $state<TendenciaDia[]>([]);
	let paymentData = $state<TendenciaPago[]>([]);
	let drillLoading = $state(false);

	async function drillIntoMonth(idx: number) {
		const { yr, mo, mes } = tendenciaMensual[idx];
		drillLoading = true;
		const res = await fetch(`/api/tendencia?yr=${yr}&mo=${mo}`);
		dailyData = await res.json();
		selectedYr = yr;
		selectedMo = mo;
		selectedMesLabel = mes;
		drillLevel = 'month';
		drillLoading = false;
	}

	async function drillIntoDay(idx: number) {
		const dia = dailyData[idx].dia;
		drillLoading = true;
		const res = await fetch(`/api/tendencia?yr=${selectedYr}&mo=${selectedMo}&day=${dia}`);
		paymentData = await res.json();
		selectedDay = dia;
		drillLevel = 'day';
		drillLoading = false;
	}

	function drillUp() {
		if (drillLevel === 'day') {
			drillLevel = 'month';
			selectedDay = null;
			paymentData = [];
		} else if (drillLevel === 'month') {
			drillLevel = 'year';
			selectedYr = null;
			selectedMo = null;
			selectedMesLabel = null;
			dailyData = [];
		}
	}

	function toDisplay(arsAmount: number): string {
		if (selectedCurrency.name === 'ARS') {
			return `$ ${arsAmount.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
		}
		return formatAmount(fromARS(arsAmount, selectedCurrency.value), selectedCurrency.name);
	}

	function onBarClick(_: unknown, elements: Array<{ index: number }>) {
		if (!elements.length) return;
		const idx = elements[0].index;
		if (drillLevel === 'year') drillIntoMonth(idx);
		else if (drillLevel === 'month') drillIntoDay(idx);
	}

	const chartData = $derived({
		labels:
			drillLevel === 'year'
				? tendenciaMensual.map((t) => t.mes)
				: dailyData.map((d) => String(d.dia)),
		datasets: [
			{
				data:
					drillLevel === 'year'
						? tendenciaMensual.map((t) =>
								selectedCurrency.name === 'ARS'
									? t.cobradoARS
									: fromARS(t.cobradoARS, selectedCurrency.value)
							)
						: dailyData.map((d) =>
								selectedCurrency.name === 'ARS'
									? d.cobradoARS
									: fromARS(d.cobradoARS, selectedCurrency.value)
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
					label: (ctx: { parsed: { y: number | null } }) =>
						` ${selectedCurrency.name} ${(ctx.parsed.y ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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
		},
		onClick: onBarClick
	});

	const breadcrumb = $derived(
		drillLevel === 'year'
			? null
			: drillLevel === 'month'
				? selectedMesLabel
				: `${String(selectedDay).padStart(2, '0')}/${String(selectedMo).padStart(2, '0')}/${selectedYr}`
	);

	const isEmpty = $derived(
		(drillLevel === 'year' && tendenciaMensual.length === 0) ||
		(drillLevel === 'month' && !drillLoading && dailyData.length === 0)
	);
</script>

<div class="card tendencia-card">
	<div class="tendencia-header">
		{#if drillLevel !== 'year'}
			<button class="back-btn" onclick={drillUp} aria-label="Volver">
				<ChevronLeft size={14} />
			</button>
		{/if}
		<h2 class="section-title">
			Cobranza mensual
			{#if breadcrumb}<span class="breadcrumb">/ {breadcrumb}</span>{/if}
		</h2>
	</div>

	{#if drillLoading}
		<div class="loading-wrap"><span class="loading-text">Cargando...</span></div>
	{:else if drillLevel === 'day'}
		{#if paymentData.length === 0}
			<p class="empty">Sin pagos registrados</p>
		{:else}
			<div class="payment-list">
				{#each paymentData as p}
					<div class="payment-row">
						<div class="payment-info">
							<span class="payment-client">{p.clientName}</span>
							<span class="payment-desc">{p.description}</span>
						</div>
						<div class="payment-amounts">
							<span class="payment-native">{p.nativeAmount.toLocaleString('es-AR', { maximumFractionDigits: 3 })} {p.currencyName}</span>
							<span class="payment-converted">{toDisplay(p.cobradoARS)}</span>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{:else if isEmpty}
		<p class="empty">Sin datos de cobranza</p>
	{:else}
		<div class="chart-wrap clickable">
			<Bar data={chartData} options={chartOptions} />
		</div>
	{/if}
</div>

<style>
	.tendencia-card {
		padding: 1.5rem;
	}

	.tendencia-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1.25rem;
	}

	.section-title {
		font-family: 'IBM Plex Sans', sans-serif;
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-proximo);
		margin: 0;
	}

	.breadcrumb {
		color: var(--color-text-muted);
		font-weight: 400;
	}

	.back-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		padding: 0;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		background: transparent;
		color: var(--color-text-muted);
		cursor: pointer;
		flex-shrink: 0;
		transition: background 150ms ease, color 150ms ease;
	}

	.back-btn:hover {
		background: var(--color-surface-1);
		color: var(--color-text-secondary);
	}

	.chart-wrap {
		height: 260px;
		position: relative;
	}

	.chart-wrap.clickable :global(canvas) {
		cursor: pointer;
	}

	.loading-wrap {
		height: 260px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.loading-text {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	.empty {
		color: var(--color-text-muted);
		font-size: 0.875rem;
	}

	.payment-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-height: 260px;
		overflow-y: auto;
	}

	.payment-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		background: var(--color-surface-1);
	}

	.payment-info {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}

	.payment-client {
		font-family: 'IBM Plex Sans', sans-serif;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.payment-desc {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.7rem;
		color: var(--color-text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.payment-amounts {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.125rem;
		flex-shrink: 0;
	}

	.payment-native {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.7rem;
		color: var(--color-text-muted);
	}

	.payment-converted {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}
</style>
