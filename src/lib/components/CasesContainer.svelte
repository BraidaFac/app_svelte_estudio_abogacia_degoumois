<script lang="ts">
	import { createSearchStore, filterStore, searchHandler } from '$lib/stores/filter';
	import { getModalStore, type ModalSettings } from '@skeletonlabs/skeleton';
	import { differenceInHours } from 'date-fns';
	import { onDestroy } from 'svelte';
	export let cases;

	const modalStore = getModalStore();

	const modalToPay: ModalSettings = {
		type: 'component',
		component: 'modalToPay',
		meta: {}
	};
	const modalDetalle: ModalSettings = {
		type: 'component',
		component: 'modalDetalle',
		meta: {}
	};

	const searchStore = createSearchStore(cases);

	const unsubscribe = searchStore.subscribe((model: any) => searchHandler(model));

	onDestroy(() => {
		unsubscribe();
	});

	// Crear el store de búsqueda
	// Sincronizar el valor de `filterStore` con `searchStore.search`
	$: $searchStore.search = $filterStore;

	function verifyDate(date: string | number | undefined) {
		if (typeof date !== 'string' || !/^\d{2}-\d{2}-\d{4}$/.test(date) || !date) {
			return;
		}
		const [day, month, year] = date.split('-').map(Number);
		const dateNow = new Date();
		dateNow.setHours(-3, 0, 0, 0);
		const caseDate = new Date(`${year}-${month}-${day}`);
		caseDate.setHours(-3, 0, 0, 0);
		const diffTime = differenceInHours(caseDate, dateNow);
		if (diffTime < 0) {
			return 'overdue';
		} else if (diffTime < 24 * 5) {
			return 'soon';
		} else {
			return 'ontime';
		}
	}
</script>

<div class="px-3 md:mx-auto md:w-1/2">
	<input type="search" class="input" placeholder="Buscar" bind:value={$filterStore} />
</div>
<div class="table-container p-2 md:p-4">
	{#if $searchStore.filtered.length !== 0}
		<table class="table table-interactive text-center">
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
			<tbody
				>{#if $searchStore.filtered.length === 0}
					<tr>
						<td colspan="7">No existen</td>
					</tr>
				{:else}
					{#each $searchStore.filtered as caso}
						<tr class={verifyDate(caso.dueDate)}>
							<td>{caso.description}</td>
							<td>{caso.type}</td>
							<td>{caso.clientName}</td>
							<td>{caso.clientPhone}</td>
							<td>{caso.restAmount.toString().replace(/\./, ',')} JUS</td>
							<td>{caso.quantityPaymentsToPay}</td>
							<td>{caso.dueDate ?? 'No tiene'}</td>
							<td class="flex justify-center gap-2">
								<button
									class="variant-filled-success btn h-6"
									on:click={() => {
										modalToPay.meta = { caso };
										modalStore.trigger(modalToPay);
									}}
									>Cobrar
								</button>
								<button
									class="variant-filled-secondary btn h-6"
									on:click={() => {
										modalDetalle.meta = { caso };
										modalStore.trigger(modalDetalle);
									}}
									>Detalles
								</button>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	{/if}
</div>
``

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
