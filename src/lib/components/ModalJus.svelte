<script lang="ts">
	import { getModalStore } from '@skeletonlabs/skeleton';
	import { page } from '$app/stores';
	import { ZodError, ZodObject } from 'zod';
	import { onMount } from 'svelte';
	let case_form : HTMLFormElement;
	let response_state:number |undefined;
	let form : {errors: Record<string, string|undefined|string[]>};
	const {jus_value }= $page.data ?? '0';
	const modalStore = getModalStore();
	 function validateOrThrow(obj: Object, schema:ZodObject<any, any>) {
    	schema.parse(obj);
	}
	let input_JUS:HTMLInputElement;
	
	 function manageError(error: any) {
		if (error instanceof ZodError) {
			const { fieldErrors } = error.flatten();
			form = { errors: fieldErrors } ;
      
		}
	}
	async function onFormSubmit() {
	try{
		const form = new FormData(case_form);
		const data = Object.fromEntries(form.entries());
		
		const response = await fetch('/api/jusValue', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(data),
		});

		response_state = response.status;
	}
	catch(error){
		manageError(error);
	}
	}
	function addThousandSeparator(price: number) {
		return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
	}

	onMount(()=>{
		input_JUS.value= addThousandSeparator(jus_value);
	})
	// Base Classes
	const cBase = 'card p-4 w-1/3 shadow-xl space-y-4';
	const cHeader = 'text-2xl font-bold text-center';
	const cForm = 'border border-surface-500 p-4 space-y-4 rounded-container-token ';
	function onInputTransform(event: Event) {
		const input = (event.target as HTMLInputElement)
		const value = input.value.replace(/\./g, '');
		if(isNaN(+value)){ 
			input.value = input.value.slice(0,-1);
			return;
		}
		input_JUS.value = addThousandSeparator(+value);
	}
</script>


	<div class="modal-example-form  {cBase}">
		{#if !response_state}
		<header class={cHeader}>Valor JUS</header>
		<form class="modal-form {cForm}" bind:this={case_form}>
			<label class="label">
				<span>Valor JUS</span>
				<input class="input"  name="jus_value" on:input={onInputTransform} type="text" bind:this={input_JUS} />
			</label>
			<button class="btn variant-filled-success" on:click={onFormSubmit}>Guardar</button>
		</form>
		{:else if response_state === 200}
		<div>
			<p class="text-green-600 text-center">Se modifico el valor correctamente</p>
		</div>
		<div class="flex flex-row justify-center">
			<button class="btn variant-filled-success" on:click={ ()=>{
				modalStore.close()}}>Salir</button>
		</div>
		{:else}
		<p class="text-red-600 text-center">Hubo un error. Intente nuevamente</p>
		<div class="flex flex-row justify-center gap-3">
			<button class="btn variant-filled-error" on:click={()=>{response_state=undefined}}>Reintentar</button>
			<button class="btn variant-filled-warning" on:click={()=>{
				modalStore.close()}}>Salir</button>
		</div>
		{/if}
	</div>