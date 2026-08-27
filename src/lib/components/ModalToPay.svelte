<script lang="ts">
	import { page } from '$app/state';
	import { addThousandSeparator } from '$lib/utils/formatters';
	import { validateOrThrow, manageFormError } from '$lib/utils/form';
	import { paymentSchema } from '$lib/components/paymentSchema';
	import { PaymentType } from '$lib/utils/paymentsTypes';
	import { invalidate } from '$app/navigation';
	import type { FormattedCase } from '$lib/types/case.types';

	let {
		dialog = $bindable<HTMLDialogElement | undefined>(),
		caso
	}: { dialog?: HTMLDialogElement; caso: FormattedCase | null } = $props();

	let loading = $state(false);
	let input_JUS = $state<HTMLInputElement | undefined>();
	let input_PESOS = $state<HTMLInputElement | undefined>();
	let case_form = $state<HTMLFormElement | undefined>();
	let response_state = $state<number | undefined>();
	let formErrors = $state<{ errors: Record<string, string | undefined | string[]> } | undefined>();

	const { jus_value, user } = page.data;

	$effect(() => {
		if (caso && input_JUS && input_PESOS) {
			calculatePayment();
		}
	});

	async function onFormSubmit() {
		try {
			loading = true;
			const form = new FormData(case_form!);
			const data = Object.fromEntries(form.entries());
			validateOrThrow(data, paymentSchema);
			const response = await fetch('/api/newPayment', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			});
			response_state = response.status;
			loading = false;
			if (response.status === 200 && page.url.pathname === '/') {
				invalidate('update:cases');
			}
		} catch (error) {
			loading = false;
			formErrors = { errors: manageFormError(error) };
		}
	}

	function onInputTransform(event: Event) {
		if (!caso) return;
		const input = event.target as HTMLInputElement;
		if (input === input_PESOS) {
			input.value = addThousandSeparator(+input.value.replace(/\./g, ''));
		}
		const value =
			input.value.includes('.') && input === input_PESOS
				? +(input.value.replace(/\./g, ''))
				: input.value.includes('.') && input === input_JUS
					? +input.value.replace(/\./, ',')
					: +(input.value.replace(/,/g, '.'));
		if (isNaN(value)) {
			input.value = input.value.slice(0, -1);
			return;
		}
		if (caso.quantityPaymentsToPay === 1) {
			input_JUS!.value = caso.restAmount.toFixed(3).replace(/\./, ',');
			input_PESOS!.value = addThousandSeparator(+(+caso.restAmount * jus_value).toFixed(0));
			return;
		}
		if (!value) {
			input_JUS!.value = '';
			input_PESOS!.value = '';
			return;
		}
		if (input === input_JUS) {
			input_PESOS!.value = addThousandSeparator(+(value * jus_value).toFixed(0));
		} else if (input === input_PESOS) {
			input_JUS!.value = (value / jus_value).toFixed(3).replace(/\./, ',');
		}
	}

	function verifyPayment(e: Event) {
		if (!caso) return;
		if (e.target === input_JUS) {
			const amount = +(input_JUS!.value.replace(/\./g, ','));
			if (amount > caso.restAmount) {
				input_JUS!.value = caso.restAmount.toFixed(3).replace(/\./g, ',');
				input_PESOS!.value = addThousandSeparator(+(+caso.restAmount * jus_value).toFixed(0));
			}
		} else {
			const amount_pesos = input_PESOS!.value.replace(/\./g, '');
			if (+(+amount_pesos / jus_value).toFixed(3) > +caso.restAmount.toFixed(3)) {
				input_PESOS!.value = (caso.restAmount * jus_value).toFixed(0);
			}
		}
	}

	function calculatePaymentNumber() {
		if (!caso) return 1;
		return caso.payments.length - caso.quantityPaymentsToPay + 1;
	}

	function calculatePayment() {
		if (!caso || !input_JUS || !input_PESOS) return;
		const quantityPaymentToPay = caso.quantityPaymentsToPay;
		const amountToPay = caso.restAmount;
		const amountJus =
			quantityPaymentToPay === 1
				? amountToPay.toFixed(3)
				: (amountToPay / quantityPaymentToPay).toFixed(3);
		input_JUS.value = amountJus.replace(/\./, ',');
		input_PESOS.value = addThousandSeparator(+(+amountJus * jus_value).toFixed(0));
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
		{#if caso}
			{#if !response_state}
				<header class={cHeader}>Cobrar</header>
				{#if loading}
					<div class="flex flex-row justify-center h-22">
						<div
							class="size-14 animate-spin rounded-full border-4 border-surface-300-700 border-t-primary-500"
						></div>
					</div>
				{:else}
					<form class="modal-form {cForm}" bind:this={case_form}>
						<input hidden type="text" name="caseId" value={caso.id} />
						<div class="grid grid-cols-2 gap-4">
							<label class="label">
								<span>Cliente</span>
								<input autocomplete="off" class="input" readonly type="text" value={caso.clientName} />
							</label>
							<label class="label">
								<span>Observacion</span>
								<input
									autocomplete="off"
									class="input"
									readonly
									type="text"
									value={caso.description}
								/>
							</label>
							<label class="label">
								<span>Cuota numero</span>
								<input
									autocomplete="off"
									class="input"
									name="paymentNumber"
									readonly
									type="text"
									value={calculatePaymentNumber()}
								/>
							</label>
							<label class="label">
								<span>Total JUS</span>
								<input
									autocomplete="off"
									class="input"
									readonly
									type="text"
									value={`${caso.amount.toFixed(2).replace('.', ',')}`}
								/>
							</label>
							<label class="label">
								<span>Adeuda JUS</span>
								<input
									autocomplete="off"
									class="input"
									readonly
									style="color:red"
									type="text"
									value={`${caso.restAmount.toFixed(3).replace('.', ',')}`}
								/>
							</label>
							<label class="label">
								<span>Cantidad de JUS</span>
								<input
									autocomplete="off"
									class="input"
									bind:this={input_JUS}
									oninput={(e) => {
										verifyPayment(e);
										onInputTransform(e);
									}}
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
										verifyPayment(e);
										onInputTransform(e);
									}}
									placeholder="PESOS"
								/>
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
								<input
									autocomplete="off"
									class="input"
									type="text"
									name="collector"
									placeholder="Cobrador"
									value={user.name}
									readonly
								/>
							</label>
						</div>
						<button class="btn preset-filled-success-500" onclick={onFormSubmit}>Pagar</button>
					</form>
				{/if}
			{:else if response_state === 200}
				<div>
					<p class="text-green-600 text-center">Pago generado correctamente</p>
				</div>
				<div class="flex flex-row justify-center gap-3">
					<button class="btn preset-filled-success-500" onclick={handleClose}>Salir</button>
				</div>
			{:else}
				<p class="text-red-600 text-center">Hubo un error. Intente nuevamente</p>
				<div class="flex flex-row justify-center gap-3">
					<button class="btn preset-filled-error-500" onclick={() => (response_state = undefined)}
						>Reintentar</button
					>
					<button class="btn preset-filled-warning-500" onclick={handleClose}>Salir</button>
				</div>
			{/if}
		{/if}
	</div>
</dialog>
