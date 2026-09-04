<script lang="ts">
	import { page } from '$app/state';
	import { addThousandSeparator, parseAmountInput, amountFocus, amountInput } from '$lib/utils/formatters';
	import { toARS } from '$lib/utils/currency';
	import { validateOrThrow, manageFormError } from '$lib/utils/form';
	import { paymentSchema } from '$lib/components/paymentSchema';
	import { PaymentType } from '$lib/utils/paymentsTypes';
	import { invalidate } from '$app/navigation';
	import type { FormattedCase } from '$lib/types/case.types';
	import { X } from '@lucide/svelte';
	import { handleApiResponse } from '$lib/utils/response';
	import { toaster } from '$lib/stores/toast';

	let {
		dialog = $bindable<HTMLDialogElement | undefined>(),
		caso
	}: { dialog?: HTMLDialogElement; caso: FormattedCase | null } = $props();

	let loading = $state(false);
	let input_native = $state<HTMLInputElement | undefined>();
	let input_pesos = $state<HTMLInputElement | undefined>();
	let case_form = $state<HTMLFormElement | undefined>();
	let response_state = $state<number | undefined>();
	let formErrors = $state<{ errors: Record<string, string | undefined | string[]> } | undefined>();

	const { user } = page.data;

	function formatNative(amount: number, currencyName: string): string {
		const decimals = currencyName === 'JUS' ? 3 : currencyName === 'ARS' ? 0 : 2;
		return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: decimals }).format(amount);
	}

	$effect(() => {
		if (caso && input_native) {
			const currentPayment = caso.payments.find((p) => p.current);
			const suggestedAmount = currentPayment?.amount ?? caso.restAmount;
			input_native.value = formatNative(suggestedAmount, caso.currency.name);
			if (input_pesos) {
				input_pesos.value = addThousandSeparator(
					Math.round(toARS(suggestedAmount, caso.currency.value))
				);
			}
		}
	});

	async function onFormSubmit() {
		try {
			loading = true;
			const form = new FormData(case_form!);
			const data = Object.fromEntries(form.entries());
			data.amount = input_native?.value ?? '';
			validateOrThrow(data, paymentSchema);
			const response = await fetch('/api/newPayment', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			});
			loading = false;
			const result = await handleApiResponse(response);
			if (result.success) {
				toaster.success({ title: 'Pago registrado correctamente' });
				handleClose();
				if (page.url.pathname === '/') invalidate('update:cases');
			} else {
				response_state = response.status;
			}
		} catch (error) {
			loading = false;
			formErrors = { errors: manageFormError(error) };
		}
	}

	function onInputTransform(event: Event) {
		if (!caso) return;
		const input = event.target as HTMLInputElement;
		const { currency } = caso;

		if (input === input_pesos) {
			// Pesos: solo dígitos enteros
			const lastChar = input.value.slice(-1);
			if (lastChar && !/\d/.test(lastChar)) { input.value = input.value.slice(0, -1); return; }
			input.value = addThousandSeparator(+input.value.replace(/\./g, ''));
		} else if (input === input_native) {
			amountInput(event); // filtra: solo dígitos y una coma decimal
		}

		const value = input === input_pesos
			? +input.value.replace(/\./g, '')
			: parseAmountInput(input.value); // punto=miles, coma=decimal

		if (isNaN(value)) { input.value = input.value.slice(0, -1); return; }

		if (caso.quantityPaymentsToPay === 1) return;

		if (!input.value.trim()) { input_native!.value = ''; if (input_pesos) input_pesos.value = ''; return; }

		if (input === input_pesos) {
			const nativeVal = value / currency.value;
			if (nativeVal > caso.restAmount) {
				input_native!.value = formatNative(caso.restAmount, currency.name);
				if (input_pesos) input_pesos.value = addThousandSeparator(Math.round(toARS(caso.restAmount, currency.value)));
			} else {
				input_native!.value = formatNative(nativeVal, currency.name);
			}
		} else if (input === input_native) {
			if (input_pesos) input_pesos.value = addThousandSeparator(Math.round(toARS(value, currency.value)));
		}
	}

	function calculatePaymentNumber() {
		if (!caso) return 1;
		return caso.payments.length - caso.quantityPaymentsToPay + 1;
	}

	function handleClose() {
		dialog?.close();
		response_state = undefined;
		formErrors = undefined;
		loading = false;
	}
</script>

<dialog bind:this={dialog} onclick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
	<div class="modal-panel" style="width: min(90vw, 48rem);">
		<div class="modal-header">
			<h2 class="modal-title">Registrar cobro</h2>
			<button class="modal-icon-btn" onclick={handleClose} aria-label="Cerrar"><X size={18} /></button>
		</div>

		{#if caso}
			{#if !response_state}
				{#if loading}
					<div class="spinner-wrap"><div class="er-spinner"></div></div>
				{:else}
					<form class="form-section" bind:this={case_form}>
						<input hidden type="text" name="caseId" value={caso.id} />
						<input type="hidden" name="amount" value={input_native?.value} />
						<div class="form-grid">
							<div class="label">
								<span>Cliente</span>
								<input autocomplete="off" class="input" readonly type="text" value={caso.clientName} />
							</div>
							<div class="label">
								<span>Observación</span>
								<input autocomplete="off" class="input" readonly type="text" value={caso.description} />
							</div>
							<div class="label">
								<span>Cuota N°</span>
								<input autocomplete="off" class="input" name="paymentNumber" readonly type="text" value={calculatePaymentNumber()} />
							</div>
							<div class="label">
								<span>Total caso</span>
								<input autocomplete="off" class="input" readonly type="text" value={formatNative(caso.amount, caso.currency.name)} />
							</div>
							<div class="label">
								<span>Adeuda {caso.currency.name}</span>
								<input autocomplete="off" class="input" readonly type="text" value={formatNative(caso.restAmount, caso.currency.name)} style="color: #ff6b5e;" />
							</div>
							<div class="label">
								<span>Cuota {caso.currency.name}</span>
								<input autocomplete="off" class="input" bind:this={input_native} onfocus={amountFocus} oninput={onInputTransform} onblur={(e) => { const raw = parseAmountInput((e.target as HTMLInputElement).value); const n = Math.min(raw, caso.restAmount); if (n > 0) { (e.target as HTMLInputElement).value = formatNative(n, caso.currency.name); if (input_pesos) input_pesos.value = addThousandSeparator(Math.round(toARS(n, caso.currency.value))); } else { (e.target as HTMLInputElement).value = ''; if (input_pesos) input_pesos.value = ''; } }} type="text" placeholder={caso.currency.name} readonly={caso.quantityPaymentsToPay === 1} />
								{#if formErrors?.errors?.['amount']}<span class="text-error">{formErrors.errors['amount']}</span>{/if}
							</div>
							{#if caso.currency.name !== 'ARS'}
								<div class="label">
									<span>Pesos</span>
									<input autocomplete="off" class="input" type="text" bind:this={input_pesos} onfocus={amountFocus} oninput={onInputTransform} placeholder="$ PESOS" readonly={caso.quantityPaymentsToPay === 1} />
								</div>
							{/if}
							<div class="label">
								<span>Método de pago</span>
								<select class="select" name="typepayment">
									{#each Object.entries(PaymentType) as [key, label]}<option value={key}>{label}</option>{/each}
								</select>
							</div>
							<div class="label">
								<span>Cobrador</span>
								<input autocomplete="off" class="input" type="text" name="collector" value={user.name} readonly />
							</div>
						</div>
						<div style="display: flex; justify-content: flex-end; margin-top: 1rem;">
							<button class="btn btn-success" onclick={(e) => { e.preventDefault(); onFormSubmit(); }}>
								Registrar pago
							</button>
						</div>
					</form>
				{/if}
			{:else if response_state === 200}
				<p class="text-success-msg" style="text-align: center; padding: 1.5rem 0;">Pago registrado correctamente</p>
				<div style="display: flex; justify-content: flex-end;">
					<button class="btn btn-success" onclick={handleClose}>Cerrar</button>
				</div>
			{:else}
				<p class="text-error" style="text-align: center; padding: 1.5rem 0;">Hubo un error. Intente nuevamente</p>
				<div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
					<button class="btn btn-danger" onclick={() => (response_state = undefined)}>Reintentar</button>
					<button class="btn btn-ghost" onclick={handleClose}>Salir</button>
				</div>
			{/if}
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
