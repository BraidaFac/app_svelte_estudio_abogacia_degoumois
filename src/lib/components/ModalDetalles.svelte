<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { FormattedCase, ClientPayment } from '$lib/types/case.types';
	import type { ModalContext } from '$lib/types/modal.types';
	import {
		formatDateToDMY,
		formatJUS,
		formatNumber,
		parseAmountInput,
		amountFocus,
		amountInput,
		amountBlur
	} from '$lib/utils/formatters';
	import { toaster } from '$lib/stores/toast';
	import { getContext } from 'svelte';
	import {
		X,
		MoreVertical,
		CheckCircle2,
		Trash2,
		PackageCheck,
		Pencil,
		RefreshCw
	} from '@lucide/svelte';
	import { DatePicker } from 'bits-ui';
	import { parseDate } from '@internationalized/date';
	import type { CalendarDate } from '@internationalized/date';
	import { CalendarDays, ChevronLeft, ChevronRight } from '@lucide/svelte';

	let {
		dialog = $bindable<HTMLDialogElement | undefined>(),
		caso,
		startEdit = $bindable(false),
		triggerDelete = $bindable(false)
	}: {
		dialog?: HTMLDialogElement;
		caso: FormattedCase | null;
		startEdit?: boolean;
		triggerDelete?: boolean;
	} = $props();

	// Reset view and result when caso changes (prevents stale state across openings)
	$effect(() => {
		caso;
		view = 'main';
		actionResult = null;
	});

	// Open directly in edit mode when requested
	$effect(() => {
		if (startEdit) {
			initEdit();
			view = 'edit';
			startEdit = false;
		}
	});

	// Open directly in delete confirmation when requested
	$effect(() => {
		if (triggerDelete) {
			view = 'confirmDelete';
			actionResult = null;
			triggerDelete = false;
		}
	});

	const { openToPay } = getContext<ModalContext>('modals');

	let menuOpen = $state(false);
	let view = $state<'main' | 'confirmSaldar' | 'confirmDelete' | 'confirmCerrar' | 'edit'>('main');
	let actionResult = $state<{ success: boolean; message: string } | null>(null);
	let actionLoading = $state(false);
	let collectorInput = $state('');

	$effect(() => {
		if (dialog) {
			const handleOpen = () => {
				view = 'main';
				actionResult = null;
				menuOpen = false;
				collectorInput = '';
			};
			dialog.addEventListener('show', handleOpen);
			return () => dialog?.removeEventListener('show', handleOpen);
		}
	});

	$effect(() => {
		const handleClick = (e: MouseEvent) => {
			if (!(e.target as HTMLElement).closest('.menu-container')) {
				menuOpen = false;
			}
		};
		setTimeout(() => document.addEventListener('click', handleClick), 0);
		return () => document.removeEventListener('click', handleClick);
	});

	function toggleMenu(e: Event) {
		e.stopPropagation();
		menuOpen = !menuOpen;
	}

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
			actionResult = {
				success: false,
				message: (await response.json()).error?.message || 'Error al saldar caso'
			};
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
			actionResult = {
				success: false,
				message: (await response.json()).error?.message || 'Error al cerrar caso'
			};
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
			? [...caso.payments]
					.sort((a, b) => a.payment_number - b.payment_number)
					.map((p: ClientPayment) => ({ ...p, due_date: formatDateToDMY(p.due_date) }))
			: []
	);

	let pendingCount = $derived(caso ? caso.payments.filter((p) => !p.payment_date).length : 0);

	// ── Edit state ──────────────────────────────────────────────────────
	type EditPending = { payment_number: number; due_date: string; amount: number; current: boolean };

	let editData = $state({
		description: '',
		clientName: '',
		clientPhone: '',
		clientEmail: '',
		caseNumber: '',
		type: 'CIVIL',
		period: 'MENSUAL',
		amount: 0
	});
	let editPending = $state<EditPending[]>([]);
	let pendingDates = $state<(CalendarDate | undefined)[]>([]);
	let amountStr = $state('');
	let pendingAmounts = $state<string[]>([]);

	$effect(() => {
		for (let i = 0; i < pendingDates.length; i++) {
			if (i < editPending.length && pendingDates[i]) {
				editPending[i].due_date = pendingDates[i]!.toString();
			}
		}
	});

	let paidCount = $derived(caso ? caso.payments.filter((p) => p.payment_date !== null).length : 0);
	let editPaidPayments = $derived(
		caso
			? caso.payments
					.filter((p) => p.payment_date !== null)
					.sort((a, b) => a.payment_number - b.payment_number)
			: []
	);
	let paidAmount = $derived(caso ? caso.amount - caso.restAmount : 0);
	let newRestAmount = $derived(parseFloat((editData.amount - paidAmount).toFixed(4)));
	let pendingSum = $derived(
		parseFloat(editPending.reduce((acc, p) => acc + (Number(p.amount) || 0), 0).toFixed(4))
	);
	let amountDiff = $derived(parseFloat((pendingSum - newRestAmount).toFixed(4)));
	let canRemove = $derived(editPending.filter((p) => !p.current).length > 0);
	let canSave = $derived(
		Math.abs(amountDiff) <= 0.01 &&
			editData.clientName.trim().length > 0 &&
			editData.description.trim().length > 0 &&
			editPending.length > 0 &&
			editPending.every((p) => p.amount > 0)
	);

	function toDateInput(d: Date | string | null | undefined): string {
		if (!d) return '';
		return new Date(d).toISOString().split('T')[0];
	}

	function nextDueDate(lastDate: string, period: string): string {
		const d = new Date(lastDate);
		if (period === 'SEMANAL') d.setDate(d.getDate() + 7);
		else if (period === 'QUINCENAL') d.setDate(d.getDate() + 15);
		else d.setMonth(d.getMonth() + 1);
		return d.toISOString().split('T')[0];
	}

	function initEdit() {
		if (!caso) return;
		editData = {
			description: caso.description,
			clientName: caso.clientName,
			clientPhone: caso.clientPhone,
			clientEmail: caso.clientEmail ?? '',
			caseNumber: caso.caseNumber ?? '',
			type: caso.type,
			period: (caso as { period?: string }).period ?? 'MENSUAL',
			amount: caso.amount
		};
		editPending = caso.payments
			.filter((p) => !p.payment_date)
			.sort((a, b) => a.payment_number - b.payment_number)
			.map((p) => ({
				payment_number: p.payment_number,
				due_date: toDateInput(p.due_date),
				amount: Number(p.amount) || 0,
				current: p.current
			}));

		pendingDates = editPending.map((p) => (p.due_date ? parseDate(p.due_date) : undefined));

		// Legacy cases: payments created without pre-assigned amounts → auto-redistribute
		const sumPending = editPending.reduce((acc, p) => acc + p.amount, 0);
		if (sumPending === 0 && editPending.length > 0 && caso.restAmount > 0) {
			const rest = caso.restAmount;
			const per = parseFloat((rest / editPending.length).toFixed(4));
			for (let i = 0; i < editPending.length; i++) {
				editPending[i].amount =
					i === editPending.length - 1
						? parseFloat((rest - per * (editPending.length - 1)).toFixed(4))
						: per;
			}
		}

		amountStr = formatNumber(editData.amount);
		pendingAmounts = editPending.map((p) => formatNumber(p.amount));
	}

	function redistribute() {
		if (editPending.length === 0) return;
		const per = parseFloat((newRestAmount / editPending.length).toFixed(4));
		const last = parseFloat((newRestAmount - per * (editPending.length - 1)).toFixed(4));
		for (let i = 0; i < editPending.length; i++) {
			editPending[i].amount = i === editPending.length - 1 ? last : per;
		}
		pendingAmounts = editPending.map((p) => formatNumber(p.amount));
	}

	function addCuota() {
		if (!caso) return;
		const allNumbers = [
			...caso.payments.map((p) => p.payment_number),
			...editPending.map((p) => p.payment_number)
		];
		const nextNumber = Math.max(...allNumbers) + 1;
		const lastDate =
			editPending[editPending.length - 1]?.due_date ??
			toDateInput(
				[...caso.payments].sort((a, b) => b.payment_number - a.payment_number)[0]?.due_date
			);
		const newDueDate = nextDueDate(lastDate, editData.period);
		editPending = [
			...editPending,
			{
				payment_number: nextNumber,
				due_date: newDueDate,
				amount: 0,
				current: false
			}
		];
		pendingDates = [...pendingDates, newDueDate ? parseDate(newDueDate) : undefined];
		pendingAmounts = [...pendingAmounts, ''];
	}

	function removeCuota() {
		const nonCurrent = editPending.filter((p) => !p.current);
		if (nonCurrent.length === 0) return;
		editPending = editPending.slice(0, -1);
		pendingDates = pendingDates.slice(0, -1);
		pendingAmounts = pendingAmounts.slice(0, -1);
	}

	async function handleSave() {
		if (!caso || !canSave) return;
		actionLoading = true;
		const response = await fetch('/api/editCase', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				caseId: caso.id,
				description: editData.description,
				clientName: editData.clientName,
				clientPhone: editData.clientPhone,
				clientEmail: editData.clientEmail || null,
				caseNumber: editData.caseNumber || null,
				type: editData.type,
				period: editData.period,
				amount: Number(editData.amount),
				pendingPayments: editPending.map((p) => ({
					payment_number: p.payment_number,
					due_date: p.due_date,
					amount: Number(p.amount)
				}))
			})
		});
		actionLoading = false;
		if (response.ok) {
			await invalidateAll();
			toaster.create({ title: 'Caso actualizado correctamente', type: 'success' });
			dialog?.close();
		} else {
			const json = await response.json();
			actionResult = {
				success: false,
				message: json.error?.message || 'Error al editar el caso'
			};
		}
	}
</script>

<dialog
	bind:this={dialog}
	onclick={(e) => {
		if (e.target === e.currentTarget) dialog?.close();
	}}
>
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
								{#if !caso.closed}
									<button
										class="dropdown-item"
										onclick={() => {
											menuOpen = false;
											initEdit();
											view = 'edit';
										}}
									>
										<Pencil size={14} />
										Editar caso
									</button>
									<div class="dropdown-separator"></div>
									<button
										class="dropdown-item"
										onclick={() => {
											menuOpen = false;
											view = 'confirmCerrar';
										}}
									>
										<PackageCheck size={14} />
										Cobrar todo
									</button>
									<button
										class="dropdown-item"
										onclick={() => {
											menuOpen = false;
											view = 'confirmSaldar';
										}}
									>
										<CheckCircle2 size={14} />
										Saldar caso
									</button>
									<div class="dropdown-separator"></div>
								{/if}
								<button
									class="dropdown-item danger"
									onclick={() => {
										menuOpen = false;
										view = 'confirmDelete';
									}}
								>
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
					{#if caso.clientEmail}
						<div class="info-item">
							<span class="info-label">Email</span>
							<span class="info-value" style="color: #a8a8a8;">{caso.clientEmail}</span>
						</div>
					{/if}
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
						<span class="info-value mono" style="color: #ff6b5e;">{formatJUS(caso.restAmount)}</span
						>
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
					<button class="modal-icon-btn" onclick={() => dialog?.close()} aria-label="Cerrar"
						><X size={18} /></button
					>
				</div>
				{#if actionResult}
					<p
						class={actionResult.success ? 'text-success-msg' : 'text-error'}
						style="margin-bottom: 1rem;"
					>
						{actionResult.message}
					</p>
					<div style="display: flex; justify-content: flex-end;">
						<button class="btn btn-ghost" onclick={() => dialog?.close()}>Cerrar</button>
					</div>
				{:else if actionLoading}
					<div class="spinner-wrap"><div class="er-spinner"></div></div>
				{:else}
					<p style="color: #a8a8a8; margin-bottom: 0.75rem;">
						Se registrarán las <strong style="color: #f5f5f5;"
							>{pendingCount} cuota{pendingCount !== 1 ? 's' : ''} pendiente{pendingCount !== 1
								? 's'
								: ''}</strong
						> como cobradas hoy, con fecha y cobrador. Usá esta opción cuando cobraste las cuotas y querés
						dejar el registro completo.
					</p>
					<p style="color: #5e5e5e; font-size: 0.8rem; margin-bottom: 1.25rem;">
						Si solo querés cerrar el debe sin registrar cobros, usá <em>Saldar caso</em>.
					</p>
					<div class="label" style="margin-bottom: 1.25rem;">
						<span>Cobrador</span>
						<input
							class="input"
							type="text"
							placeholder="Nombre del cobrador"
							bind:value={collectorInput}
						/>
					</div>
					<div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
						<button class="btn btn-ghost" onclick={() => (view = 'main')}>Cancelar</button>
						<button class="btn btn-success" disabled={!collectorInput.trim()} onclick={handleCerrar}
							>Confirmar</button
						>
					</div>
				{/if}
			{:else if view === 'confirmSaldar'}
				<div class="modal-header">
					<h2 class="modal-title">Saldar caso</h2>
					<button class="modal-icon-btn" onclick={() => dialog?.close()} aria-label="Cerrar"
						><X size={18} /></button
					>
				</div>
				<p style="color: #a8a8a8; margin-bottom: 0.75rem;">
					El monto restante pasará a <strong style="color: #f5f5f5;">0</strong> sin registrar cobros individuales.
					Usá esta opción cuando el cliente pagó pero no necesitás dejar registro de fecha ni cobrador
					por cuota.
				</p>
				<p style="color: #5e5e5e; font-size: 0.8rem; margin-bottom: 1.5rem;">
					Si cobraste las cuotas y querés registrar quién cobró y cuándo, usá <em>Cobrar todo</em>.
				</p>
				{#if actionResult}
					<p
						class={actionResult.success ? 'text-success-msg' : 'text-error'}
						style="margin-bottom: 1rem;"
					>
						{actionResult.message}
					</p>
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
					<button class="modal-icon-btn" onclick={() => dialog?.close()} aria-label="Cerrar"
						><X size={18} /></button
					>
				</div>
				<p style="color: #a8a8a8; margin-bottom: 1.5rem;">
					¿Estás seguro de eliminar el caso? Esta acción no se puede deshacer.
				</p>
				{#if actionResult}
					<p
						class={actionResult.success ? 'text-success-msg' : 'text-error'}
						style="margin-bottom: 1rem;"
					>
						{actionResult.message}
					</p>
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
			{:else if view === 'edit'}
				<div class="modal-header">
					<h2 class="modal-title">Editar caso</h2>
					<button class="modal-icon-btn" onclick={() => dialog?.close()} aria-label="Cerrar"
						><X size={18} /></button
					>
				</div>

				{#if actionResult}
					<p
						class={actionResult.success ? 'text-success-msg' : 'text-error'}
						style="margin-bottom: 1rem;"
					>
						{actionResult.message}
					</p>
					<div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
						{#if !actionResult.success}
							<button class="btn btn-ghost" onclick={() => (actionResult = null)}>Reintentar</button
							>
						{/if}
						<button
							class="btn btn-ghost"
							onclick={() => {
								actionResult = null;
								dialog?.close();
							}}>Cerrar</button
						>
					</div>
				{:else if actionLoading}
					<div class="spinner-wrap"><div class="er-spinner"></div></div>
				{:else}
					<div class="edit-grid">
						<div class="label" style="grid-column: 1 / -1;">
							<span>Descripción</span>
							<input class="input" type="text" bind:value={editData.description} />
						</div>
						<div class="label">
							<span>Cliente</span>
							<input class="input" type="text" bind:value={editData.clientName} />
						</div>
						<div class="label">
							<span>Teléfono</span>
							<input class="input" type="text" bind:value={editData.clientPhone} />
						</div>
						<div class="label">
							<span>Email (opcional)</span>
							<input class="input" type="email" bind:value={editData.clientEmail} />
						</div>
						<div class="label">
							<span>N° Caso (opcional)</span>
							<input class="input" type="text" bind:value={editData.caseNumber} />
						</div>
						<div class="label">
							<span>Tipo</span>
							<select class="input" bind:value={editData.type}>
								{#each ['CIVIL', 'PENAL', 'LABORAL', 'FAMILIAR', 'OTRO'] as t}
									<option value={t}>{t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()}</option>
								{/each}
							</select>
						</div>
						<div class="label">
							<span>Período</span>
							<select class="input" bind:value={editData.period}>
								<option value="MENSUAL">Mensual</option>
								<option value="QUINCENAL">Quincenal</option>
								<option value="SEMANAL">Semanal</option>
							</select>
						</div>
					</div>

					<div style="display: flex; gap: 0.75rem; align-items: flex-end; margin-bottom: 1.25rem;">
						<div class="label" style="flex: 1; margin: 0;">
							<span>Monto total ({caso.currency.name})</span>
							<input
								class="input"
								type="text"
								inputmode="decimal"
								value={amountStr}
								onfocus={amountFocus}
								oninput={(e) => {
									amountInput(e);
									amountStr = (e.target as HTMLInputElement).value;
									editData.amount = parseAmountInput(amountStr);
								}}
								onblur={(e) => {
									amountStr = amountBlur(e);
									editData.amount = parseAmountInput(amountStr);
								}}
							/>
						</div>
						<button
							class="btn btn-ghost"
							style="display:flex;align-items:center;gap:0.35rem;white-space:nowrap;"
							onclick={redistribute}
						>
							<RefreshCw size={13} /> Redistribuir
						</button>
					</div>

					<div style="margin-bottom: 0.75rem;">
						<div
							style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;"
						>
							<span
								style="font-size: 0.7rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #5e5e5e;"
							>
								Cuotas
								<span style="color: #6e6e6e; font-weight: 400; margin-left: 0.4rem;"
									>({editPending.length} pendiente{editPending.length !== 1 ? 's' : ''}{paidCount >
									0
										? `, ${paidCount} cobrada${paidCount !== 1 ? 's' : ''}`
										: ''})</span
								>
							</span>
							<div style="display: flex; gap: 0.5rem;">
								<button class="btn btn-ghost btn-sm" onclick={addCuota}>+ Cuota</button>
								<button class="btn btn-ghost btn-sm" disabled={!canRemove} onclick={removeCuota}
									>− Cuota</button
								>
							</div>
						</div>
						<div class="payments-table-wrap">
							<table class="er-table">
								<thead>
									<tr>
										<th>N°</th>
										<th>Vencimiento</th>
										<th class="col-numeric">Monto ({caso.currency.name})</th>
									</tr>
								</thead>
								<tbody>
									{#each editPaidPayments as p}
										<tr style="opacity: 0.45; pointer-events: none;">
											<td>
												{p.payment_number}
												<span
													class="badge badge-pagada"
													style="font-size:0.65rem;margin-left:0.25rem;">cobrada</span
												>
											</td>
											<td>{formatDateToDMY(p.due_date)}</td>
											<td class="col-numeric" style="color: #3fb98a;">{formatJUS(p.amount ?? 0)}</td
											>
										</tr>
									{/each}
									{#each editPending as _, i}
										<tr>
											<td>
												{editPending[i].payment_number}
												{#if editPending[i].current}<span
														class="badge badge-proximo"
														style="font-size:0.65rem;margin-left:0.25rem;">actual</span
													>{/if}
											</td>
											<td>
												<DatePicker.Root locale="es" bind:value={pendingDates[i]} weekStartsOn={1}>
													<DatePicker.Input class="date-field-input" style="font-size:0.8rem;">
														{#snippet children({ segments })}
															{#each segments as { part, value }}
																<DatePicker.Segment {part} class="date-segment"
																	>{value}</DatePicker.Segment
																>
															{/each}
															<DatePicker.Trigger class="date-picker-trigger">
																<CalendarDays size={13} />
															</DatePicker.Trigger>
														{/snippet}
													</DatePicker.Input>
													<DatePicker.Content class="date-picker-content">
														<DatePicker.Calendar>
															{#snippet children({ months, weekdays })}
																<DatePicker.Header class="date-picker-header">
																	<DatePicker.PrevButton class="date-picker-nav-btn"
																		><ChevronLeft size={14} /></DatePicker.PrevButton
																	>
																	<DatePicker.Heading class="date-picker-heading" />
																	<DatePicker.NextButton class="date-picker-nav-btn"
																		><ChevronRight size={14} /></DatePicker.NextButton
																	>
																</DatePicker.Header>
																{#each months as month}
																	<DatePicker.Grid class="date-picker-grid">
																		<DatePicker.GridHead>
																			<DatePicker.GridRow>
																				{#each weekdays as day}
																					<DatePicker.HeadCell class="date-picker-head-cell"
																						>{day.slice(0, 2)}</DatePicker.HeadCell
																					>
																				{/each}
																			</DatePicker.GridRow>
																		</DatePicker.GridHead>
																		<DatePicker.GridBody>
																			{#each month.weeks as weekDates}
																				<DatePicker.GridRow>
																					{#each weekDates as date}
																						<DatePicker.Cell
																							{date}
																							month={month.value}
																							class="date-picker-cell"
																						>
																							<DatePicker.Day class="date-picker-day" />
																						</DatePicker.Cell>
																					{/each}
																				</DatePicker.GridRow>
																			{/each}
																		</DatePicker.GridBody>
																	</DatePicker.Grid>
																{/each}
															{/snippet}
														</DatePicker.Calendar>
													</DatePicker.Content>
												</DatePicker.Root>
											</td>
											<td class="col-numeric"
												><input
													class="input"
													style="padding:0.25rem 0.4rem;font-size:0.8rem;text-align:right;"
													type="text"
													inputmode="decimal"
													value={pendingAmounts[i]}
													onfocus={amountFocus}
													oninput={(e) => {
														amountInput(e);
														pendingAmounts[i] = (e.target as HTMLInputElement).value;
														editPending[i].amount = parseAmountInput(pendingAmounts[i]);
													}}
													onblur={(e) => {
														pendingAmounts[i] = amountBlur(e);
														editPending[i].amount = parseAmountInput(pendingAmounts[i]);
													}}
												/></td
											>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>

					{#if Math.abs(amountDiff) > 0.01}
						<p class="text-error" style="font-size: 0.8rem; margin-bottom: 1rem;">
							{amountDiff > 0
								? `Sobran ${formatJUS(amountDiff)} en cuotas`
								: `Faltan asignar ${formatJUS(-amountDiff)}`}
						</p>
					{:else}
						<p class="text-success-msg" style="font-size: 0.8rem; margin-bottom: 1rem;">
							✓ Monto asignado correctamente
						</p>
					{/if}

					<div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
						<button class="btn btn-ghost" onclick={() => (view = 'main')}>Cancelar</button>
						<button class="btn btn-primary" disabled={!canSave} onclick={handleSave}>Guardar</button
						>
					</div>
				{/if}
			{/if}
		</div>
	{/if}
</dialog>

<style>
	.menu-container {
		position: relative;
	}
	.dropdown-content {
		position: absolute;
		right: 0;
		top: calc(100% + 4px);
	}

	.case-info {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: 0.75rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.07);
		border-radius: 8px;
		padding: 1rem 1.125rem;
		margin-bottom: 1.5rem;
	}

	.info-item {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.info-label {
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #5e5e5e;
	}

	.info-value {
		font-size: 0.875rem;
		color: #f0f0f0;
	}

	.info-value.mono {
		font-family: 'IBM Plex Mono', monospace;
		font-variant-numeric: tabular-nums;
	}

	.payments-table-wrap {
		overflow-x: auto;
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.payments-table-wrap::-webkit-scrollbar {
		display: none;
	}

	.edit-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
		margin-bottom: 1.25rem;
	}
</style>
