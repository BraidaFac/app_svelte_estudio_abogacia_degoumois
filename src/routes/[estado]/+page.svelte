<script lang="ts">
	import BackToTop from '$lib/components/BackToTop.svelte';
	import type { ModalContext } from '$lib/types/modal.types';
	import { formatJUS } from '$lib/utils/formatters';
	import { page } from '$app/state';
	import { getContext } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let cases = $derived(data.cases);

	const param = (page.params.estado ?? '').toUpperCase();

	const { openToPay, openDetails } = getContext<ModalContext>('modals');

	const statusConfig: Record<string, { title: string; textClass: string; barClass: string }> = {
		VENCIDO: {
			title: 'Cuotas vencidas',
			textClass: 'text-red-500',
			barClass: 'bg-red-500'
		},
		PROXIMO: {
			title: 'Cuotas por vencer',
			textClass: 'text-amber-500',
			barClass: 'bg-amber-500'
		},
		ATIEMPO: {
			title: 'Cuotas al día',
			textClass: 'text-green-500',
			barClass: 'bg-green-500'
		}
	};

	const config = statusConfig[param] ?? statusConfig['ATIEMPO'];
</script>

<BackToTop />

<section class="p-4">
	<div class="mb-4 flex items-center gap-3">
		<div class="h-8 w-1 rounded-full {config.barClass}"></div>
		<h2 class="text-2xl font-semibold {config.textClass}">{config.title}</h2>
	</div>
	<div class="overflow-x-auto">
		<table class="table min-w-[700px] text-center">
			<thead>
				<tr>
					<th class="text-center">Descripcion</th>
					<th class="text-center">Tipo caso</th>
					<th class="text-center">Nombre cliente</th>
					<th class="text-center">Telefono cliente</th>
					<th class="text-center">Monto a saldar</th>
					<th class="text-center">Cuotas a pagar</th>
					<th class="text-center">Fecha a cobrar</th>
					<th class="text-center">Acciones</th>
				</tr>
			</thead>
			<tbody>
				{#if cases.length === 0}
					<tr>
						<td colspan="8" class="py-8 text-center opacity-60">No hay casos en esta categoría</td>
					</tr>
				{:else}
					{#each cases as caso (caso.id)}
						<tr>
							<td>{caso.description}</td>
							<td>{caso.type}</td>
							<td>{caso.clientName}</td>
							<td>{caso.clientPhone}</td>
							<td>{formatJUS(caso.restAmount)}</td>
							<td>{caso.quantityPaymentsToPay}</td>
							<td>{caso.dueDate ?? '—'}</td>
							<td class="flex justify-center gap-2">
								<button
									class="btn preset-filled-success-500 btn-sm"
									onclick={() => openToPay(caso)}
								>
									Cobrar
								</button>
								<button
									class="btn preset-filled-secondary-500 btn-sm"
									onclick={() => openDetails(caso)}
								>
									Detalles
								</button>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</section>
