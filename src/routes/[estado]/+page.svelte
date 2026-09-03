<script lang="ts">
	import BackToTop from '$lib/components/BackToTop.svelte';
	import TableFilters from '$lib/components/TableFilters.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	import { createTableStore } from '$lib/stores/table.svelte';
	import type { ModalContext } from '$lib/types/modal.types';
	import { formatAmount } from '$lib/utils/currency';
	import { page } from '$app/state';
	import { getContext } from 'svelte';
	import type { PageData } from './$types';
	import { AlertCircle, Clock, CheckCircle, ArrowLeft, CreditCard, PackageCheck, Info, X, MoreVertical, ArrowUp, ArrowDown } from '@lucide/svelte';
	import { invalidateAll } from '$app/navigation';

	let { data }: { data: PageData } = $props();
	let cases = $derived(data.cases);

	const table = createTableStore(() => cases, 25);

	const param = (page.params.estado ?? '').toUpperCase();

	const { openToPay, openDetails } = getContext<ModalContext>('modals');

	const statusConfig: Record<
		string,
		{
			title: string;
			rowClass: string;
			badgeClass: string;
			label: string;
			icon: typeof AlertCircle;
		}
	> = {
		VENCIDO: {
			title: 'Cuotas vencidas',
			rowClass: 'row-vencida',
			badgeClass: 'badge-vencida',
			label: 'Vencida',
			icon: AlertCircle
		},
		PROXIMO: {
			title: 'Cuotas por vencer',
			rowClass: 'row-proximo',
			badgeClass: 'badge-proximo',
			label: 'Por vencer',
			icon: Clock
		},
		ATIEMPO: {
			title: 'Cuotas al día',
			rowClass: 'row-atiempo',
			badgeClass: 'badge-atiempo',
			label: 'Al día',
			icon: CheckCircle
		}
	};

	const config = statusConfig[param] ?? statusConfig['ATIEMPO'];
	const StatusIcon = $derived(config.icon);

	let quickCloseDialog = $state<HTMLDialogElement | undefined>();
	let quickCloseCaso = $state<(typeof cases)[0] | null>(null);
	let quickCollector = $state('');
	let quickLoading = $state(false);
	let quickResult = $state<{ success: boolean; message: string } | null>(null);

	function quickClose(caso: (typeof cases)[0]) {
		quickCloseCaso = caso;
		quickCollector = '';
		quickResult = null;
		quickCloseDialog?.showModal();
	}

	let openMenuId = $state<number | null>(null);
	let menuPos = $state({ top: 0, left: 0 });

	function toggleMenu(id: number, e: MouseEvent) {
		e.stopPropagation();
		if (openMenuId === id) { openMenuId = null; return; }
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		menuPos = { top: rect.bottom + 4, left: rect.right - 160 };
		openMenuId = id;
	}

	function closeMenu() { openMenuId = null; }

	async function submitQuickClose() {
		if (!quickCloseCaso || !quickCollector.trim()) return;
		quickLoading = true;
		const data = new FormData();
		data.append('caseId', quickCloseCaso.id.toString());
		data.append('action', 'cerrar');
		data.append('collector', quickCollector.trim());
		const response = await fetch('/api/updateCase', { method: 'POST', body: data });
		quickLoading = false;
		if (response.status !== 200) {
			quickResult = { success: false, message: (await response.json()).error?.message || 'Error al cerrar caso' };
		} else {
			quickResult = { success: true, message: 'Caso cerrado correctamente' };
			invalidateAll();
		}
	}
</script>

<svelte:window onclick={closeMenu} />
<BackToTop />

<section class="p-4 md:p-6">
	<div class="section-header">
		<a href="/" class="back-btn" aria-label="Volver">
			<ArrowLeft size={16} />
		</a>
		<h2 class="section-title">{config.title}</h2>
		<span class="badge {config.badgeClass}">
			<StatusIcon size={13} />
			{cases.length} caso{cases.length !== 1 ? 's' : ''}
		</span>
	</div>

	{#if cases.length > 0}
		<TableFilters store={table} />
	{/if}

	{#if cases.length === 0}
		<div class="empty-state">
			<span style="color: #6e6e6e;">No hay casos en esta categoría</span>
		</div>
	{:else if table.paginatedItems.length === 0}
		<div class="empty-state">
			<span style="color: #6e6e6e;">Sin resultados para <strong>"{table.search}"</strong></span>
		</div>
	{:else}
		<div class="overflow-x-auto">
			<table class="er-table" style="min-width: 760px;">
				<thead>
					<tr>
						<th>Estado</th>
						<th class="th-sort" onclick={() => table.toggleSort('description')}>
							Descripción
							<span class="sort-icon" class:active={table.sortKey === 'description'}>
								{#if table.sortKey === 'description' && table.sortDir === 'desc'}<ArrowDown size={11} />{:else}<ArrowUp size={11} />{/if}
							</span>
						</th>
						<th class="th-sort" onclick={() => table.toggleSort('clientName')}>
							Cliente
							<span class="sort-icon" class:active={table.sortKey === 'clientName'}>
								{#if table.sortKey === 'clientName' && table.sortDir === 'desc'}<ArrowDown size={11} />{:else}<ArrowUp size={11} />{/if}
							</span>
						</th>
						<th class="col-numeric th-sort" onclick={() => table.toggleSort('restAmount')}>
							A saldar
							<span class="sort-icon" class:active={table.sortKey === 'restAmount'}>
								{#if table.sortKey === 'restAmount' && table.sortDir === 'desc'}<ArrowDown size={11} />{:else}<ArrowUp size={11} />{/if}
							</span>
						</th>
						<th class="col-numeric">Cuotas</th>
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
						<tr class={config.rowClass}>
							<td class="status-cell">
								<div class="status-inner">
									<StatusIcon size={12} />
									{config.label}
								</div>
							</td>
							<td class="col-desc"><div class="desc-scroll">{caso.description}</div></td>
							<td>{caso.clientName}</td>
							<td class="col-numeric">{formatAmount(caso.restAmount, caso.currency.name)}</td>
							<td class="col-numeric">{caso.quantityPaymentsToPay}/{caso.payments.length}</td>
							<td>{caso.dueDate ?? '—'}</td>
							<td class="col-actions">
								<button class="kebab-btn" onclick={(e) => toggleMenu(caso.id, e)}>
									<MoreVertical size={15} />
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
</section>

{#if openMenuId !== null}
	{@const caso = cases.find(c => c.id === openMenuId)!}
	<div class="dropdown-menu" style="top: {menuPos.top}px; left: {menuPos.left}px;" onclick={(e) => e.stopPropagation()}>
		<button onclick={() => { openToPay(caso); closeMenu(); }}>
			<CreditCard size={13} /> Cobrar cuota
		</button>
		<button onclick={() => { quickClose(caso); closeMenu(); }}>
			<PackageCheck size={13} /> Cobrar todo
		</button>
		<button onclick={() => { openDetails(caso); closeMenu(); }}>
			<Info size={13} /> Ver detalles
		</button>
	</div>
{/if}

<!-- Quick close dialog -->
<dialog bind:this={quickCloseDialog} onclick={(e) => { if (e.target === e.currentTarget) quickCloseDialog?.close(); }}>
	<div class="modal-panel modal-panel-sm">
		<div class="modal-header">
			<h2 class="modal-title">Cobrar todo</h2>
			<button class="modal-icon-btn" onclick={() => quickCloseDialog?.close()} aria-label="Cerrar"><X size={18} /></button>
		</div>
		{#if quickResult}
			<p class={quickResult.success ? 'text-success-msg' : 'text-error'} style="margin-bottom: 1rem;">{quickResult.message}</p>
			<div style="display: flex; justify-content: flex-end;">
				<button class="btn btn-ghost" onclick={() => quickCloseDialog?.close()}>Cerrar</button>
			</div>
		{:else if quickLoading}
			<div class="spinner-wrap"><div class="er-spinner"></div></div>
		{:else}
			<p style="color: #a8a8a8; margin-bottom: 1.25rem;">
				Se marcarán todas las cuotas pendientes de <strong style="color: #f5f5f5;">{quickCloseCaso?.description}</strong> como cobradas.
			</p>
			<div class="label" style="margin-bottom: 1.25rem;">
				<span>Cobrador</span>
				<input class="input" type="text" placeholder="Nombre del cobrador" bind:value={quickCollector} />
			</div>
			<div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
				<button class="btn btn-ghost" onclick={() => quickCloseDialog?.close()}>Cancelar</button>
				<button class="btn btn-success" disabled={!quickCollector.trim()} onclick={submitQuickClose}>Confirmar</button>
			</div>
		{/if}
	</div>
</dialog>

<style>
	.section-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1.25rem;
	}

	.back-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		color: #6e6e6e;
		background: transparent;
		border: 1px solid #2e2e2e;
		border-radius: 4px;
		padding: 0.3rem;
		line-height: 0;
		text-decoration: none;
		flex-shrink: 0;
		transition: color 150ms ease, border-color 150ms ease, background-color 150ms ease;
	}

	.back-btn:hover {
		color: #f5f5f5;
		border-color: #3e3e3e;
		background: #1a1a1a;
	}

	.section-title {
		font-family: 'Cinzel', Georgia, serif;
		font-size: 1.25rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		color: #f5f5f5;
		margin: 0;
	}


	.empty-cell {
		text-align: center;
		padding: 3rem 1rem;
	}

	.col-desc { max-width: 200px; }

	.desc-scroll {
		max-width: 200px;
		white-space: nowrap;
		overflow-x: auto;
		scrollbar-width: thin;
		scrollbar-color: #3e3e3e transparent;
	}

	.desc-scroll::-webkit-scrollbar { height: 3px; }
	.desc-scroll::-webkit-scrollbar-track { background: transparent; }
	.desc-scroll::-webkit-scrollbar-thumb { background: #3e3e3e; border-radius: 99px; transition: background 150ms ease; }
	.desc-scroll:hover::-webkit-scrollbar-thumb { background: #606060; }

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

	.kebab-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 4px;
		border: 1px solid #2e2e2e;
		background: transparent;
		color: #6e6e6e;
		cursor: pointer;
		line-height: 0;
		transition: background-color 120ms ease, color 120ms ease;
	}

	.kebab-btn:hover { background: #1a1a1a; color: #f5f5f5; }

	.dropdown-menu {
		position: fixed;
		z-index: 1000;
		background: #141414;
		border: 1px solid #2e2e2e;
		border-radius: 6px;
		min-width: 160px;
		padding: 0.25rem;
		display: flex;
		flex-direction: column;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
	}

	.dropdown-menu button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.5rem 0.75rem;
		background: transparent;
		border: none;
		border-radius: 4px;
		color: #c0c0c0;
		cursor: pointer;
		font-size: 0.8rem;
		text-align: left;
		transition: background 120ms ease, color 120ms ease;
	}

	.dropdown-menu button:hover {
		background: #2a2a2a;
		color: #f5f5f5;
	}
</style>
