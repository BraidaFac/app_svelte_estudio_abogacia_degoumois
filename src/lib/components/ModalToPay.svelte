<script lang="ts">
	import { getModalStore } from '@skeletonlabs/skeleton';
	import { page } from '$app/stores';
	import { ZodError, ZodObject } from 'zod';
	import { paymentSchema } from '$lib/components/paymentSchema';
	import {PaymentType} from '$lib/utils/paymentsTypes';
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';
	let input_JUS: HTMLInputElement;
	let input_PESOS : HTMLInputElement;	
	let case_form : HTMLFormElement;
	let response_state:number |undefined;
	let form : {errors: Record<string, string|undefined|string[]>};
	const {jus_value} = $page.data;
	const modalStore = getModalStore();
    const caso = $modalStore[0].meta.caso;
	 function validateOrThrow(obj: Object, schema:ZodObject<any, any>) {
    	schema.parse(obj);
	}
	
	function addThousandSeparator(price: number) {
		return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
	}

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
		validateOrThrow(data,paymentSchema);
		const response = await fetch('/api/newPayment', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(data),
		});

		response_state = response.status;
		if(response.status === 200&& $page.url.pathname === '/'){
			invalidate('update:cases')
		}
	}
	catch(error){
		manageError(error);
	}
	}
	
	function onInputTransform(event: Event) {
		const input = event.target as HTMLInputElement;
		if(input ===input_PESOS){
			input.value= addThousandSeparator(+input.value.replace(/\./g, ''));
		}
		const value = input.value.includes('.')&&input===input_PESOS? +(input.value.replace(/\./g, '')): input.value.includes('.')&&input===input_JUS? +input.value.replace(/\./,","): +(input.value.replace(/\,/g, '.'));
		if(isNaN(value)) {
			input.value = input.value.slice(0,-1);
			return;
		}
		if(caso.quantityPaymentsToPay === 1){
			input_JUS.value = caso.restAmount.toFixed(1).replace(/\./,',');
			input_PESOS.value = addThousandSeparator(+(+caso.restAmount * jus_value).toFixed(0));
			return;
		}
		if(!value) {
			input_JUS.value = '';
			input_PESOS.value = '';
			return;
		};
		switch (input){
			case input_JUS:
				input_PESOS.value = addThousandSeparator(+(value * jus_value).toFixed(0));
				break;
			case input_PESOS:
				input_JUS.value =(value /jus_value).toFixed(1).replace(/\./,',');
				break;
		}
		
	}

	function verifyPayment(e:Event){
		if(e.target===input_JUS){
			const amount = +(input_JUS.value.replace(/\./g,','));	
			if(amount>caso.restAmount){
				input_JUS.value = (caso.restAmount.toFixed(1)).replace(/\./g,',');
				input_PESOS.value = addThousandSeparator(+(+caso.restAmount * jus_value).toFixed(0));
			}
		}
		else{
			const amount_pesos = input_PESOS.value.replace(/\./g,'');		
			if(+(+amount_pesos/jus_value).toFixed(1) > +(caso.restAmount).toFixed(1)){
				input_PESOS.value = (caso.restAmount * jus_value).toFixed(0);
			}
		}
	}
	function calculatePaymentNumber(){
		const quantityPayments = caso.payments.length;
		const quantityPaymentsToPay = caso.quantityPaymentsToPay;
		return quantityPayments - quantityPaymentsToPay +1;
	}
	function calculatePayment(){
		const quantityPaymentToPay = caso.quantityPaymentsToPay;
		let amountToPay= caso.restAmount;
		let amountJus;
		if(quantityPaymentToPay === 1) {
			amountJus = amountToPay.toFixed(1);
		}
		else{
			amountJus = ((amountToPay / quantityPaymentToPay)).toFixed(1);

		}
		input_JUS.value = amountJus.replace(/\./,',');
		input_PESOS.value = addThousandSeparator(+(+amountJus * jus_value).toFixed(0));
	}
	onMount(()=>{
		calculatePayment();
		
	})
	// Base Classes
	const cBase = 'card p-4  shadow-xl space-y-4';
	const cHeader = 'text-2xl font-bold text-center';
	const cForm = 'border border-surface-500 p-4 space-y-4 rounded-container-token ';
</script>


	<div class="modal-example-form  overflow-y-auto {cBase} {response_state?"w-1/3":"w-3/4"}">
		{#if !response_state}
		<header class={cHeader}>Cobrar</header>
		<form class="modal-form {cForm}" bind:this={case_form}>
            <input hidden type="text" name="caseId" value={caso.id}/>
			<div class="grid grid-cols-2 gap-4">
				<label class="label">
					<span>Cliente</span>
					<input class="input" readonly type="text"  value={caso.clientName} />
			</label>
			<label class="label">
				<span>Observacion</span>
				<input class="input" readonly type="text" value={caso.description}/>
			</label>
			<label class="label">
				<span>Cuota numero</span>
				<input class="input" name="paymentNumber" readonly type="text" value={calculatePaymentNumber()}/>
			</label>
			<label class="label">
				<span>Total JUS</span>
				<input class="input"  readonly type="text" value={`${caso.amount.toFixed(1).replace('\.',',')}`}/>
			</label>
			<label class="label">
				<span>Adeuda JUS</span>
				<input class="input" readonly  style="color:red"type="text" value={`${caso.restAmount.toFixed(1).replace('\.',',')}`}/>
			</label>
			<label class="label">
				<span>Cantidad de JUS</span>
				<input class="input" bind:this={input_JUS} on:input={verifyPayment} on:input={onInputTransform} type="text" placeholder="JUS" name="amount"/>
				{#if form?.errors && form?.errors['amount']}
				<span class="text-red-600">{form?.errors['amount']}</span>
				{/if}
			</label>
			<label class="label">
				<span>Pesos</span>
				<input class="input" type="text"   bind:this={input_PESOS} on:input={verifyPayment} on:input={onInputTransform}  placeholder="PESOS" />
			</label>
			<label class="label">
				<span>Metodo de pago</span>
				<select class="select" name="typepayment">
					{#each Object.keys(PaymentType) as type}
					<option value={type}>{type}</option>
					{/each}
				</select>
			</label>
			<label class="label">
				<span>Cobrador</span>
				<input class="input" type="text"  name="collector" placeholder="Cobrador" />
				{#if form?.errors && form?.errors['collector']}
				<span class="text-red-600">{form?.errors['collector']}</span>
				{/if}
			</label>
		</div>
			<button class="btn variant-filled-success" on:click={onFormSubmit}>Pagar</button>
		</form>
		{:else if response_state === 200}
		<div>
			<p class="text-green-600 text-center">Pago generado correctamente</p>
		</div>

		<div class="flex flex-row justify-center gap-3">
			<button class="btn variant-filled-success" on:click={ ()=>{
				modalStore.close()}}>Salir</button>
		</div>
		{:else}
		<p class="text-red-600 text-center ">Hubo un error. Intente nuevamente</p>
		<div class="flex flex-row justify-center gap-3">
			<button class="btn variant-filled-error" on:click={()=>{response_state=undefined}}>Reintentar</button>
			<button class="btn variant-filled-warning" on:click={()=>{
				modalStore.close()}}>Salir</button>
		</div>
		{/if}
	</div>