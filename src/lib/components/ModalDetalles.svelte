<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { FormattedCase, ClientPayment } from '$lib/types/case.types';
	import type { ModalContext } from '$lib/types/modal.types';
	import { formatDateToDMY, formatJUS } from '$lib/utils/formatters';
	import { getContext } from 'svelte';
	import { X, MoreVertical, CheckCircle2, Trash2, PackageCheck } from '@lucide/svelte';

	let {
		dialog = $bindable<HTMLDialogElement | undefined>(),
		caso
	}: { dialog?: HTMLDialogElement; caso: FormattedCase | null } = $props();

	const { openToPay } = getContext<ModalContext>('modals');

	let menuOpen = $state(false);
	let view = $state<'main' | 'confirmSaldar' | 'confirmDelete' | 'confirmCerrar'>('main');
	let actionResult = $state<{ success: boolean; message: string } | null>(null);
	let actionLoading = $state(false);
	let collectorInput = $state('');

	$effect(() => {
		if (dialog) {
			const handleOpen = () => { view = 'main'; actionResult = null; menuOpen = false; collectorInput = ''; };
			dialog.addEventListener('show', handleOpen);
			return () => dialog?.removeEventListener('show', handleOpen);
		}
	});

	$effect(() => {
		const handleClick = (e: MouseEvent) => {
			if (!(e.target as HTMLElement).closest('.menu-container')) { menuOpen = false; }
		};
		setTimeout(() => document.addEventListener('click', handleClick), 0);
		return () => document.removeEventListener('click', handleClick);
	});

	function toggleMenu(e: Event) { e.stopPropagation(); menuOpen = !menuOpen; }

	function handleCobrar() {
		if (!caso) return;
		dialog?.close();
		openToPay(caso);
	}

	async function handleSaldar() {
		if (!caso) return;
		actionLoading = true;
		const data = new FormData();
		data.append('caseId', caso.id.toString());
		data.append('action', 'saldar');
		const response = await fetch('/api/updateCase', { method: 'POST', body: data });
		actionLoading = false;
		if (response.status !== 200) {
			actionResult = { success: false, message: (await response.json()).error?.message || 'Error al saldar caso' };
		} else {
			actionResult = { success: true, message: 'Caso saldado correctamente' };
			invalidateAll();
		}
	}

	async function handleCerrar() {
		if (!caso || !collectorInput.trim()) return;
		actionLoading = true;
		const data = new FormData();
		data.append('caseId', caso.id.toString());
		data.append('action', 'cerrar');
		data.append('collector', collectorInput.trim());
		const response = await fetch('/api/updateCase', { method: 'POST', body: data });
		actionLoading = false;
		if (response.status !== 200) {
			actionResult = { success: false, message: (await response.json()).error?.message || 'Error al cerrar caso' };
		} else {
			actionResult = { success: true, message: 'Caso cerrado correctamente' };
			invalidateAll();
		}
	}

	async function handleDelete() {
		if (!caso) return;
		actionLoading = true;
		const data = new FormData();
		data.append('caseId', caso.id.toString());
		const response = await fetch('/historial', { method: 'POST', body: data });
		actionLoading = false;
		if (response.status !== 200) {
			actionResult = { success: false, message: (await response.json()).error.message };
		} else {
			actionResult = { success: true, message: 'Caso eliminado correctamente' };
			invalidateAll();
		}
	}

	interface FormattedPaymentDisplay extends Omit<ClientPayment, 'due_date'> {
		due_date: string | undefined;
	}

	let payments = $derived<FormattedPaymentDisplay[]>(
		caso
			? caso.payments.map((p: ClientPayment) => ({ ...p, due_date: formatDateToDMY(p.due_date) }))
			: []
	);

	let pendingCount = $derived(caso ? caso.payments.filter((p) => !p.payment_date).length : 0);
</script>

<dialog bind:this={dialog}>
	{#if caso}
		<div class="modal-panel" style="width: min(90vw, 54rem);">
			{#if view === 'main'}
				<div class="modal-header">
					<h2 class="modal-title">{caso.description}</h2>
					<div class="menu-container">
						<button class="modal-icon-btn" onclick={toggleMenu} aria-label="Opciones">
							<MoreVertical size={18} />
						</button>
						{#if menuOpen}
							<div class="dropdown-content">
								<button class="dropdown-item" onclick={() => { menuOpen = false; view = 'confirmCerrar'; }}>
									<PackageCheck size={14} />
									Cobrar todo
								</button>
								<button class="dropdown-item" onclick={() => { menuOpen = false; view = 'confirmSaldar'; }}>
									<CheckCircle2 size={14} />
									Saldar caso
								</button>
								<div class="dropdown-separator"></div>
								<button class="dropdown-item danger" onclick={() => { menuOpen = false; view = 'confirmDelete'; }}>
									<Trash2 size={14} />
									Eliminar caso
								</button>
							</div>
						{/if}
					</div>
					<button class="modal-icon-btn" onclick={() => dialog?.close()} aria-label="Cerrar">
						<X size={18} />
					</button>
				</div>

				<!-- Info del caso -->
				<div class="case-info">
					{#if caso.caseNumber}
						<div class="info-item">
							<span class="info-label">N° Caso</span>
							<span class="info-value">{caso.caseNumber}</span>
						</div>
					{/if}
					<div class="info-item">
						<span class="info-label">Cliente</span>
						<span class="info-value">{caso.clientName}</span>
					</div>
					<div class="info-item">
						<span class="info-label">Teléfono</span>
						<span class="info-value" style="color: #a8a8a8;">{caso.clientPhone}</span>
					</div>
					<div class="info-item">
						<span class="info-label">Tipo</span>
						<span class="info-value">{caso.type}</span>
					</div>
					<div class="info-item">
						<span class="info-label">Total JUS</span>
						<span class="info-value mono">{formatJUS(caso.amount)}</span>
					</div>
					<div class="info-item">
						<span class="info-label">Adeuda JUS</span>
						<span class="info-value mono" style="color: #ff6b5e;">{formatJUS(caso.restAmount)}</span>
					</div>
					<div class="info-item">
						<span class="info-label">Cuotas pendientes</span>
						<span class="info-value mono">{pendingCount} / {caso.payments.length}</span>
					</div>
				</div>

				<div class="payments-table-wrap">
					<table class="er-table">
						<thead>
							<tr>
								<th>Cuota</th>
								<th>Vencimiento</th>
								<th>Cobrador</th>
								<th>Estado</th>
								<th class="col-numeric">Monto / Acción</th>
							</tr>
						</thead>
						<tbody>
							{#each payments as p}
								<tr>
									<td>N° {p.payment_number}</td>
									<td>{p.due_date ?? '—'}</td>
									<td style="color: #a8a8a8;">{p.collector || '—'}</td>
									<td>
										{#if p.payment_date}
											<span class="badge badge-pagada">Pagada</span>
										{:else if p.current}
											<span class="badge badge-proximo">Pendiente</span>
										{:else}
											<span style="color: #3e3e3e; font-size: 0.8rem;">—</span>
										{/if}
									</td>
									<td class="col-numeric">
										{#if p.current}
											<button class="btn btn-success btn-sm" onclick={handleCobrar}>Cobrar</button>
										{:else if p.payment_date}
											<span style="color: #3fb98a;">{formatJUS(p.amount ?? 0)}</span>
										{:else}
											<span style="color: #3e3e3e;">—</span>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

			{:else if view === 'confirmCerrar'}
				<div class="modal-header">
					<h2 class="modal-title">Cobrar todo</h2>
					<button class="modal-icon-btn" onclick={() => dialog?.close()} aria-label="Cerrar"><X size={18} /></button>
				</div>
				{#if actionResult}
					<p class={actionResult.success ? 'text-success-msg' : 'text-error'} style="margin-bottom: 1rem;">{actionResult.message}</p>
					<div style="display: flex; justify-content: flex-end;">
						<button class="btn btn-ghost" onclick={() => dialog?.close()}>Cerrar</button>
					</div>
				{:else if actionLoading}
					<div class="spinner-wrap"><div class="er-spinner"></div></div>
				{:else}
					<p style="color: #a8a8a8; margin-bottom: 1.25rem;">
						Se marcarán las <strong style="color: #f5f5f5;">{pendingCount} cuota{pendingCount !== 1 ? 's' : ''} pendiente{pendingCount !== 1 ? 's' : ''}</strong> como cobradas. Ingresá el nombre del cobrador.
					</p>
					<div class="label" style="margin-bottom: 1.25rem;">
						<span>Cobrador</span>
						<input class="input" type="text" placeholder="Nombre del cobrador" bind:value={collectorInput} />
					</div>
					<div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
						<button class="btn btn-ghost" onclick={() => (view = 'main')}>Cancelar</button>
						<button class="btn btn-success" disabled={!collectorInput.trim()} onclick={handleCerrar}>Confirmar</button>
					</div>
				{/if}

			{:else if view === 'confirmSaldar'}
				<div class="modal-header">
					<h2 class="modal-title">Saldar caso</h2>
					<button class="modal-icon-btn" onclick={() => dialog?.close()} aria-label="Cerrar"><X size={18} /></button>
				</div>
				<p style="color: #a8a8a8; margin-bottom: 1.5rem;">¿Estás seguro de saldar el caso? El monto restante pasará a 0 sin registrar pagos.</p>
				{#if actionResult}
					<p class={actionResult.success ? 'text-success-msg' : 'text-error'} style="margin-bottom: 1rem;">{actionResult.message}</p>
					<div style="display: flex; justify-content: flex-end;">
						<button class="btn btn-ghost" onclick={() => dialog?.close()}>Cerrar</button>
					</div>
				{:else if actionLoading}
					<div class="spinner-wrap"><div class="er-spinner"></div></div>
				{:else}
					<div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
						<button class="btn btn-ghost" onclick={() => (view = 'main')}>Cancelar</button>
						<button class="btn btn-success" onclick={handleSaldar}>Saldar</button>
					</div>
				{/if}

			{:else if view === 'confirmDelete'}
				<div class="modal-header">
					<h2 class="modal-title">Eliminar caso</h2>
					<button class="modal-icon-btn" onclick={() => dialog?.close()} aria-label="Cerrar"><X size={18} /></button>
				</div>
				<p style="color: #a8a8a8; margin-bottom: 1.5rem;">¿Estás seguro de eliminar el caso? Esta acción no se puede deshacer.</p>
				{#if actionResult}
					<p class={actionResult.success ? 'text-success-msg' : 'text-error'} style="margin-bottom: 1rem;">{actionResult.message}</p>
					<div style="display: flex; justify-content: flex-end;">
						<button class="btn btn-ghost" onclick={() => dialog?.close()}>Cerrar</button>
					</div>
				{:else if actionLoading}
					<div class="spinner-wrap"><div class="er-spinner"></div></div>
				{:else}
					<div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
						<button class="btn btn-ghost" onclick={() => (view = 'main')}>Cancelar</button>
						<button class="btn btn-danger" onclick={handleDelete}>Eliminar</button>
					</div>
				{/if}
			{/if}
		</div>
	{/if}
</dialog>

<style>
	.menu-container { position: relative; }
	.dropdown-content {
		position: absolute;
		right: 0;
		top: calc(100% + 4px);
	}

	.case-info {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: 0.75rem;
		background: #1a1a1a;
		border: 1px solid #2e2e2e;
		border-radius: 6px;
		padding: 1rem;
		margin-bottom: 1.25rem;
	}

	.info-item {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.info-label {
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #6e6e6e;
	}

	.info-value {
		font-size: 0.875rem;
		color: #f5f5f5;
	}

	.info-value.mono {
		font-family: 'IBM Plex Mono', monospace;
		font-variant-numeric: tabular-nums;
	}

	.payments-table-wrap { overflow-x: auto; }
</style>
