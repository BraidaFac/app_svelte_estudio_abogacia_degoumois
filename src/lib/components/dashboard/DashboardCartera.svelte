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
		font-family: 'IBM Plex Sans', sans-serif;
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-proximo);
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
