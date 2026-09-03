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
		font-family: 'IBM Plex Sans', sans-serif;
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-proximo);
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
