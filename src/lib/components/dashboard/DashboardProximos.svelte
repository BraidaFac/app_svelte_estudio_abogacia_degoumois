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
