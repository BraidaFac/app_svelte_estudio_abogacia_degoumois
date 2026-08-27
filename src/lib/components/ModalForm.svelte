<script lang="ts">
	import { page } from '$app/state';
	import { modalSchema } from '$lib/components/modalSchema';
	import { typeCases } from '$lib/utils/casesTypes';
	import { PaymentType, Timing } from '$lib/utils/paymentsTypes';
	import { differenceInHours } from 'date-fns';
	import { fade } from 'svelte/transition';
	import { addThousandSeparator } from '$lib/utils/formatters';
	import { validateOrThrow, manageFormError } from '$lib/utils/form';

	let { dialog = $bindable<HTMLDialogElement | undefined>() }: { dialog?: HTMLDialogElement } =
		$props();

	let loading = $state(false);
	let input_JUS = $state<HTMLInputElement | undefined>();
	let input_PESOS = $state<HTMLInputElement | undefined>();
	let input_quantity_payment = $state<HTMLInputElement | undefined>();
	let amount_payment = $state('');
	let case_form = $state<HTMLFormElement | undefined>();
	let response_state = $state<number | undefined>();
	let due_date = $state<Date | undefined>();
	let isToday = $state(false);
	let formErrors = $state<{ errors: Record<string, string | undefined | string[]> } | undefined>();

	const user = page.data.user;
	const { jus_value } = page.data;

	const isTodayFunction = (today: Date, date: Date) =>
		differenceInHours(today, date) < 24 && differenceInHours(today, date) > -24;

	$effect(() => {
		if (due_date) {
			const today = new Date();
			today.setHours(-3, 0, 0, 0);
			const dueDate = new Date(due_date);
			isToday = isTodayFunction(today, dueDate);
		}
	});

	async function onFormSubmit() {
		try {
			loading = true;
			const form = new FormData(case_form!);
			const data = Object.fromEntries(form.entries());
			validateOrThrow(data, modalSchema);
			const response = await fetch('/api/newCase', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			});
			loading = false;
			response_state = response.status;
		} catch (error) {
			loading = false;
			formErrors = { errors: manageFormError(error) };
		}
	}

	function verifyDate() {
		const today = new Date();
		today.setHours(-3, 0, 0, 0);
		const dueDate = new Date(due_date!);
		return dueDate >= today;
	}

	function onInputTransform(event: Event) {
		const input = event.target as HTMLInputElement;
		const lastChar = input.value.slice(-1);

		if (lastChar === '.') {
			input.value = input.value.slice(0, -1);
			return;
		}

		if (input === input_JUS) {
			if (lastChar && !/[\d,]/.test(lastChar)) {
				input.value = input.value.slice(0, -1);
				return;
			}
			if (lastChar === ',' && (input.value.match(/,/g) || []).length > 1) {
				input.value = input.value.slice(0, -1);
				return;
			}
		} else if (input === input_PESOS) {
			if (lastChar && !/\d/.test(lastChar)) {
				input.value = input.value.slice(0, -1);
				return;
			}
		}

		const cleanValue = input.value.replace(/\./g, '').replace(',', '.');
		const numericValue = +cleanValue;

		if (cleanValue && isNaN(numericValue)) {
			input.value = input.value.slice(0, -1);
			return;
		}

		if (!cleanValue) {
			input_JUS!.value = '';
			input_PESOS!.value = '';
			return;
		}

		if (input === input_JUS) {
			const pesosValue = numericValue * jus_value;
			input_PESOS!.value = addThousandSeparator(Math.round(pesosValue));
		} else if (input === input_PESOS) {
			input_PESOS!.value = addThousandSeparator(numericValue);
			const jusValue = numericValue / jus_value;
			input_JUS!.value = jusValue.toFixed(3).replace('.', ',');
		}
	}

	function calculatePayment() {
		const amount = +input_PESOS!.value.replace(/\./g, '');
		const quantity_payment = +input_quantity_payment!.value;
		if (!quantity_payment) {
			amount_payment = '';
			return;
		}
		amount_payment = addThousandSeparator(Math.round(amount / quantity_payment));
	}

	function verifyQuantityPayment(e: Event) {
		const input = e.target as HTMLInputElement;
		input.value = input.value.replace(/[^\d]/g, '');
	}

	function verifyPayment(e: Event) {
		const input = e.target as HTMLInputElement;
		const lastChar = input.value.slice(-1);

		if (lastChar && !/\d/.test(lastChar)) {
			input.value = input.value.slice(0, -1);
			return;
		}

		const numericValue = +input.value.replace(/\./g, '');

		if (input.value && isNaN(numericValue)) {
			input.value = input.value.slice(0, -1);
			return;
		}

		if (input_quantity_payment!.value === '1') {
			amount_payment = addThousandSeparator(+input_PESOS!.value.replace(/\./g, ''));
			return;
		}

		const totalAmountPesos = +input_PESOS!.value.replace(/\./g, '');

		if (numericValue > totalAmountPesos) {
			amount_payment = addThousandSeparator(totalAmountPesos);
		} else {
			amount_payment = addThousandSeparator(numericValue);
		}
	}

	function handleClose() {
		dialog?.close();
		response_state = undefined;
		formErrors = undefined;
		loading = false;
	}

	const cBase = 'card p-4 shadow-xl space-y-4';
	const cHeader = 'text-2xl font-bold text-center';
	const cForm = 'border border-surface-500 p-4 space-y-4 rounded-xl';
</script>

<dialog bind:this={dialog}>
	<div
		class="modal-example-form overflow-y-auto {cBase} {response_state
			? 'w-1/3'
			: loading
				? 'w-1/3'
				: 'w-3/4'}"
	>
		{#if !response_state}
			<header class={cHeader}>Nuevo caso</header>
			{#if loading}
				<div class="h-22 flex flex-row justify-center">
					<div
						class="size-14 animate-spin rounded-full border-4 border-surface-300-700 border-t-primary-500"
					></div>
				</div>
			{:else}
				<form class="modal-form {cForm}" bind:this={case_form} method="POST">
					<div class="grid grid-cols-2 gap-4">
						<label class="label">
							<span>Cliente</span>
							<input
								autocomplete="off"
								class="input"
								type="text"
								placeholder="Nombre Cliente"
								name="clientName"
							/>
							{#if formErrors?.errors?.['clientName']}
								<span class="text-red-600">{formErrors.errors['clientName']}</span>
							{/if}
						</label>
						<label class="label">
							<span>Telefono Cliente</span>
							<input
								autocomplete="off"
								class="input"
								type="text"
								placeholder="Telefono Cliente"
								name="clientPhone"
							/>
							{#if formErrors?.errors?.['clientPhone']}
								<span class="text-red-600">{formErrors.errors['clientPhone']}</span>
							{/if}
						</label>
						<label class="label">
							<span>Observacion</span>
							<input
								autocomplete="off"
								class="input"
								type="text"
								placeholder="Observaciones"
								name="description"
							/>
							{#if formErrors?.errors?.['description']}
								<span class="text-red-600">{formErrors.errors['description']}</span>
							{/if}
						</label>
						<label class="label">
							<span>Tipo de caso</span>
							<select name="type" class="select">
								{#each Object.keys(typeCases) as type}
									<option value={type}>{type}</option>
								{/each}
							</select>
						</label>
						<label class="label">
							<span>Cantidad de JUS</span>
							<input
								autocomplete="off"
								class="input"
								bind:this={input_JUS}
								oninput={onInputTransform}
								type="text"
								placeholder="JUS"
								name="amount"
							/>
							{#if formErrors?.errors?.['amount']}
								<span class="text-red-600">{formErrors.errors['amount']}</span>
							{/if}
						</label>
						<label class="label">
							<span>Pesos</span>
							<input
								autocomplete="off"
								class="input"
								type="text"
								bind:this={input_PESOS}
								oninput={(e) => {
									onInputTransform(e);
									calculatePayment();
								}}
								placeholder="PESOS"
							/>
						</label>
						<label class="label">
							<span>Cantidad de cuotas</span>
							<input
								autocomplete="off"
								class="input"
								type="text"
								inputmode="numeric"
								oninput={(e) => {
									verifyQuantityPayment(e);
									calculatePayment();
								}}
								bind:this={input_quantity_payment}
								placeholder="Cuotas"
								name="quantity_payment"
							/>
							{#if formErrors?.errors?.['quantity_payment']}
								<span class="text-red-600">{formErrors.errors['quantity_payment']}</span>
							{/if}
						</label>
						<label class="label">
							<span>Periodicidad</span>
							<select class="select" name="period">
								<option value={Timing.SEMANAL}>{Timing.SEMANAL}</option>
								<option value={Timing.QUINCENAL}>{Timing.QUINCENAL}</option>
								<option value={Timing.MENSUAL}>{Timing.MENSUAL}</option>
							</select></label
						>
						<label class="label">
							<span>Fecha de cobro primer cuota</span>
							<input
								autocomplete="off"
								class="input"
								type="date"
								bind:value={due_date}
								oninput={calculatePayment}
								placeholder="Fecha Cobro"
								name="due_date"
							/>
							{#if formErrors?.errors?.['due_date']}
								<span class="text-red-600">{formErrors.errors['due_date']}</span>
							{/if}
							{#if due_date && !verifyDate()}
								<span class="text-red-600">Fecha pasada</span>
							{/if}
						</label>
						{#if due_date && isToday}
							<label class="label" transition:fade>
								<span>Monto a entregar</span>
								<input
									autocomplete="off"
									class="input"
									type="text"
									bind:value={amount_payment}
									oninput={verifyPayment}
									placeholder="Monto"
									name="amount_payment"
								/>
								{#if formErrors?.errors?.['amount_payment']}
									<span class="text-red-600">{formErrors.errors['amount_payment']}</span>
								{/if}
							</label>
							<label class="label" transition:fade>
								<span>Metodo de pago</span>
								<select class="select" name="typepayment">
									{#each Object.keys(PaymentType) as type}
										<option value={type}>{type}</option>
									{/each}
								</select>
								{#if formErrors?.errors?.['typepayment']}
									<span class="text-red-600">{formErrors.errors['typepayment']}</span>
								{/if}
							</label>
							<label class="label" transition:fade>
								<span>Cobrador</span>
								<input
									autocomplete="off"
									class="input"
									type="text"
									placeholder="Cobrador"
									readonly
									name="collector"
									value={user.name}
								/>
							</label>
						{/if}
					</div>
					<button
						class="btn preset-filled-success-500"
						disabled={due_date && !verifyDate()}
						onclick={(e) => {
							e.preventDefault();
							onFormSubmit();
						}}>Guardar</button
					>
				</form>
			{/if}
		{:else if response_state === 201}
			<p class="text-center text-green-600">Caso creado correctamente</p>
			<div class="flex flex-row justify-center">
				<button class="btn preset-outlined-success-500" onclick={handleClose}>Salir</button>
			</div>
		{:else}
			<p class="text-center text-red-600">Hubo un error al guardar. Intente nuevamente</p>
			<div class="flex flex-row justify-center gap-3">
				<button class="btn preset-filled-error-500" onclick={() => (response_state = undefined)}
					>Reintentar</button
				>
				<button class="btn preset-filled-warning-500" onclick={handleClose}>Salir</button>
			</div>
		{/if}
	</div>
</dialog>
