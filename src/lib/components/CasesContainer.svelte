<script lang="ts">
	import { createSearchStore, searchHandler } from '$lib/stores/filter';
	import { getModalStore, type ModalSettings } from '@skeletonlabs/skeleton';
	import { differenceInHours } from 'date-fns';
	import { onDestroy } from 'svelte';
	export let cases;
	
    const modalStore = getModalStore();

	const modalToPay: ModalSettings = {
	type: 'component',
	component: 'modalToPay',
	meta: {}
	}
const modalDetalle: ModalSettings = {
	type: 'component',
	component: 'modalDetalle',
	meta: {}
	}
	let filter = '';
	//filter
	const searchProducts = cases.map((caso) => ({
		...caso,
		searchTerms: `${caso.description} ${caso.type} ${caso.clientName}`
	}));
	const searchStore = createSearchStore(searchProducts);

	const unsubscribe = searchStore.subscribe((model: any) => searchHandler(model));

	onDestroy(() => {
		unsubscribe();
	});


	$: {
		
		if (filter.length > 1) {
			$searchStore.search = filter;
		} else {
			
			$searchStore.search = undefined;
		}
	}
	
	
	function verifyDate(date: string) {
		const [day, month, year] = date.split('/');
		const dateNow = new Date();
		dateNow.setHours(-3,0,0,0);
		const caseDate = new Date(`${year}-${month}-${day}`);
		caseDate.setHours(-3,0,0,0);
		const diffTime = differenceInHours(caseDate, dateNow);
		if(diffTime < 0){
			return 'overdue';
		}
		else if(diffTime < 24*5){
			return 'soon'
		}
		else{
			return 'ontime';
		}
		
	}
</script>

<div class="md:w-1/2 md:mx-auto px-3">
	<input type="search" class="input" placeholder="Buscar" bind:value={filter} />
</div>
<div class="table-container md:p-4 p-2">
	{#if $searchStore.filtered.length !== 0}
		<table class="table table-interactive text-center">
			<thead >
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
			<tbody>{
				#if $searchStore.filtered.length === 0}
				<tr>
					<td colspan="7">No existen</td>
				</tr>
				{:else}
				{#each $searchStore.filtered as caso}
				<tr class={verifyDate(caso.dueDate)}>
					<td >{caso.description}</td>
					<td>{caso.type}</td>
					<td >{caso.clientName}</td>
					<td >{caso.clientPhone}</td>
					<td >{caso.restAmount.toString().replace(/\./,',')} JUS</td>
					<td >{caso.quantityPaymentsToPay}</td>
					<td >{caso.dueDate}</td>
					<td class="flex gap-2 justify-center">
						<button class="btn variant-filled-success h-6"
							on:click={() => {
								modalToPay.meta = {caso};
								modalStore.trigger(modalToPay);
								}}>Cobrar
						</button>
						<button class="btn variant-filled-secondary h-6"
								on:click={() => {
								modalDetalle.meta = {caso};
								modalStore.trigger(modalDetalle);
								}}>Detalles
						</button>
					</td>
				</tr>
				{/each}
				{/if}
			</tbody>
		</table>
	{/if}
</div>


<style>
	.table tbody .overdue{
		background-color: rgb(153 27 27 );
	}
	.table tbody .soon{
		background-color: rgb(202 138 4);
	}
	.table tbody .ontime{
		background-color: rgb(21 128 61 );
	}
</style>