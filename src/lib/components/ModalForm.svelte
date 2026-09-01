<script lang="ts">
	import { page } from '$app/state';
	import { getContext } from 'svelte';
	import { modalSchema } from '$lib/components/modalSchema';
	import { typeCases } from '$lib/utils/casesTypes';
	import { PaymentType, Timing } from '$lib/utils/paymentsTypes';
	import { differenceInHours } from 'date-fns';
	import { fade } from 'svelte/transition';
	import { addThousandSeparator } from '$lib/utils/formatters';
	import { validateOrThrow, manageFormError } from '$lib/utils/form';
	import { toARS, toRatesMap, formatAmount } from '$lib/utils/currency';
	import { X, ArrowLeftRight } from '@lucide/svelte';
	import type { ModalContext } from '$lib/types/modal.types';
	import type { CurrencyRecord } from '$lib/currency.model';

	let { dialog = $bindable<HTMLDialogElement | undefined>() }: { dialog?: HTMLDialogElement } =
		$props();

	const { openConverter } = getContext<ModalContext>('modals');

	let loading = $state(false);
	let input_native = $state<HTMLInputElement | undefined>();
	let input_pesos = $state<HTMLInputElement | undefined>();
	let input_quantity_payment = $state<HTMLInputElement | undefined>();
	let amount_payment = $state('');
	let case_form = $state<HTMLFormElement | undefined>();
	let response_state = $state<number | undefined>();
	let due_date = $state<Date | undefined>();
	let isToday = $state(false);
	let formErrors = $state<{ errors: Record<string, string | undefined | string[]> } | undefined>();

	const user = page.data.user;
	const currencies: CurrencyRecord[] = $derived(page.data.currencies ?? []);
	const rates = $derived(toRatesMap(currencies));

	// Selected currency — default to the isDefault one (set reactively once currencies load)
	let selectedCurrencyId = $state<number>(1);
	$effect(() => {
		if (currencies.length && selectedCurrencyId === 1) {
			selectedCurrencyId = currencies.find((c) => c.isDefault)?.id ?? currencies[0]?.id ?? 1;
		}
	});
	const selectedCurrency = $derived(
		currencies.find((c) => c.id === selectedCurrencyId) ?? currencies[0]
	);

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
		if (lastChar === '.') { input.value = input.value.slice(0, -1); return; }
		if (input === input_native) {
			if (lastChar && !/[\d,]/.test(lastChar)) { input.value = input.value.slice(0, -1); return; }
			if (lastChar === ',' && (input.value.match(/,/g) || []).length > 1) { input.value = input.value.slice(0, -1); return; }
		} else if (input === input_pesos) {
			if (lastChar && !/\d/.test(lastChar)) { input.value = input.value.slice(0, -1); return; }
		}
		const cleanValue = input.value.replace(/\./g, '').replace(',', '.');
		const numericValue = +cleanValue;
		if (cleanValue && isNaN(numericValue)) { input.value = input.value.slice(0, -1); return; }
		if (!cleanValue) { input_native!.value = ''; input_pesos!.value = ''; return; }
		if (!selectedCurrency) return;
		if (input === input_native) {
			// native → show ARS equivalent
			input_pesos!.value = addThousandSeparator(Math.round(toARS(numericValue, selectedCurrency.value)));
		} else if (input === input_pesos) {
			input_pesos!.value = addThousandSeparator(numericValue);
			// pesos → show native equivalent
			const nativeVal = numericValue / selectedCurrency.value;
			input_native!.value = selectedCurrency.name === 'JUS'
				? nativeVal.toFixed(3).replace('.', ',')
				: nativeVal.toFixed(2).replace('.', ',');
		}
	}

	function calculatePayment() {
		// amount_payment is in native currency
		const nativeAmount = input_native!.value.replace(',', '.').replace(/\./g, '');
		const quantity = +input_quantity_payment!.value;
		if (!quantity || !nativeAmount) { amount_payment = ''; return; }
		const perPayment = +nativeAmount / quantity;
		amount_payment = selectedCurrency?.name === 'JUS'
			? perPayment.toFixed(3).replace('.', ',')
			: addThousandSeparator(Math.round(perPayment));
	}

	function verifyQuantityPayment(e: Event) {
		const input = e.target as HTMLInputElement;
		input.value = input.value.replace(/[^\d]/g, '');
	}

	function verifyPayment(e: Event) {
		const input = e.target as HTMLInputElement;
		const lastChar = input.value.slice(-1);
		if (lastChar && !/\d/.test(lastChar)) { input.value = input.value.slice(0, -1); return; }
		const numericValue = +input.value.replace(/\./g, '');
		if (input.value && isNaN(numericValue)) { input.value = input.value.slice(0, -1); return; }
		// Cap against native amount — amount_payment is in native currency, not pesos
		const nativeTotal = +input_native!.value.replace(',', '.').replace(/\./g, '');
		if (input_quantity_payment!.value === '1') {
			amount_payment = input_native!.value;
			return;
		}
		amount_payment = addThousandSeparator(numericValue > nativeTotal ? nativeTotal : numericValue);
	}

	function handleClose() {
		dialog?.close();
		response_state = undefined;
		formErrors = undefined;
		loading = false;
	}
</script>

<dialog bind:this={dialog}>
	<div class="modal-panel" style="width: min(90vw, 56rem);">
		<div class="modal-header">
			<h2 class="modal-title">Nuevo caso</h2>
			<div style="display: flex; gap: 0.5rem; align-items: center;">
				<button class="modal-icon-btn" onclick={(e) => { e.preventDefault(); openConverter(); }} aria-label="Ver conversiones">
					<ArrowLeftRight size={16} />
				</button>
				<button class="modal-icon-btn" onclick={handleClose} aria-label="Cerrar"><X size={18} /></button>
			</div>
		</div>

		{#if !response_state}
			{#if loading}
				<div class="spinner-wrap"><div class="er-spinner"></div></div>
			{:else}
				<form class="form-section" bind:this={case_form} method="POST">
					<div class="form-grid">
						<div class="label" style="grid-column: 1 / -1;">
							<span>Moneda del caso</span>
							<div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
								{#each currencies as currency (currency.id)}
									<button
										type="button"
										class="btn btn-sm {selectedCurrencyId === currency.id ? 'btn-primary' : 'btn-ghost'}"
										onclick={() => { selectedCurrencyId = currency.id; input_native!.value = ''; input_pesos!.value = ''; amount_payment = ''; }}
									>
										{currency.name}
									</button>
								{/each}
							</div>
							<input type="hidden" name="currencyId" value={selectedCurrencyId} />
						</div>
						<div class="label">
							<span>Cliente</span>
							<input autocomplete="off" class="input" type="text" placeholder="Nombre Cliente" name="clientName" />
							{#if formErrors?.errors?.['clientName']}<span class="text-error">{formErrors.errors['clientName']}</span>{/if}
						</div>
						<div class="label">
							<span>Teléfono</span>
							<input autocomplete="off" class="input" type="text" placeholder="Teléfono" name="clientPhone" />
							{#if formErrors?.errors?.['clientPhone']}<span class="text-error">{formErrors.errors['clientPhone']}</span>{/if}
						</div>
						<div class="label">
							<span>Observación</span>
							<input autocomplete="off" class="input" type="text" placeholder="Observaciones" name="description" />
							{#if formErrors?.errors?.['description']}<span class="text-error">{formErrors.errors['description']}</span>{/if}
						</div>
						<div class="label">
							<span>Tipo de caso</span>
							<select name="type" class="select">
								{#each Object.keys(typeCases) as type}<option value={type}>{type}</option>{/each}
							</select>
						</div>
						<div class="label">
							<span>{selectedCurrency?.name ?? 'Monto'}</span>
							<input autocomplete="off" class="input" bind:this={input_native} oninput={onInputTransform} type="text" placeholder={selectedCurrency?.name ?? 'Monto'} name="amount" />
							{#if formErrors?.errors?.['amount']}<span class="text-error">{formErrors.errors['amount']}</span>{/if}
						</div>
						<div class="label">
							<span>Equivalente en pesos</span>
							<input autocomplete="off" class="input" type="text" bind:this={input_pesos} oninput={(e) => { onInputTransform(e); calculatePayment(); }} placeholder="$ PESOS" />
						</div>
						<div class="label">
							<span>Cantidad de cuotas</span>
							<input autocomplete="off" class="input" type="text" inputmode="numeric" oninput={(e) => { verifyQuantityPayment(e); calculatePayment(); }} bind:this={input_quantity_payment} placeholder="Cuotas" name="quantity_payment" />
							{#if formErrors?.errors?.['quantity_payment']}<span class="text-error">{formErrors.errors['quantity_payment']}</span>{/if}
						</div>
						<div class="label">
							<span>Periodicidad</span>
							<select class="select" name="period">
								<option value={Timing.SEMANAL}>{Timing.SEMANAL}</option>
								<option value={Timing.QUINCENAL}>{Timing.QUINCENAL}</option>
								<option value={Timing.MENSUAL}>{Timing.MENSUAL}</option>
							</select>
						</div>
						<div class="label">
							<span>Fecha primer cuota</span>
							<input autocomplete="off" class="input" type="date" bind:value={due_date} oninput={calculatePayment} name="due_date" />
							{#if formErrors?.errors?.['due_date']}<span class="text-error">{formErrors.errors['due_date']}</span>{/if}
							{#if due_date && !verifyDate()}<span class="text-error">Fecha pasada</span>{/if}
						</div>
						{#if due_date && isToday}
							<div class="label" transition:fade>
								<span>Monto a entregar</span>
								<input autocomplete="off" class="input" type="text" bind:value={amount_payment} oninput={verifyPayment} placeholder="Monto ({selectedCurrency?.name})" name="amount_payment" />
								{#if formErrors?.errors?.['amount_payment']}<span class="text-error">{formErrors.errors['amount_payment']}</span>{/if}
							</div>
							<div class="label" transition:fade>
								<span>Método de pago</span>
								<select class="select" name="typepayment">
									{#each Object.keys(PaymentType) as type}<option value={type}>{type}</option>{/each}
								</select>
								{#if formErrors?.errors?.['typepayment']}<span class="text-error">{formErrors.errors['typepayment']}</span>{/if}
							</div>
							<div class="label" transition:fade>
								<span>Cobrador</span>
								<input autocomplete="off" class="input" type="text" readonly name="collector" value={user.name} />
							</div>
						{/if}
					</div>
					<div style="display: flex; justify-content: flex-end; margin-top: 1rem;">
						<button class="btn btn-success" disabled={!!(due_date && !verifyDate())} onclick={(e) => { e.preventDefault(); onFormSubmit(); }}>
							Guardar caso
						</button>
					</div>
				</form>
			{/if}
		{:else if response_state === 201}
			<p class="text-success-msg" style="text-align: center; padding: 1.5rem 0;">Caso creado correctamente</p>
			<div style="display: flex; justify-content: flex-end;">
				<button class="btn btn-success" onclick={handleClose}>Cerrar</button>
			</div>
		{:else}
			<p class="text-error" style="text-align: center; padding: 1.5rem 0;">Hubo un error al guardar. Intente nuevamente</p>
			<div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
				<button class="btn btn-danger" onclick={() => (response_state = undefined)}>Reintentar</button>
				<button class="btn btn-ghost" onclick={handleClose}>Salir</button>
			</div>
		{/if}
	</div>
</dialog>

<style>
	.form-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0 1.25rem;
	}
	@media (max-width: 600px) {
		.form-grid { grid-template-columns: 1fr; }
	}
</style>
