<script lang="ts">
	import { page } from '$app/state';
	import { addThousandSeparator } from '$lib/utils/formatters';
	import { toARS } from '$lib/utils/currency';
	import { validateOrThrow, manageFormError } from '$lib/utils/form';
	import { paymentSchema } from '$lib/components/paymentSchema';
	import { PaymentType } from '$lib/utils/paymentsTypes';
	import { invalidate } from '$app/navigation';
	import type { FormattedCase } from '$lib/types/case.types';
	import { X } from '@lucide/svelte';

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

	$effect(() => {
		if (caso && input_native && input_pesos) {
			// Last payment: lock to restAmount in native currency
			input_native!.value = caso.restAmount.toFixed(3).replace(/\./, ',');
			input_pesos!.value = addThousandSeparator(
				Math.round(toARS(caso.restAmount, caso.currency.value))
			);
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
			if (response.status === 200 && page.url.pathname === '/') { invalidate('update:cases'); }
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
			input.value = addThousandSeparator(+input.value.replace(/\./g, ''));
		}

		const value = input === input_pesos
			? +input.value.replace(/\./g, '')
			: +input.value.replace(/,/g, '.');

		if (isNaN(value)) { input.value = input.value.slice(0, -1); return; }

		if (caso.quantityPaymentsToPay === 1) {
			// Lock to restAmount
			input_native!.value = caso.restAmount.toFixed(3).replace(/\./, ',');
			input_pesos!.value = addThousandSeparator(Math.round(toARS(caso.restAmount, currency.value)));
			return;
		}

		if (!value) { input_native!.value = ''; input_pesos!.value = ''; return; }

		if (input === input_pesos) {
			const nativeVal = value / currency.value;
			if (nativeVal > caso.restAmount) {
				input_native!.value = caso.restAmount.toFixed(3).replace(/\./, ',');
				input_pesos!.value = addThousandSeparator(Math.round(toARS(caso.restAmount, currency.value)));
			} else {
				input_native!.value = nativeVal.toFixed(3).replace(/\./, ',');
			}
		} else if (input === input_native) {
			const capped = Math.min(value, caso.restAmount);
			input_native!.value = capped.toFixed(3).replace(/\./, ',');
			input_pesos!.value = addThousandSeparator(Math.round(toARS(capped, currency.value)));
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

<dialog bind:this={dialog}>
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
								<span>Total {caso.currency.name}</span>
								<input autocomplete="off" class="input" readonly type="text" value={caso.amount.toFixed(2).replace('.', ',')} />
							</div>
							<div class="label">
								<span>Adeuda {caso.currency.name}</span>
								<input autocomplete="off" class="input" readonly type="text" value={caso.restAmount.toFixed(3).replace('.', ',')} style="color: #ff6b5e;" />
							</div>
							<div class="label">
								<span>{caso?.currency.name ?? 'Monto'}</span>
								<input autocomplete="off" class="input" bind:this={input_native} oninput={onInputTransform} type="text" placeholder={caso.currency.name} />
								{#if formErrors?.errors?.['amount']}<span class="text-error">{formErrors.errors['amount']}</span>{/if}
								{#if caso?.currency.name !== 'ARS'}
									<p style="font-size: 0.8rem; opacity: 0.6; margin-top: 0.25rem;">
										≈ {input_pesos?.value} pesos
									</p>
								{/if}
							</div>
							<div class="label">
								<span>Pesos</span>
								<input autocomplete="off" class="input" type="text" bind:this={input_pesos} oninput={onInputTransform} placeholder="$ PESOS" />
							</div>
							<div class="label">
								<span>Método de pago</span>
								<select class="select" name="typepayment">
									{#each Object.keys(PaymentType) as type}<option value={type}>{type}</option>{/each}
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
