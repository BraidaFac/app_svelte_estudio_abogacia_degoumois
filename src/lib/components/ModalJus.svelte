<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { ZodError, ZodObject } from 'zod';

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

	const cBase = 'card p-4 w-1/3 shadow-xl space-y-4';
	const cHeader = 'text-2xl font-bold text-center';
	const cForm = 'border border-surface-500 p-4 space-y-4 rounded-xl';
</script>

<dialog bind:this={dialog}>
	<div class="modal-example-form {cBase}">
		{#if !response_state}
			<header class={cHeader}>Valor JUS</header>
			{#if loading}
				<div class="flex flex-row justify-center h-22">
					<div
						class="size-14 animate-spin rounded-full border-4 border-surface-300-700 border-t-primary-500"
					></div>
				</div>
			{:else}
				<form class="modal-form {cForm}" bind:this={case_form}>
					<label class="label">
						<span>Valor JUS</span>
						<input
							class="input"
							name="jus_value"
							oninput={onInputTransform}
							type="text"
							bind:this={input_JUS}
						/>
					</label>
					<button
						class="btn preset-filled-success-500"
						onclick={(e) => {
							e.preventDefault();
							onFormSubmit();
						}}>Guardar</button
					>
				</form>
			{/if}
		{:else if response_state === 200}
			<div>
				<p class="text-green-600 text-center">Se modifico el valor correctamente</p>
			</div>
			<div class="flex flex-row justify-center">
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
	</div>
</dialog>
