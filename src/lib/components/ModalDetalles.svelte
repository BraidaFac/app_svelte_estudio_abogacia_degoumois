<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { FormattedCase, ClientPayment } from '$lib/types/case.types';
	import type { ModalContext } from '$lib/types/modal.types';
	import { formatDateToDMY, formatJUS } from '$lib/utils/formatters';
	import { getContext } from 'svelte';

	let {
		dialog = $bindable<HTMLDialogElement | undefined>(),
		caso
	}: { dialog?: HTMLDialogElement; caso: FormattedCase | null } = $props();

	const { openToPay } = getContext<ModalContext>('modals');

	let menuOpen = $state(false);
	let view = $state<'main' | 'confirmSaldar' | 'confirmDelete'>('main');
	let actionResult = $state<{ success: boolean; message: string } | null>(null);
	let actionLoading = $state(false);

	$effect(() => {
		if (dialog) {
			const handleOpen = () => {
				view = 'main';
				actionResult = null;
				menuOpen = false;
			};
			dialog.addEventListener('show', handleOpen);
			return () => dialog?.removeEventListener('show', handleOpen);
		}
	});

	$effect(() => {
		const handleClick = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			if (!target.closest('.menu-container')) {
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
			const error = (await response.json()).error?.message || 'Error al saldar caso';
			actionResult = { success: false, message: error };
		} else {
			actionResult = { success: true, message: 'Se ha saldado el caso correctamente' };
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
			const error = (await response.json()).error.message;
			actionResult = { success: false, message: error };
		} else {
			actionResult = { success: true, message: 'Se ha eliminado el caso correctamente' };
			invalidateAll();
		}
	}

	interface FormattedPaymentDisplay extends Omit<ClientPayment, 'due_date'> {
		due_date: string | undefined;
	}

	let payments = $derived<FormattedPaymentDisplay[]>(
		caso
			? caso.restAmount > 0
				? caso.payments.map((p: ClientPayment) => ({ ...p, due_date: formatDateToDMY(p.due_date) }))
				: caso.payments
						.filter((p: ClientPayment) => p.payment_date)
						.map((p: ClientPayment) => ({ ...p, due_date: formatDateToDMY(p.due_date) }))
			: []
	);

	const cBase = 'card p-6 w-full max-w-4xl shadow-xl space-y-4';
	const cHeader = 'text-2xl font-bold text-center';
	const cDiv = 'border border-surface-500 p-4 rounded-xl overflow-x-auto';
</script>

<dialog bind:this={dialog}>
	{#if caso}
		<div class="modal-example-form overflow-y-auto {cBase}">
			{#if view === 'main'}
				<header class="relative {cHeader}">
					<span>Detalles: {caso.description}</span>
					<div class="menu-container absolute top-0 right-0">
						<button
							class="hover:bg-surface-200-800 rounded p-2 transition-colors"
							onclick={toggleMenu}
							aria-label="Opciones"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-6 w-6"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<circle cx="12" cy="5" r="1.5" fill="currentColor" />
								<circle cx="12" cy="12" r="1.5" fill="currentColor" />
								<circle cx="12" cy="19" r="1.5" fill="currentColor" />
							</svg>
						</button>
						{#if menuOpen}
							<div class="card absolute right-0 z-10 mt-2 w-48 shadow-lg">
								<div class="space-y-1 p-2" role="menu" aria-orientation="vertical">
									<button
										class="btn hover:bg-surface-200-800 w-full justify-start text-sm transition-colors"
										onclick={() => {
											menuOpen = false;
											view = 'confirmSaldar';
										}}
									>
										Saldar
									</button>
									<button
										class="btn text-error-500 hover:bg-surface-200-800 w-full justify-start text-sm transition-colors"
										onclick={() => {
											menuOpen = false;
											view = 'confirmDelete';
										}}
									>
										Eliminar caso
									</button>
								</div>
							</div>
						{/if}
					</div>
				</header>

				<div class={cDiv}>
					<div
						class="border-surface-300 grid grid-cols-[1fr_1fr_1.5fr_1fr] gap-4 border-b pb-3 text-sm font-semibold"
					>
						<div class="text-center">Cuota</div>
						<div class="text-center">Fecha</div>
						<div class="text-center">Cobrador</div>
						<div class="text-center">Monto/Acción</div>
					</div>
					<div class="mt-3 space-y-2">
						{#each payments as p}
							<div
								class="hover:bg-surface-100-900 grid grid-cols-[1fr_1fr_1.5fr_1fr] items-center gap-4 rounded px-2 py-2 transition-colors"
							>
								<div class="text-center text-sm">Nº {p.payment_number}</div>
								<div class="text-center text-sm">{p.due_date}</div>
								<div class="text-center text-sm">{p.collector || '-'}</div>
								{#if p.current}
									<div class="flex justify-center">
										<button class="btn preset-filled-success-500 btn-sm" onclick={handleCobrar}
											>Cobrar
										</button>
									</div>
								{:else if p.payment_date}
									<div class="text-success-600-400 text-center text-sm font-medium">
										{formatJUS(p.amount ?? 0)}
									</div>
								{:else}
									<div class="text-surface-400 text-center text-sm">-</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>

				<div class="flex flex-row justify-end pt-2">
					<button class="btn preset-filled-primary-500" onclick={() => dialog?.close()}
						>Salir</button
					>
				</div>
			{:else if view === 'confirmSaldar'}
				<header class={cHeader}>Confirmar acción</header>
				<p class="text-center">
					¿Estás seguro de saldar el caso? Esto pondrá el monto restante en 0.
				</p>
				{#if actionResult}
					<p
						class={actionResult.success ? 'text-center text-green-600' : 'text-center text-red-600'}
					>
						{actionResult.message}
					</p>
					<div class="flex justify-center">
						<button class="btn preset-filled-primary-500" onclick={() => dialog?.close()}
							>Salir</button
						>
					</div>
				{:else if actionLoading}
					<div class="flex justify-center">
						<div
							class="border-surface-300-700 border-t-primary-500 size-10 animate-spin rounded-full border-4"
						></div>
					</div>
				{:else}
					<div class="flex justify-center gap-3">
						<button class="btn preset-filled-success-500" onclick={handleSaldar}>Saldar</button>
						<button class="btn preset-outlined-success-500" onclick={() => (view = 'main')}
							>Cancelar</button
						>
					</div>
				{/if}
			{:else if view === 'confirmDelete'}
				<header class={cHeader}>Confirmar acción</header>
				<p class="text-center">¿Estás seguro de eliminar el caso?</p>
				{#if actionResult}
					<p
						class={actionResult.success ? 'text-center text-green-600' : 'text-center text-red-600'}
					>
						{actionResult.message}
					</p>
					<div class="flex justify-center">
						<button class="btn preset-filled-primary-500" onclick={() => dialog?.close()}
							>Salir</button
						>
					</div>
				{:else if actionLoading}
					<div class="flex justify-center">
						<div
							class="border-surface-300-700 border-t-primary-500 size-10 animate-spin rounded-full border-4"
						></div>
					</div>
				{:else}
					<div class="flex justify-center gap-3">
						<button class="btn preset-filled-error-500" onclick={handleDelete}>Eliminar</button>
						<button class="btn preset-outlined-success-500" onclick={() => (view = 'main')}
							>Cancelar</button
						>
					</div>
				{/if}
			{/if}
		</div>
	{/if}
</dialog>
