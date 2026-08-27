<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let clientError = $state<string | null>(null);

	function validateOrThrow(formdata: FormData) {
		const obj = Object.fromEntries(formdata.entries());
		if (obj.name === '' || obj.password === '') {
			throw new Error('Email and password are required');
		}
	}

	function manageError(error: unknown) {
		if (error instanceof Error) clientError = error.message;
	}
</script>

<div class="w-1/3 mx-auto">
	<h1 class="text-4xl mb-10 text-center">Iniciar Sesion</h1>
	<form
		method="POST"
		use:enhance={({ formData, cancel }) => {
			try {
				validateOrThrow(formData);
				clientError = null;
				return ({ update }) => update();
			} catch (error) {
				cancel();
				manageError(error);
			}
		}}
	>
		<label>
			<span>Nombre</span>
			<input class="input" type="text" name="name" />
		</label>
		<label>
			<span>Password</span>
			<input class="input" type="password" name="password" />
		</label>
		{#if form?.message || clientError}
			<span class="text-red-600 block">{form?.message ?? clientError}</span>
		{/if}
		<button class="btn preset-filled-primary-500 mt-3" type="submit">Login</button>
	</form>
</div>
