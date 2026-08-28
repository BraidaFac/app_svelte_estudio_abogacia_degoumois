<script lang="ts">
	import { filterStore } from '$lib/stores/filter';
	import type { FormattedCase } from '$lib/types/case.types';
	import type { ModalContext } from '$lib/types/modal.types';
	import { formatJUS } from '$lib/utils/formatters';
	import { differenceInHours } from 'date-fns';
	import { getContext } from 'svelte';

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

	function verifyDate(date: string | undefined): string | undefined {
		if (typeof date !== 'string' || !/^\d{2}-\d{2}-\d{4}$/.test(date)) return undefined;
		const [day, month, year] = date.split('-').map(Number);
		const dateNow = new Date();
		dateNow.setHours(-3, 0, 0, 0);
		const caseDate = new Date(`${year}-${month}-${day}`);
		caseDate.setHours(-3, 0, 0, 0);
		const diffTime = differenceInHours(caseDate, dateNow);
		if (diffTime < 0) return 'overdue';
		if (diffTime < 24 * 5) return 'soon';
		return 'ontime';
	}
</script>

<div class="px-3 md:mx-auto md:w-1/2">
	<input type="search" class="input" placeholder="Buscar" bind:value={$filterStore} />
</div>

{#if filteredCases.length === 0}
	<div class="text-surface-400 mt-16 flex flex-col items-center gap-4">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="h-16 w-16"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="1"
				d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
			/>
		</svg>
		{#if $filterStore}
			<p class="text-xl">Sin resultados para "<strong>{$filterStore}</strong>"</p>
		{:else}
			<p class="text-xl">No hay casos activos</p>
		{/if}
	</div>
{:else}
	<div class="overflow-x-auto p-2 md:p-4">
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
				{#each filteredCases as caso (caso.id)}
					<tr class={verifyDate(caso.dueDate)}>
						<td>{caso.description}</td>
						<td>{caso.type}</td>
						<td>{caso.clientName}</td>
						<td>{caso.clientPhone}</td>
						<td>{formatJUS(caso.restAmount)}</td>
						<td>{caso.quantityPaymentsToPay}</td>
						<td>{caso.dueDate ?? 'No tiene'}</td>
						<td class="flex justify-center gap-2">
							<button class="btn preset-filled-success-500 btn-sm" onclick={() => openToPay(caso)}
								>Cobrar</button
							>
							<button
								class="btn preset-filled-secondary-500 btn-sm"
								onclick={() => openDetails(caso)}>Detalles</button
							>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<style>
	.table tbody .overdue {
		background-color: rgb(153 27 27);
	}
	.table tbody .soon {
		background-color: rgb(202 138 4);
	}
	.table tbody .ontime {
		background-color: rgb(21 128 61);
	}
</style>
