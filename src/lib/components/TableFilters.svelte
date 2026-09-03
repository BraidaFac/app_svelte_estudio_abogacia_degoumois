<script lang="ts">
	import type { TableStore } from '$lib/stores/table.svelte';
	import { RotateCcw, Search, X } from '@lucide/svelte';

	let { store }: { store: TableStore } = $props();
</script>

<div class="table-filters">
	<div class="search-wrap">
		<span class="search-icon"><Search size={14} /></span>
		<input
			type="search"
			class="search-input"
			placeholder="Buscar…"
			bind:value={store.search}
		/>
		{#if store.search}
			<button class="clear-btn" onclick={() => (store.search = '')} aria-label="Limpiar búsqueda">
				<X size={13} />
			</button>
		{/if}
	</div>

	<span class="results-count">{store.totalFiltered} resultado{store.totalFiltered !== 1 ? 's' : ''}</span>

	{#if !store.isDefaultSort}
		<button class="reset-btn" onclick={store.resetSort} title="Volver al orden por defecto">
			<RotateCcw size={13} />
			Restablecer orden
		</button>
	{/if}
</div>

<style>
	.table-filters {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0 0 0.75rem;
	}

	.search-wrap {
		position: relative;
		width: 16rem;
		display: flex;
		align-items: center;
	}

	.search-icon {
		position: absolute;
		left: 0.6rem;
		display: flex;
		align-items: center;
		color: #6e6e6e;
		pointer-events: none;
		line-height: 0;
		z-index: 1;
	}

	.search-input {
		width: 100%;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid #3a3a3a;
		border-radius: 5px;
		color: #d0d0d0;
		padding: 0.4rem 2rem 0.4rem 2rem;
		font-family: 'IBM Plex Sans', system-ui, sans-serif;
		font-size: 0.8125rem;
		line-height: 1.5;
		transition: border-color 180ms ease, background 180ms ease;
		outline: none;
	}

	.search-input::placeholder { color: #5a5a5a; }

	.search-input:focus {
		border-color: rgba(212, 49, 36, 0.55);
		background: rgba(255, 255, 255, 0.07);
		color: #f0f0f0;
	}

	.search-wrap:focus-within .search-icon { color: rgba(212, 49, 36, 0.7); }

	.search-input::-webkit-search-cancel-button { display: none; }

	.clear-btn {
		position: absolute;
		right: 0.5rem;
		top: 50%;
		transform: translateY(-50%);
		background: transparent;
		border: none;
		color: #5a5a5a;
		cursor: pointer;
		display: flex;
		padding: 0.15rem;
		border-radius: 3px;
		line-height: 0;
		transition: color 150ms ease;
	}

	.clear-btn:hover { color: #a8a8a8; }

	.results-count {
		font-size: 0.75rem;
		color: #4a4a4a;
		white-space: nowrap;
	}

	.reset-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		margin-left: auto;
		background: transparent;
		border: 1px solid #3a3a3a;
		border-radius: 4px;
		color: #6e6e6e;
		font-size: 0.75rem;
		padding: 0.25rem 0.6rem;
		cursor: pointer;
		transition: color 150ms ease, border-color 150ms ease;
		white-space: nowrap;
	}

	.reset-btn:hover {
		color: #d0d0d0;
		border-color: #5a5a5a;
	}
</style>
