<script lang="ts">
	import BurgerBar from '$lib/components/BurgerBar.svelte';
	import type { ModalComponent } from '@skeletonlabs/skeleton';
	import '../app.pcss';
	import type {LayoutData} from './$types';
	export let data : LayoutData;
	import ModalForm from '$lib/components/ModalForm.svelte';
	import { Modal ,getModalStore,initializeStores} from '@skeletonlabs/skeleton';
	import ModalToPay from '$lib/components/ModalToPay.svelte';
	import ModalJus from '$lib/components/ModalJus.svelte';
	import ModalDetalles from '$lib/components/ModalDetalles.svelte';
	initializeStores();
	$: user = data.user;
	
	const modalRegistry: Record<string, ModalComponent> = {
	modal: { ref: ModalForm },
	modalToPay: {ref : ModalToPay},
	modalJus: {ref : ModalJus},
	modalDetalle:{ref:ModalDetalles}
};
const modalStore = getModalStore();

</script>
<Modal components={modalRegistry} />
<nav class="flex flex-row justify-between h-20 items-center nav-bar">
	<div class="ml-3 flex justify-between gap-3 w-1/3">
		<a href="/="><h1 class="text-4xl title">Estudio Degoumois</h1></a>
	</div>
	<div class="w-1/3 flex justify-center">
		{#if user}
		<button class="btn variant-soft-success" on:click|preventDefault={()=>{
			modalStore.trigger({type:'component',component:'modal'})
		}}>Nuevo Caso</button>
		{/if}
	</div>
	
	<div class="mr-3 w-1/3 flex justify-end gap-10 items-center">
		{#if user}
		<span>Hola {user.name}</span>
		<BurgerBar {user}/>
		{/if}
	</div>
</nav>
<slot />

<style>
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400..900&display=swap');
.title{
  font-family: "Cinzel", serif;
  font-optical-sizing: auto;
  font-style: normal;
}
</style>