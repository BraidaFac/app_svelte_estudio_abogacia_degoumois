<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { FormattedCase } from '$lib/types/case.types';
	import { formatDateToDMY } from '$lib/utils/formatters';
	import type { Payment } from '@prisma/client';
	import { getModalStore, type ModalSettings } from '@skeletonlabs/skeleton';
	import { onMount } from 'svelte';

	const modalStore = getModalStore();
	const caso = $modalStore[0].meta.caso as FormattedCase;
	const modalToPay: ModalSettings = {
		type: 'component',
		component: 'modalToPay',
		meta: { caso }
	};

	let menuOpen = false;

	const modalAlert: ModalSettings = {
		type: 'alert',
		modalClasses: 'p-6'
	};

	const modalDetalle: ModalSettings = {
		type: 'component',
		component: 'modalDetalle',
		meta: { caso }
	};

	const modalConfirmSaldar: ModalSettings = {
		type: 'confirm',
		title: 'Confirmar acción',
		body: '¿Estás seguro de saldar el caso? Esto pondrá el monto restante en 0.',
		modalClasses: 'p-6',
		buttonTextConfirm: 'Saldar',
		buttonTextCancel: 'Cancelar',
		response: async (r: boolean) => {
			if (r) {
				const data = new FormData();
				data.append('caseId', caso.id.toString());
				data.append('action', 'saldar');
				const response = await fetch('/api/updateCase', {
					method: 'POST',
					body: data
				});
				if (response.status !== 200) {
					const error = (await response.json()).error?.message || 'Error al saldar caso';
					modalAlert.title = 'Error';
					modalAlert.body = error;
					modalStore.trigger(modalAlert);
				} else {
					modalAlert.title = 'Éxito';
					modalAlert.body = 'Se ha saldado el caso correctamente';
					modalStore.trigger(modalAlert);
					invalidateAll();
				}
			} else {
				// Si cancela, volver a abrir el modal de detalles
				setTimeout(() => {
					modalStore.trigger(modalDetalle);
				}, 100);
			}
		}
	};

	const modalConfirm: ModalSettings = {
		type: 'confirm',
		title: 'Confirmar acción',
		body: '¿Estás seguro de eliminar el caso?',
		modalClasses: 'p-6',
		buttonTextConfirm: 'Eliminar',
		buttonTextCancel: 'Cancelar',
		response: async (r: boolean) => {
			if (r) {
				const data = new FormData();
				data.append('caseId', caso.id.toString());
				const response = await fetch('/historial', {
					method: 'POST',
					body: data
				});
				if (response.status !== 200) {
					const error = (await response.json()).error.message;
					modalAlert.title = 'Error';
					modalAlert.body = error;
					modalStore.trigger(modalAlert);
				} else {
					modalAlert.title = 'Éxito al eliminar';
					modalAlert.body = 'Se ha eliminado el caso correctamente';
					modalStore.trigger(modalAlert);
					invalidateAll();
				}
			} else {
				// Si cancela, volver a abrir el modal de detalles
				setTimeout(() => {
					modalStore.trigger(modalDetalle);
				}, 100);
			}
		}
	};

	onMount(() => {
		const handleClick = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			if (!target.closest('.menu-container')) {
				menuOpen = false;
			}
		};

		// Agregar el evento con un pequeño delay para evitar que se cierre inmediatamente
		setTimeout(() => {
			document.addEventListener('click', handleClick);
		}, 0);

		return () => {
			document.removeEventListener('click', handleClick);
		};
	});

	function toggleMenu(e: Event) {
		e.stopPropagation();
		menuOpen = !menuOpen;
	}

	function handleSaldar() {
		menuOpen = false;
		// Cerrar el modal actual antes de abrir el de confirmación
		modalStore.close();
		// Abrir el modal de confirmación después de un breve delay
		setTimeout(() => {
			modalStore.trigger(modalConfirmSaldar);
		}, 150);
	}

	function handleDelete() {
		menuOpen = false;
		// Cerrar el modal actual antes de abrir el de confirmación
		modalStore.close();
		// Abrir el modal de confirmación después de un breve delay
		setTimeout(() => {
			modalStore.trigger(modalConfirm);
		}, 150);
	}

	interface FormattedPaymentDisplay extends Omit<Payment, 'due_date'> {
		due_date: string | undefined;
	}

	const payments: FormattedPaymentDisplay[] =
		caso.restAmount > 0
			? caso.payments.map((p: Payment) => ({
					...p,
					due_date: formatDateToDMY(p.due_date)
				}))
			: caso.payments
					.filter((p: Payment) => p.payment_date)
					.map((p: Payment) => ({
						...p,
						due_date: formatDateToDMY(p.due_date)
					}));

	// Base Classes
	const cBase = 'card p-6 w-full max-w-4xl shadow-xl space-y-4';
	const cHeader = 'text-2xl font-bold text-center';
	const cDiv = 'border border-surface-500 p-4 rounded-container-token overflow-x-auto';
</script>

<div class="modal-example-form overflow-y-auto {cBase}">
	<header class="relative {cHeader}">
		<span>Detalles: {caso.description}</span>
		<div class="menu-container absolute top-0 right-0">
			<button
				class="p-2 hover:bg-surface-200-700-token rounded transition-colors"
				on:click={toggleMenu}
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
				<div
					class="absolute  right-0 mt-2 w-48 rounded-md shadow-lg bg-transparent ring-1 ring-black ring-opacity-5 z-10"
				>
					<div class="py-1 space-y-2 bg-transparent" role="menu" aria-orientation="vertical">
						<button
							class="block w-full bg-gray-600  rounded-lg text-left px-4 py-2 text-sm hover:bg-surface-200-700-token transition-colors"
							on:click={handleSaldar}
						>
							Saldar
						</button>
						<button
							class="block w-full  bg-gray-600 rounded-lg text-left px-4 py-2 text-sm hover:bg-surface-200-700-token transition-colors"
							on:click={handleDelete}
						>
							Eliminar caso
						</button>
					</div>
				</div>
			{/if}
		</div>
	</header>
	<div class={cDiv}>
		<!-- Encabezados de la tabla -->
		<div class="grid grid-cols-[1fr_1fr_1.5fr_1fr] gap-4 pb-3 border-b border-surface-300 font-semibold text-sm">
			<div class="text-center">Cuota</div>
			<div class="text-center">Fecha</div>
			<div class="text-center">Cobrador</div>
			<div class="text-center">Monto/Acción</div>
		</div>
		
		<!-- Lista de pagos -->
		<div class="space-y-2 mt-3">
			{#each payments as p}
				<div class="grid grid-cols-[1fr_1fr_1.5fr_1fr] gap-4 items-center py-2 px-2 rounded hover:bg-surface-100-800-token transition-colors">
					<div class="text-center text-sm">Nº {p.payment_number}</div>
					<div class="text-center text-sm">{p.due_date}</div>
					<div class="text-center text-sm">
						{p.collector || '-'}
					</div>
					{#if p.current}
						<div class="flex justify-center">
							<button
								class="variant-filled-success btn btn-sm"
								on:click={() => {
									modalStore.close();
									modalStore.trigger(modalToPay);
								}}
								>Cobrar
							</button>
						</div>
					{:else if p.payment_date}
						<div class="text-center text-sm font-medium text-success-600-300-token">
							{p.amount?.toString().replace(/\./, ',') ?? '0'} JUS
						</div>
					{:else}
						<div class="text-center text-sm text-surface-400">-</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
	<div class="flex flex-row justify-end pt-2">
		<button
			class="variant-filled-primary btn"
			on:click={() => {
				modalStore.close();
			}}>Salir</button
		>
	</div>
</div>
