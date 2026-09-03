<script lang="ts">
	import BackToTop from '$lib/components/BackToTop.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	import TableFilters from '$lib/components/TableFilters.svelte';
	import { createTableStore } from '$lib/stores/table.svelte';
	import type { ModalContext } from '$lib/types/modal.types';
	import { formatAmount } from '$lib/utils/currency';
	import { getContext } from 'svelte';
	import type { PageData } from './$types';
	import { CheckCircle, Trash2, ArrowUp, ArrowDown } from '@lucide/svelte';

	let { data }: { data: PageData } = $props();
	let cases = $derived(data.cases);

	const { openDetails, openDelete } = getContext<ModalContext>('modals');

	const table = createTableStore(() => cases, 25);
</script>

<BackToTop />

<section class="p-4 md:p-6">
	<div class="section-header">
		<h2 class="section-title">Historial de casos saldados</h2>
		<span class="badge badge-pagada">
			<CheckCircle size={13} />
			{cases.length} caso{cases.length !== 1 ? 's' : ''}
		</span>
	</div>

	{#if cases.length === 0}
		<div class="empty-state">
			<p style="color: #6e6e6e;">No hay casos en el historial</p>
		</div>
	{:else}
		<TableFilters store={table} />

		{#if table.paginatedItems.length === 0}
			<div class="empty-state">
				<p style="color: #6e6e6e;">Sin resultados para <strong>"{table.search}"</strong></p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="er-table" style="min-width: 760px;">
					<thead>
						<tr>
							<th>Estado</th>
							<th class="th-sort" onclick={() => table.toggleSort('caseNumber')}>
								N° Caso
								<span class="sort-icon" class:active={table.sortKey === 'caseNumber'}>
									{#if table.sortKey === 'caseNumber' && table.sortDir === 'desc'}<ArrowDown size={11} />{:else}<ArrowUp size={11} />{/if}
								</span>
							</th>
							<th class="th-sort" onclick={() => table.toggleSort('description')}>
								Descripción
								<span class="sort-icon" class:active={table.sortKey === 'description'}>
									{#if table.sortKey === 'description' && table.sortDir === 'desc'}<ArrowDown size={11} />{:else}<ArrowUp size={11} />{/if}
								</span>
							</th>
							<th class="th-sort" onclick={() => table.toggleSort('type')}>
								Tipo
								<span class="sort-icon" class:active={table.sortKey === 'type'}>
									{#if table.sortKey === 'type' && table.sortDir === 'desc'}<ArrowDown size={11} />{:else}<ArrowUp size={11} />{/if}
								</span>
							</th>
							<th class="th-sort" onclick={() => table.toggleSort('clientName')}>
								Cliente
								<span class="sort-icon" class:active={table.sortKey === 'clientName'}>
									{#if table.sortKey === 'clientName' && table.sortDir === 'desc'}<ArrowDown size={11} />{:else}<ArrowUp size={11} />{/if}
								</span>
							</th>
							<th class="th-sort" onclick={() => table.toggleSort('clientPhone')}>
								Teléfono
								<span class="sort-icon" class:active={table.sortKey === 'clientPhone'}>
									{#if table.sortKey === 'clientPhone' && table.sortDir === 'desc'}<ArrowDown size={11} />{:else}<ArrowUp size={11} />{/if}
								</span>
							</th>
							<th class="col-numeric th-sort" onclick={() => table.toggleSort('amount')}>
								Monto saldado
								<span class="sort-icon" class:active={table.sortKey === 'amount'}>
									{#if table.sortKey === 'amount' && table.sortDir === 'desc'}<ArrowDown size={11} />{:else}<ArrowUp size={11} />{/if}
								</span>
							</th>
							<th class="th-sort" onclick={() => table.toggleSort('created')}>
								Creado
								<span class="sort-icon" class:active={table.sortKey === 'created'}>
									{#if table.sortKey === 'created' && table.sortDir === 'desc'}<ArrowDown size={11} />{:else}<ArrowUp size={11} />{/if}
								</span>
							</th>
							<th class="col-actions">Detalles</th>
							<th class="col-actions">Eliminar</th>
						</tr>
					</thead>
					<tbody>
						{#each table.paginatedItems as caso}
							<tr class="row-pagada">
								<td class="status-cell">
									<div class="status-inner">
										<CheckCircle size={12} />
										Saldado
									</div>
								</td>
								<td style="color: #a8a8a8;">{caso.caseNumber ?? '—'}</td>
								<td>{caso.description}</td>
								<td style="color: #a8a8a8;">{caso.type}</td>
								<td>{caso.clientName}</td>
								<td style="color: #a8a8a8;">{caso.clientPhone}</td>
								<td class="col-numeric">{formatAmount(caso.amount, caso.currency.name)}</td>
								<td>{caso.created}</td>
								<td class="col-actions">
									<button class="btn btn-ghost btn-sm" onclick={() => openDetails(caso)}>
										Ver
									</button>
								</td>
								<td class="col-actions">
									<button class="btn btn-danger btn-sm" onclick={() => openDelete(caso)}>
										<Trash2 size={13} />
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<Pagination
				currentPage={table.page}
				totalPages={table.totalPages}
				goToPage={table.goToPage}
				pageSize={table.pageSize}
				onPageSizeChange={(v) => (table.pageSize = v)}
			/>
		{/if}
	{/if}
</section>

<style>
	.section-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1.25rem;
	}

	.section-title {
		font-family: 'Cinzel', Georgia, serif;
		font-size: 1.25rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		color: #f5f5f5;
		margin: 0;
	}

	.empty-state {
		margin-top: 4rem;
		text-align: center;
	}

	.th-sort {
		cursor: pointer;
		user-select: none;
		white-space: nowrap;
	}

	.th-sort:hover { color: #d0d0d0; }

	.sort-icon {
		display: inline-flex;
		align-items: center;
		margin-left: 0.25rem;
		vertical-align: middle;
		opacity: 0.2;
		transition: opacity 150ms ease;
	}

	.sort-icon.active {
		opacity: 1;
		color: rgba(212, 49, 36, 0.85);
	}

	.th-sort:hover .sort-icon:not(.active) { opacity: 0.5; }
</style>
