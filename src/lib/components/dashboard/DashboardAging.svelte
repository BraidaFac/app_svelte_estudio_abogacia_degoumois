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
		font-family: 'IBM Plex Sans', sans-serif;
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-proximo);
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
