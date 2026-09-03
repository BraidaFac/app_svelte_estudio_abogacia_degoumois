<script lang="ts">
	import BackToTop from '$lib/components/BackToTop.svelte';
	import type { ModalContext } from '$lib/types/modal.types';
	import { formatAmount } from '$lib/utils/currency';
	import { page } from '$app/state';
	import { getContext } from 'svelte';
	import type { PageData } from './$types';
	import { AlertCircle, Clock, CheckCircle, ArrowLeft, CreditCard, PackageCheck, Info, X } from '@lucide/svelte';
	import { invalidateAll } from '$app/navigation';

	let { data }: { data: PageData } = $props();
	let cases = $derived(data.cases);

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

	<div class="overflow-x-auto">
		<table class="er-table" style="min-width: 760px;">
			<thead>
				<tr>
					<th>Estado</th>
					<th>Descripción</th>
					<th>Tipo</th>
					<th>Cliente</th>
					<th>Teléfono</th>
					<th class="col-numeric">A saldar</th>
					<th class="col-numeric">Cuotas</th>
					<th>Fecha cobro</th>
					<th class="col-actions">Acciones</th>
				</tr>
			</thead>
			<tbody>
				{#if cases.length === 0}
					<tr>
						<td colspan="9" class="empty-cell">
							<span style="color: #6e6e6e;">No hay casos en esta categoría</span>
						</td>
					</tr>
				{:else}
					{#each cases as caso (caso.id)}
						<tr class={config.rowClass}>
							<td class="status-cell">
								<div class="status-inner">
									<StatusIcon size={12} />
									{config.label}
								</div>
							</td>
							<td>{caso.description}</td>
							<td style="color: #a8a8a8;">{caso.type}</td>
							<td>{caso.clientName}</td>
							<td style="color: #a8a8a8;">{caso.clientPhone}</td>
							<td class="col-numeric">{formatAmount(caso.restAmount, caso.currency.name)}</td>
							<td class="col-numeric">{caso.quantityPaymentsToPay}</td>
							<td>{caso.dueDate ?? '—'}</td>
							<td class="col-actions">
								<div class="action-icons">
									<button class="action-btn success" onclick={() => openToPay(caso)} title="Cobrar cuota">
										<CreditCard size={15} />
									</button>
									<button class="action-btn warning" onclick={() => quickClose(caso)} title="Cobrar todo">
										<PackageCheck size={15} />
									</button>
									<button class="action-btn ghost" onclick={() => openDetails(caso)} title="Ver detalles">
										<Info size={15} />
									</button>
								</div>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</section>

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
