<script lang="ts">
	import { getModalStore, ProgressRadial } from '@skeletonlabs/skeleton';
	import { page } from '$app/stores';
	import {  differenceInHours} from "date-fns";
	import { fade } from 'svelte/transition';
	import {modalSchema} from '$lib/components/modalSchema';
	import { ZodError, ZodObject } from 'zod';
	import { PaymentType } from '$lib/utils/paymentsTypes';
	import {typeCases } from '$lib/utils/casesTypes';
	import {Timing } from '$lib/utils/paymentsTypes';
	let loading = false;
	let input_JUS: HTMLInputElement;
	let input_PESOS : HTMLInputElement;	
	let input_quantity_payment : HTMLInputElement;
	let amount_payment : string;
	let case_form : HTMLFormElement;
	let response_state:number |undefined;
	let due_date:Date;
	let isToday:boolean;
	const user = $page.data.user;

	function addThousandSeparator(price: number) {
		return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
	}

	let form : {errors: Record<string, string|undefined|string[]>};
	const isTodayFunction = (today:Date,date:Date) => differenceInHours(today, date) < 24 && differenceInHours(today, date) > -24;
	$:{
		if(due_date){
			const today = new Date();
			today.setHours(-3,0,0,0);
			const dueDate = new Date(due_date);
			isToday = isTodayFunction(today,dueDate);
		}
		
	}
	const {jus_value} = $page.data;
	const modalStore = getModalStore();

	 function validateOrThrow(obj: Object, schema:ZodObject<any, any>) {
    	schema.parse(obj);
	}

	 function manageError(error: any) {
		if (error instanceof ZodError) {
			const { fieldErrors } = error.flatten();
			form = { errors: fieldErrors } ;
      
		}
	}
	async function onFormSubmit() {
	try{
		loading = true;
		const form = new FormData(case_form);
		const data = Object.fromEntries(form.entries());
		validateOrThrow(data,modalSchema);
		const response = await fetch('/api/newCase', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(data),
		});
		loading = false;
		response_state = response.status;
	}
	catch(error){
		loading = false;
		manageError(error);
	}
	}
	
	function verifyDate(){
		const today = new Date();
		today.setHours(-3,0,0,0);
		const dueDate = new Date(due_date);
		return dueDate>=today;
	}
	function onInputTransform(event: Event) {
		const input = event.target as HTMLInputElement;
		const value = input.value.includes('.')&&input===input_PESOS? +(input.value.replace(/\./g, '')): input.value.includes('.')&&input===input_JUS? +input.value.replace(/\./,","): +(input.value.replace(/\,/g, '.'));
		if(isNaN(value)){ 
			input.value = input.value.slice(0,-1);
			return
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
				input_PESOS.value = addThousandSeparator(+value);
				input_JUS.value =(value /jus_value).toFixed(2).replace(/\./,',');
				break;
		}
		
	}

	function calculatePayment(){
		const amount = +(input_PESOS.value).replace(/\./g, '');
		const quantity_payment =+input_quantity_payment.value;
		if(!quantity_payment){
			amount_payment='';
			return;
		}
		amount_payment = addThousandSeparator(+(amount/quantity_payment).toFixed(0));
	}
	
	function verifyPayment(e:Event){
		const input = e.target as HTMLInputElement;
		if(isNaN(+input.value.replace(/\./g, ''))){
				input.value=addThousandSeparator(+input.value.slice(0,-1));
				return;
			}
		if(input_quantity_payment.value==='1'){
			amount_payment= addThousandSeparator(+input_PESOS.value);
			return;
					}
		const totalAmountPesos =  +input_PESOS.value.replace(/\./g, '');
			if(+(amount_payment).replace('\.','')>totalAmountPesos){
				amount_payment = addThousandSeparator(+totalAmountPesos.toFixed(0))
			}
			else{
				amount_payment = addThousandSeparator(+input.value.replace(/\./g, ''));
			}
		}
	
	// Base Classes
	const cBase = 'card p-4  shadow-xl space-y-4';
	const cHeader = 'text-2xl font-bold text-center';
	const cForm = 'border border-surface-500 p-4 space-y-4 rounded-container-token ';
</script>


	<div class="modal-example-form overflow-y-auto {cBase} {response_state?"w-1/3": loading? "w-1/3":"w-3/4"}">
		{#if !response_state}
		<header class={cHeader}>Nuevo caso</header>
		{#if 	loading}
		<div class="flex flex-row justify-center h-22">
			<ProgressRadial class="w-14 h-14" />
		</div>
		{:else}
		<form class="modal-form {cForm}" bind:this={case_form} method="POST">
			<div class="grid grid-cols-2 gap-4">

				<label class="label">
					<span>Cliente</span>
					<input autocomplete="off" class="input" type="text" placeholder="Nombre Cliente" name="clientName" />
				{#if form?.errors && form?.errors['clientName']}
				<span class="text-red-600">{form?.errors['clientName']}</span>
				{/if}
			</label>
			<label class="label">
				<span>Telefono Cliente</span>
				<input autocomplete="off" class="input" type="text"  placeholder="Telefono Cliente" name="clientPhone" />
				{#if form?.errors && form?.errors['clientPhone']}
				<span class="text-red-600">{form?.errors['clientPhone']}</span>
				{/if}
			</label>
			<label class="label">
				<span>Observacion</span>
				<input autocomplete="off" class="input" type="text" placeholder="Observaciones" name="description"/>
				{#if form?.errors && form?.errors['description']}
				<span class="text-red-600">{form?.errors['description']}</span>
				{/if}
			</label>
			<label class="label">
				<span>Tipo de caso</span>
				<select name="type" class="select">
					{#each Object.keys(typeCases) as type}
					<option value={type}>{type}</option>
					{/each}
				</select>
				{#if form?.errors && form?.errors['description']}
				<span class="text-red-600">{form?.errors['description']}</span>
				{/if}
			</label>
			<label class="label">
				<span>Cantidad de JUS</span>
				<input autocomplete="off" class="input" bind:this={input_JUS} on:input={onInputTransform} on:input={calculatePayment}
				type="text" placeholder="JUS" name="amount"/>
				{#if form?.errors && form?.errors['amount']}
				<span class="text-red-600">{form?.errors['amount']}</span>
				{/if}
			</label>
			<label class="label">
				<span>Pesos</span>
				<input autocomplete="off" class="input" type="text"  bind:this={input_PESOS}  on:input={onInputTransform}  on:input={calculatePayment} placeholder="PESOS" />
			</label>
			<label class="label">
				<span>Cantidad de cuotas</span>
				<input autocomplete="off" class="input" type="number" on:input={calculatePayment} bind:this={input_quantity_payment}  placeholder="Cuotas" name="quantity_payment" />
				{#if form?.errors && form?.errors['quantity_payment']}
				<span class="text-red-600">{form?.errors['quantity_payment']}</span>
				{/if}
			</label>
				<label class="label">
				<span>Periodicidad</span>
				<select class="select" name="period">
					<option value={Timing.SEMANAL}>{Timing.SEMANAL}</option>
					<option value={Timing.QUINCENAL}>{Timing.QUINCENAL}</option>
					<option value={Timing.MENSUAL}>{Timing.MENSUAL}</option>
			</label>
			<label class="label">
				<span>Fecha de cobro primer cuota</span>
				<input autocomplete="off" class="input" type="date" bind:value={due_date} on:input={calculatePayment}  placeholder="Fecha Cobro" name="due_date" /> 
				{#if form?.errors && form?.errors['due_date']}
				<span class="text-red-600">{form?.errors['due_date']}</span>
				{/if}
				{#if due_date && !verifyDate()}
				<span class="text-red-600">Fecha pasada</span>
				{/if}
			</label>
			{#if due_date && isToday}
			<label class="label" transition:fade>
				<span>Monto a entregar</span>
				<input autocomplete="off" class="input" type="text"  bind:value={amount_payment} on:input={verifyPayment} placeholder="Monto" name="amount_payment" />
				{#if form?.errors && form?.errors['amount_payment']}
				<span class="text-red-600">{form?.errors['amount_payment']}</span>
				{/if}
			</label>
			<label class="label" transition:fade>
				<span>Metodo de pago</span>
				<select class="select" name="typepayment">
					{#each Object.keys(PaymentType) as type}
					<option value={type}>{type}</option>
					{/each}
				</select>
				{#if form?.errors && form?.errors['typepayment']}
				<span class="text-red-600">{form?.errors['typepayment']}</span>
				{/if}
			</label>
			<label class="label" transition:fade>
				<span>Cobrador</span>
				<input autocomplete="off" class="input" type="text" placeholder="Cobrador" readonly name="collector" value={user.name}/>
			</label>
			{/if}
		</div>
			<button class="btn variant-filled-success" disabled={due_date&&!verifyDate()} on:click|preventDefault={onFormSubmit}>Guardar</button>
		</form>
		{/if}
		{:else if response_state === 201}
		<p class="text-green-600 text-center">Caso creado correctamente</p>
		<div class="flex flex-row justify-center">
			<button class="btn variant-outline-success" on:click={()=>{
				modalStore.close()}}>Salir</button>
		</div>
		{:else}
		<p class="text-red-600 text-center">Hubo un error al guardar.Intente nuevamente</p>
		<div class="flex flex-row justify-center gap-3">
			<button class="btn variant-filled-error" on:click={()=>{response_state=undefined}}>Reintentar</button>
			<button class="btn variant-filled-warning" on:click={()=>{modalStore.close()}}>Salir</button>
		</div>
		{/if}
	</div>