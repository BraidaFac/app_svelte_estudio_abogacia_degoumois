<script lang="ts">
	import { filterStore } from '$lib/stores/filter';
	import type { FormattedCase } from '$lib/types/case.types';
	import type { ModalContext } from '$lib/types/modal.types';
	import { formatAmount } from '$lib/utils/currency';
	import { differenceInHours } from 'date-fns';
	import { getContext } from 'svelte';
	import { AlertCircle, Clock, CheckCircle, FileX, X, CreditCard, PackageCheck, Info } from '@lucide/svelte';
	import { invalidateAll } from '$app/navigation';

	let { cases }: { cases: FormattedCase[] } = $props();

	const { openToPay, openDetails } = getContext<ModalContext>('modals');

	let filteredCases = $derived.by(() => {
		const term = $filterStore.toLowerCase().trim();
		if (!term) return cases;
		const words = term.split(/\s+/);
		return cases.filter((caso) => {
			const terms = ((caso as any).searchTerms ?? '').toLowerCase();
			return words.every((w) => terms.includes(w));
		});
	});

	let quickCloseDialog = $state<HTMLDialogElement | undefined>();
	let quickCloseCaso = $state<FormattedCase | null>(null);
	let quickCollector = $state('');
	let quickLoading = $state(false);
	let quickResult = $state<{ success: boolean; message: string } | null>(null);

	function quickClose(caso: FormattedCase) {
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

<div class="search-bar">
	<div class="search-wrap">
		<input
			type="search"
			class="input"
			placeholder="Buscar caso, cliente…"
			bind:value={$filterStore}
		/>
		{#if $filterStore}
			<button class="clear-btn" onclick={() => ($filterStore = '')} aria-label="Limpiar búsqueda">
				<X size={15} />
			</button>
		{/if}
	</div>
</div>

{#if filteredCases.length === 0}
	<div class="empty-state">
		<FileX size={48} strokeWidth={1} style="color: #3e3e3e;" />
		{#if $filterStore}
			<p>Sin resultados para <strong>"{$filterStore}"</strong></p>
		{:else}
			<p>No hay casos activos</p>
		{/if}
	</div>
{:else}
	<div class="overflow-x-auto" style="padding: 0 1rem 2rem;">
		<table class="er-table" style="min-width: 760px;">
			<thead>
				<tr>
					<th>Estado</th>
					<th>Descripción</th>
					<th>Tipo</th>
					<th>Cliente</th>
					<th>Teléfono</th>
					<th class="col-numeric">Monto</th>
					<th class="col-numeric">Cuotas</th>
					<th>Fecha cobro</th>
					<th class="col-actions">Acciones</th>
				</tr>
			</thead>
			<tbody>
				{#each filteredCases as caso (caso.id)}
					{@const status = getStatus(caso.dueDate)}
					<tr class={status.rowClass}>
						<td class="status-cell">
							<div class="status-inner">
								<status.icon size={12} />
								{status.label}
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
			</tbody>
		</table>
	</div>
{/if}

<!-- Quick close dialog -->
<dialog bind:this={quickCloseDialog}>
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
	.search-bar {
		padding: 0.75rem 1rem 1rem;
	}

	.search-wrap {
		position: relative;
		max-width: 28rem;
	}

	.search-wrap .input {
		padding-right: 2.25rem;
	}

	.clear-btn {
		position: absolute;
		right: 0.5rem;
		top: 50%;
		transform: translateY(-50%);
		background: transparent;
		border: none;
		color: #6e6e6e;
		cursor: pointer;
		display: flex;
		padding: 0.2rem;
		border-radius: 3px;
		line-height: 0;
		transition: color 150ms ease;
	}

	.clear-btn:hover {
		color: #f5f5f5;
	}

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
