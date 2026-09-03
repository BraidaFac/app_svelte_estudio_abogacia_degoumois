<script lang="ts">
	const PAGE_SIZE_OPTIONS = [10, 25, 50];

	let {
		currentPage,
		totalPages,
		goToPage,
		pageSize,
		onPageSizeChange
	}: {
		currentPage: number;
		totalPages: number;
		goToPage: (page: number) => void;
		pageSize: number;
		onPageSizeChange: (size: number) => void;
	} = $props();
</script>

<div class="pagination-bar">
	<div class="page-size-wrap">
		<span class="page-size-label">Filas:</span>
		<select
			class="page-size-select"
			value={pageSize}
			onchange={(e) => onPageSizeChange(Number((e.target as HTMLSelectElement).value))}
		>
			{#each PAGE_SIZE_OPTIONS as opt (opt)}
				<option value={opt}>{opt}</option>
			{/each}
		</select>
	</div>

	{#if totalPages > 1}
		<div class="pagination">
			<button
				class="btn btn-ghost btn-sm"
				disabled={currentPage === 1}
				onclick={() => goToPage(currentPage - 1)}
			>
				← Anterior
			</button>
			<span class="pagination-info">Página {currentPage} de {totalPages}</span>
			<button
				class="btn btn-ghost btn-sm"
				disabled={currentPage === totalPages}
				onclick={() => goToPage(currentPage + 1)}
			>
				Siguiente →
			</button>
		</div>
	{/if}
</div>

<style>
	.pagination-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 1.25rem;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.page-size-wrap {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.page-size-label {
		font-size: 0.75rem;
		color: #4a4a4a;
	}

	.page-size-select {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid #3a3a3a;
		border-radius: 4px;
		color: #a8a8a8;
		font-size: 0.8125rem;
		padding: 0.2rem 0.4rem;
		cursor: pointer;
		outline: none;
		transition: border-color 180ms ease;
	}

	.page-size-select:focus { border-color: rgba(212, 49, 36, 0.4); }

	.page-size-select option {
		background: #141414;
		color: #a8a8a8;
	}

	.pagination {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.pagination-info {
		font-size: 0.875rem;
		color: #a8a8a8;
	}
</style>
