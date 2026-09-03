<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { ZodError, ZodObject } from 'zod';
	import { X } from '@lucide/svelte';

	let { dialog = $bindable<HTMLDialogElement | undefined>() }: { dialog?: HTMLDialogElement } =
		$props();

	let case_form = $state<HTMLFormElement | undefined>();
	let loading = $state(false);
	let response_state = $state<number | undefined>();
	let formErrors = $state<{ errors: Record<string, string | undefined | string[]> } | undefined>();
	let input_JUS = $state<HTMLInputElement | undefined>();

	const { jus_value } = page.data ?? '0';

	function validateOrThrow(obj: object, schema: ZodObject<any, any>) {
		schema.parse(obj);
	}

	function manageError(error: unknown) {
		if (error instanceof ZodError) {
			const { fieldErrors } = error.flatten();
			formErrors = { errors: fieldErrors };
		}
	}

	function addThousandSeparator(price: number) {
		return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
	}

	async function onFormSubmit() {
		try {
			loading = true;
			const form = new FormData(case_form!);
			const data = Object.fromEntries(form.entries());
			const response = await fetch('/api/jusValue', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			});
			loading = false;
			response_state = response.status;
			if (response_state === 200) {
				await invalidateAll();
			}
		} catch (error) {
			loading = false;
			manageError(error);
		}
	}

	function onInputTransform(event: Event) {
		const input = event.target as HTMLInputElement;
		const value = input.value.replace(/\./g, '');
		if (isNaN(+value)) {
			input.value = input.value.slice(0, -1);
			return;
		}
		input_JUS!.value = addThousandSeparator(+value);
	}

	$effect(() => {
		if (input_JUS) {
			input_JUS.value = addThousandSeparator(jus_value);
		}
	});

	function handleClose() {
		dialog?.close();
		response_state = undefined;
		formErrors = undefined;
		loading = false;
	}
</script>

<dialog bind:this={dialog} onclick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
	<div class="modal-panel modal-panel-sm">
		<div class="modal-header">
			<h2 class="modal-title">Valor JUS</h2>
			<button class="modal-icon-btn" onclick={handleClose} aria-label="Cerrar">
				<X size={18} />
			</button>
		</div>

		{#if !response_state}
			{#if loading}
				<div class="spinner-wrap">
					<div class="er-spinner"></div>
				</div>
			{:else}
				<form class="form-section" bind:this={case_form}>
					<div class="label">
						<span>Valor JUS actual</span>
						<input
							class="input"
							name="jus_value"
							oninput={onInputTransform}
							type="text"
							bind:this={input_JUS}
						/>
					</div>
					<div style="display: flex; justify-content: flex-end; margin-top: 1rem;">
						<button
							class="btn btn-success"
							onclick={(e) => {
								e.preventDefault();
								onFormSubmit();
							}}
						>
							Guardar
						</button>
					</div>
				</form>
			{/if}
		{:else if response_state === 200}
			<p class="text-success-msg" style="text-align: center; padding: 1.5rem 0;">
				Valor actualizado correctamente
			</p>
			<div style="display: flex; justify-content: flex-end;">
				<button class="btn btn-success" onclick={handleClose}>Cerrar</button>
			</div>
		{:else}
			<p class="text-error" style="text-align: center; padding: 1.5rem 0;">
				Hubo un error. Intente nuevamente
			</p>
			<div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
				<button class="btn btn-ghost" onclick={() => (response_state = undefined)}>Reintentar</button>
				<button class="btn btn-ghost" onclick={handleClose}>Salir</button>
			</div>
		{/if}
	</div>
</dialog>

