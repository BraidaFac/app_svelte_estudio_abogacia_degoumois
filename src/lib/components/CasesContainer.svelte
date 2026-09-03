<script lang="ts">
	import Pagination from '$lib/components/Pagination.svelte';
	import TableFilters from '$lib/components/TableFilters.svelte';
	import { createTableStore } from '$lib/stores/table.svelte';
	import type { FormattedCase } from '$lib/types/case.types';
	import type { ModalContext } from '$lib/types/modal.types';
	import { formatAmount } from '$lib/utils/currency';
	import { differenceInHours } from 'date-fns';
	import { getContext } from 'svelte';
	import { AlertCircle, Clock, CheckCircle, FileX, CreditCard, Pencil, Info, ArrowUp, ArrowDown } from '@lucide/svelte';

	let { cases }: { cases: FormattedCase[] } = $props();

	const { openToPay, openDetails, openEdit } = getContext<ModalContext>('modals');

	const table = createTableStore(() => cases, 25, 'dueDate', 'asc');

	type RowStatus = 'row-vencida' | 'row-proximo' | 'row-atiempo';
	type BadgeStatus = 'badge-vencida' | 'badge-proximo' | 'badge-atiempo';

	function getStatus(date: string | undefined): {
		rowClass: RowStatus;
		badgeClass: BadgeStatus;
		label: string;
		icon: typeof AlertCircle;
	} {
		if (typeof date !== 'string' || !/^\d{2}-\d{2}-\d{4}$/.test(date)) {
			return { rowClass: 'row-atiempo', badgeClass: 'badge-atiempo', label: 'Al día', icon: CheckCircle };
		}
		const [day, month, year] = date.split('-').map(Number);
		const dateNow = new Date();
		dateNow.setHours(-3, 0, 0, 0);
		const caseDate = new Date(`${year}-${month}-${day}`);
		caseDate.setHours(-3, 0, 0, 0);
		const diff = differenceInHours(caseDate, dateNow);
		if (diff < 0) return { rowClass: 'row-vencida', badgeClass: 'badge-vencida', label: 'Vencida', icon: AlertCircle };
		if (diff < 24 * 5) return { rowClass: 'row-proximo', badgeClass: 'badge-proximo', label: 'Por vencer', icon: Clock };
		return { rowClass: 'row-atiempo', badgeClass: 'badge-atiempo', label: 'Al día', icon: CheckCircle };
	}
</script>

{#if cases.length === 0 && !table.search}
	<div class="empty-state">
		<FileX size={48} strokeWidth={1} style="color: #3e3e3e;" />
		<p>No hay casos activos</p>
	</div>
{:else}
	<div class="overflow-x-auto" style="padding: 0 1rem 2rem;">
		<TableFilters store={table} />

		{#if table.paginatedItems.length === 0}
			<div class="empty-state" style="margin-top: 2rem;">
				<FileX size={36} strokeWidth={1} style="color: #3e3e3e;" />
				<p>Sin resultados para <strong>"{table.search}"</strong></p>
			</div>
		{:else}
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
						<th class="col-numeric th-sort" onclick={() => table.toggleSort('restAmount')}>
							A saldar
							<span class="sort-icon" class:active={table.sortKey === 'restAmount'}>
								{#if table.sortKey === 'restAmount' && table.sortDir === 'desc'}<ArrowDown size={11} />{:else}<ArrowUp size={11} />{/if}
							</span>
						</th>
						<th class="col-numeric th-sort" onclick={() => table.toggleSort('quantityPaymentsToPay')}>
							Cuotas
							<span class="sort-icon" class:active={table.sortKey === 'quantityPaymentsToPay'}>
								{#if table.sortKey === 'quantityPaymentsToPay' && table.sortDir === 'desc'}<ArrowDown size={11} />{:else}<ArrowUp size={11} />{/if}
							</span>
						</th>
						<th class="th-sort" onclick={() => table.toggleSort('dueDate')}>
							Fecha cobro
							<span class="sort-icon" class:active={table.sortKey === 'dueDate'}>
								{#if table.sortKey === 'dueDate' && table.sortDir === 'desc'}<ArrowDown size={11} />{:else}<ArrowUp size={11} />{/if}
							</span>
						</th>
						<th class="col-actions">Acciones</th>
					</tr>
				</thead>
				<tbody>
					{#each table.paginatedItems as caso (caso.id)}
						{@const status = getStatus(caso.dueDate)}
						<tr class={status.rowClass}>
							<td class="status-cell">
								<div class="status-inner">
									<status.icon size={12} />
									{status.label}
								</div>
							</td>
							<td style="color: #a8a8a8;">{caso.caseNumber ?? '—'}</td>
							<td>{caso.description}</td>
							<td style="color: #a8a8a8;">{caso.type}</td>
							<td>{caso.clientName}</td>
							<td style="color: #a8a8a8;">{caso.clientPhone}</td>
							<td class="col-numeric">{formatAmount(caso.restAmount, caso.currency.name)}</td>
							<td class="col-numeric">{caso.quantityPaymentsToPay}/{caso.payments.length}</td>
							<td>{caso.dueDate ?? '—'}</td>
							<td class="col-actions">
								<div class="action-icons">
									<button class="action-btn success" onclick={() => openToPay(caso)} title="Cobrar cuota">
										<CreditCard size={15} />
									</button>
									<button class="action-btn warning" onclick={() => openEdit(caso)} title="Editar caso">
										<Pencil size={15} />
									</button>
									<button class="action-btn ghost" onclick={() => openDetails(caso)} title="Ver detalles">
										<Info size={15} />
									</button>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>

			<Pagination
				currentPage={table.page}
				totalPages={table.totalPages}
				goToPage={table.goToPage}
				pageSize={table.pageSize}
				onPageSizeChange={(v) => (table.pageSize = v)}
			/>
		{/if}
	</div>
{/if}

<style>
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

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		margin-top: 4rem;
		color: #6e6e6e;
		font-size: 1rem;
	}

	.action-icons {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 0.25rem;
	}

	.action-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border-radius: 4px;
		border: 1px solid transparent;
		background: transparent;
		cursor: pointer;
		line-height: 0;
		transition: background-color 120ms ease, color 120ms ease, border-color 120ms ease;
	}

	.action-btn.success { color: #3fb98a; border-color: rgba(63, 185, 138, 0.2); }
	.action-btn.success:hover { background: rgba(63, 185, 138, 0.12); border-color: rgba(63, 185, 138, 0.4); }

	.action-btn.warning { color: #e6a93c; border-color: rgba(230, 169, 60, 0.2); }
	.action-btn.warning:hover { background: rgba(230, 169, 60, 0.12); border-color: rgba(230, 169, 60, 0.4); }

	.action-btn.ghost { color: #6e6e6e; border-color: #2e2e2e; }
	.action-btn.ghost:hover { background: #1a1a1a; color: #f5f5f5; }
</style>
