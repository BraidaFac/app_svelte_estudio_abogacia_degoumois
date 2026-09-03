<script lang="ts">
	import { page } from '$app/state';
	import { getContext } from 'svelte';
	import { modalSchema } from '$lib/components/modalSchema';
	import { typeCases } from '$lib/utils/casesTypes';
	import { PaymentType, Timing } from '$lib/utils/paymentsTypes';
	import { differenceInHours } from 'date-fns';
	import { fade } from 'svelte/transition';
	import { addThousandSeparator, parseAmountInput, formatNumber, amountInput, amountFocus } from '$lib/utils/formatters';
	import { validateOrThrow, manageFormError } from '$lib/utils/form';
	import { toARS, toRatesMap, formatAmount } from '$lib/utils/currency';
	import { DatePicker } from 'bits-ui';
	import type { CalendarDate } from '@internationalized/date';
	import { X, ArrowLeftRight, CalendarDays, ChevronLeft, ChevronRight } from '@lucide/svelte';
	import type { ModalContext } from '$lib/types/modal.types';
	import type { CurrencyRecord } from '$lib/currency.model';
	import { handleApiResponse } from '$lib/utils/response';
	import { invalidateAll } from '$app/navigation';

	let { dialog = $bindable<HTMLDialogElement | undefined>() }: { dialog?: HTMLDialogElement } =
		$props();

	const { openConverter } = getContext<ModalContext>('modals');

	let loading = $state(false);
	let input_native = $state<HTMLInputElement | undefined>();
	let input_pesos = $state<HTMLInputElement | undefined>();
	let input_quantity_payment = $state<HTMLInputElement | undefined>();
	let amount_payment = $state('');
	let quantityValue = $state('');
	let case_form = $state<HTMLFormElement | undefined>();
	let response_state = $state<number | undefined>();
	let dateValue = $state<CalendarDate | undefined>(undefined);
	let datePickerKey = $state(0);
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
	const isSingleQuota = $derived(quantityValue === '1');

	const isTodayFunction = (today: Date, date: Date) =>
		differenceInHours(today, date) < 24 && differenceInHours(today, date) > -24;

	$effect(() => {
		if (dateValue) {
			const today = new Date();
			today.setHours(-3, 0, 0, 0);
			const dueDate = new Date(dateValue.toString());
			isToday = isTodayFunction(today, dueDate);
			calculatePayment();
		} else {
			isToday = false;
		}
	});

	async function onFormSubmit() {
		loading = true;
		try {
			const form = new FormData(case_form!);
			const data = Object.fromEntries(form.entries());
			validateOrThrow(data, modalSchema);
			const response = await fetch('/api/newCase', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			});
			const result = await handleApiResponse(response);
			if (result.success) {
				response_state = 201;
			} else {
				response_state = response.status;
			}
		} catch (error) {
			formErrors = { errors: manageFormError(error) };
		} finally {
			loading = false;
		}
	}

	function verifyDate() {
		const today = new Date();
		today.setHours(-3, 0, 0, 0);
		const dueDate = new Date(dateValue!.toString());
		return dueDate >= today;
	}

	function onInputTransform(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input === input_native) {
			amountInput(event); // filtra: solo dígitos y una coma decimal
		} else if (input === input_pesos) {
			const lastChar = input.value.slice(-1);
			if (lastChar && !/\d/.test(lastChar)) { input.value = input.value.slice(0, -1); return; }
			input.value = addThousandSeparator(+input.value.replace(/\./g, ''));
		}
		const numericValue = parseAmountInput(input.value);
		if (!input.value) { input_native!.value = ''; input_pesos!.value = ''; return; }
		if (!selectedCurrency) return;
		if (input === input_native) {
			input_pesos!.value = addThousandSeparator(Math.round(toARS(numericValue, selectedCurrency.value)));
			calculatePayment();
		} else if (input === input_pesos) {
			const nativeVal = numericValue / selectedCurrency.value;
			input_native!.value = formatNumber(
				selectedCurrency.name === 'JUS' ? parseFloat(nativeVal.toFixed(3)) : parseFloat(nativeVal.toFixed(2))
			);
		}
	}

	function calculatePayment() {
		if (!input_native || !input_quantity_payment) return;
		const nativeAmount = parseAmountInput(input_native.value);
		const quantity = +input_quantity_payment.value;
		if (!quantity || !nativeAmount) { amount_payment = ''; return; }
		const perPayment = nativeAmount / quantity;
		amount_payment = selectedCurrency?.name === 'JUS'
			? formatNumber(parseFloat(perPayment.toFixed(3)))
			: formatNumber(Math.round(perPayment));
	}

	function verifyQuantityPayment(e: Event) {
		const input = e.target as HTMLInputElement;
		input.value = input.value.replace(/[^\d]/g, '');
	}

	function verifyPayment(e: Event) {
		amountInput(e);
		if (input_quantity_payment!.value === '1') {
			amount_payment = input_native!.value;
			return;
		}
		const numericValue = parseAmountInput((e.target as HTMLInputElement).value);
		const nativeTotal = parseAmountInput(input_native!.value);
		if (numericValue > nativeTotal) {
			amount_payment = formatNumber(nativeTotal);
		}
	}

	function handleClose() {
		if (response_state === 201) invalidateAll();
		dialog?.close();
		response_state = undefined;
		formErrors = undefined;
		loading = false;
		dateValue = undefined;
		datePickerKey++;
		amount_payment = '';
		quantityValue = '';
		case_form?.reset();
	}
</script>

<dialog bind:this={dialog} onclick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
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

		{#if loading}
			<div class="spinner-wrap"><div class="er-spinner"></div></div>
		{:else if response_state === 201}
			<p class="text-success-msg" style="text-align: center; padding: 1.5rem 0;">Caso creado correctamente</p>
			<div style="display: flex; justify-content: flex-end;">
				<button class="btn btn-success" onclick={handleClose}>Cerrar</button>
			</div>
		{:else if response_state}
			<p class="text-error" style="text-align: center; padding: 1.5rem 0;">Hubo un error al guardar. Intente nuevamente</p>
			<div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
				<button class="btn btn-danger" onclick={() => (response_state = undefined)}>Reintentar</button>
				<button class="btn btn-ghost" onclick={handleClose}>Salir</button>
			</div>
		{:else}
			<form class="form-section" bind:this={case_form} method="POST" onsubmit={(e) => e.preventDefault()}>
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
							<span>Email</span>
							<input autocomplete="off" class="input" type="email" placeholder="email@ejemplo.com" name="clientEmail" />
							{#if formErrors?.errors?.['clientEmail']}<span class="text-error">{formErrors.errors['clientEmail']}</span>{/if}
						</div>
						<div class="label">
							<span>Observación</span>
							<input autocomplete="off" class="input" type="text" placeholder="Observaciones" name="description" />
							{#if formErrors?.errors?.['description']}<span class="text-error">{formErrors.errors['description']}</span>{/if}
						</div>
						<div class="label">
							<span>N° de caso <span style="opacity:0.45; font-size:0.75rem;">(opcional)</span></span>
							<input autocomplete="off" class="input" type="text" placeholder="Ej: 2024/001" name="caseNumber" />
						</div>
						<div class="label">
							<span>Tipo de caso</span>
							<select name="type" class="select">
								{#each Object.keys(typeCases) as type}<option value={type}>{type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()}</option>{/each}
							</select>
						</div>
						<div class="label">
							<span>{selectedCurrency?.name ?? 'Monto'}</span>
							<input autocomplete="off" class="input" bind:this={input_native} onfocus={amountFocus} oninput={onInputTransform} onblur={(e) => { const n = parseAmountInput((e.target as HTMLInputElement).value); if (n > 0) (e.target as HTMLInputElement).value = formatNumber(n); }} type="text" placeholder={selectedCurrency?.name ?? 'Monto'} name="amount" />
							{#if formErrors?.errors?.['amount']}<span class="text-error">{formErrors.errors['amount']}</span>{/if}
						</div>
						<div class="label">
							<span>Equivalente en pesos</span>
							<input autocomplete="off" class="input" type="text" bind:this={input_pesos} onfocus={amountFocus} oninput={(e) => { onInputTransform(e); calculatePayment(); }} onblur={(e) => { const n = parseAmountInput((e.target as HTMLInputElement).value); if (n > 0) (e.target as HTMLInputElement).value = addThousandSeparator(Math.round(n)); }} placeholder="$ PESOS" />
						</div>
						<div class="label">
							<span>Cantidad de cuotas</span>
							<input autocomplete="off" class="input" type="text" inputmode="numeric" oninput={(e) => { verifyQuantityPayment(e); quantityValue = (e.target as HTMLInputElement).value; calculatePayment(); }} bind:this={input_quantity_payment} placeholder="Cuotas" name="quantity_payment" />
							{#if formErrors?.errors?.['quantity_payment']}<span class="text-error">{formErrors.errors['quantity_payment']}</span>{/if}
						</div>
						<div class="label">
							<span>Periodicidad</span>
							<select class="select" name="period">
								<option value={Timing.SEMANAL}>Semanal</option>
								<option value={Timing.QUINCENAL}>Quincenal</option>
								<option value={Timing.MENSUAL}>Mensual</option>
							</select>
						</div>
						<div class="label">
							<span>Fecha primer cuota</span>
							{#key datePickerKey}
							<DatePicker.Root locale="es" bind:value={dateValue} weekStartsOn={1}>
								<DatePicker.Input name="due_date" class="date-field-input">
									{#snippet children({ segments })}
										{#each segments as { part, value }}
											<DatePicker.Segment {part} class="date-segment">{value}</DatePicker.Segment>
										{/each}
										<DatePicker.Trigger class="date-picker-trigger">
											<CalendarDays size={15} />
										</DatePicker.Trigger>
									{/snippet}
								</DatePicker.Input>
								<DatePicker.Content class="date-picker-content">
									<DatePicker.Calendar>
										{#snippet children({ months, weekdays })}
											<DatePicker.Header class="date-picker-header">
												<DatePicker.PrevButton class="date-picker-nav-btn"><ChevronLeft size={16} /></DatePicker.PrevButton>
												<DatePicker.Heading class="date-picker-heading" />
												<DatePicker.NextButton class="date-picker-nav-btn"><ChevronRight size={16} /></DatePicker.NextButton>
											</DatePicker.Header>
											{#each months as month}
												<DatePicker.Grid class="date-picker-grid">
													<DatePicker.GridHead>
														<DatePicker.GridRow>
															{#each weekdays as day}
																<DatePicker.HeadCell class="date-picker-head-cell">{day.slice(0,2)}</DatePicker.HeadCell>
															{/each}
														</DatePicker.GridRow>
													</DatePicker.GridHead>
													<DatePicker.GridBody>
														{#each month.weeks as weekDates}
															<DatePicker.GridRow>
																{#each weekDates as date}
																	<DatePicker.Cell {date} month={month.value} class="date-picker-cell">
																		<DatePicker.Day class="date-picker-day" />
																	</DatePicker.Cell>
																{/each}
															</DatePicker.GridRow>
														{/each}
													</DatePicker.GridBody>
												</DatePicker.Grid>
											{/each}
										{/snippet}
									</DatePicker.Calendar>
								</DatePicker.Content>
							</DatePicker.Root>
							{/key}
							{#if formErrors?.errors?.['due_date']}<span class="text-error">{formErrors.errors['due_date']}</span>{/if}
							{#if dateValue && !verifyDate()}<span class="text-error">Fecha pasada</span>{/if}
						</div>
						{#if dateValue && isToday}
							<div class="label" transition:fade>
								<span>Monto a entregar</span>
								<input autocomplete="off" class="input" type="text" bind:value={amount_payment} oninput={verifyPayment} placeholder="Monto ({selectedCurrency?.name})" name="amount_payment" disabled={isSingleQuota} />
								{#if isSingleQuota}
									<span style="font-size: 0.75rem; color: #6e6e6e;">1 cuota: el cobro es por el monto total</span>
								{/if}
								{#if formErrors?.errors?.['amount_payment']}<span class="text-error">{formErrors.errors['amount_payment']}</span>{/if}
							</div>
							<div class="label" transition:fade>
								<span>Método de pago</span>
								<select class="select" name="typepayment">
									{#each Object.keys(PaymentType) as type}<option value={type}>{PaymentType[type as keyof typeof PaymentType]}</option>{/each}
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
						<button class="btn btn-success" disabled={!!(dateValue && !verifyDate())} onclick={(e) => { e.preventDefault(); onFormSubmit(); }}>
							Guardar caso
						</button>
					</div>
				</form>
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
