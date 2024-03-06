<script lang="ts">
	import { getModalStore, type ModalSettings} from '@skeletonlabs/skeleton';
	import {page} from '$app/stores';
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
    const modalStore = getModalStore();
	const param =  $page.params.estado;
	let previousModalValue:ModalSettings|undefined= $modalStore[0];
	let activeBtn = false;
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
export let data;
let cases:any;
$:{
	if(data?.cases){
		cases= data.cases
	}
}
 $:{  if(!$modalStore[0] && previousModalValue){
	invalidateAll();
	previousModalValue=$modalStore[0]
	}}
$:{
	if($modalStore[0]){
		previousModalValue=$modalStore[0]
	}
} 
onMount(()=>{
	document.addEventListener('scroll',()=>{
		const navBar = document.querySelector('.nav-bar');
		if(navBar&& window.scrollY  > navBar.clientHeight+100){ 
			activeBtn= true;
		}
		else{
			activeBtn= false;
		}
	})
})

</script>
{#if param.toUpperCase() === "VENCIDO"}
{#if activeBtn}
		<button class="btn h-8 variant-filled-warning fixed bottom-5 left-1/2" on:click={()=>{
			document.documentElement.scrollTop = 0;
		}}>Volver</button>
		{/if}
	<section >
		<p class="text-3xl bg-red-800 rounded-md text-center">Cuotas vencidas</p>
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
				#if cases.length === 0}
				<tr>
					<td colspan="8">No existen</td>
				</tr>
				{:else}
				{#each cases as caso}
				<tr>
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
	</section>
	{:else if param.toUpperCase() === "PROXIMO"}
	{#if activeBtn}
		<button class="btn h-8 variant-filled-warning fixed bottom-5 left-1/2" on:click={()=>{
			document.documentElement.scrollTop = 0;
		}}>Volver</button>
		{/if}
	<section >
		<p class="text-3xl bg-yellow-600 rounded-md text-center">Cuotas por vencer</p>
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
			<tbody>{
				#if cases.length === 0}
				<tr>
					<td colspan="8">No existen</td>
				</tr>
				{:else}
				{#each cases as caso}
				<tr>
					<td>{caso.description}</td>
					<td>{caso.type}</td>
					<td>{caso.clientName}</td>
					<td>{caso.clientPhone}</td>
					<td>{caso.restAmount.toString().replace(/\./,',')} JUS</td>
					<td>{caso.quantityPaymentsToPay}</td>
					<td>{caso.dueDate}</td>

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
	</section>
	{:else}
	{#if activeBtn}
		<button class="btn h-8 variant-filled-warning fixed bottom-5 left-1/2" on:click={()=>{
			document.documentElement.scrollTop = 0;
		}}>Volver</button>
		{/if}
	<section class="">
		<p class="text-3xl bg-green-700  rounded-md text-center ">Cuotas a tiempo</p>
		<table class="table table-interactive text-center">
			<thead>
				<tr >
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
				#if cases.length === 0}
				<tr>
					<td colspan="8">No existen</td>
				</tr>
				{:else}
				{#each cases as caso}
				<tr>
					<td>{caso.description}</td>
					<td>{caso.type}</td>
					<td>{caso.clientName}</td>
					<td>{caso.clientPhone}</td>
					<td>{caso.restAmount.toString().replace(/\./,',')} JUS</td>
					<td>{caso.quantityPaymentsToPay}</td>
					<td>{caso.dueDate}</td>

					<td class="flex gap-2 justify-center">
						<button class="btn variant-filled-success h-6"
							on:click={() => {
								modalToPay.meta = {caso};
								modalStore.trigger(modalToPay);
								}}>Cobrar
						</button>
						<button class="btn variant-filled-secondary h-6"
							on:click={() => {
								modalDetalle.meta= {caso};
								modalStore.trigger(modalDetalle);
								}}>Detalles
						</button>
					</td>
				</tr>
				{/each}
				{/if}
			</tbody>
		</table>
	</section>
	{/if}
	
