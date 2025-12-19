<script lang="ts">
	import type { FormattedCase } from '$lib/types/case.types';
	import { formatDateToDMY } from '$lib/utils/formatters';
	import type { Payment } from '@prisma/client';
	import { getModalStore, type ModalSettings } from '@skeletonlabs/skeleton';

	const modalStore = getModalStore();
	const caso = $modalStore[0].meta.caso as FormattedCase;
	const modalToPay: ModalSettings = {
		type: 'component',
		component: 'modalToPay',
		meta: { caso }
	};

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
	<header class={cHeader}>Detalles: {caso.description}</header>
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
