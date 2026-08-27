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

<div class="flex min-h-[70vh] items-center justify-center px-4 py-12">
	<div class="card w-full max-w-md p-8 shadow-xl space-y-6">
		<header class="text-center">
			<h1 class="text-3xl font-semibold">Iniciar Sesión</h1>
			<p class="text-sm opacity-60 mt-1">Estudio Degoumois</p>
		</header>
		<form
			method="POST"
			class="space-y-4"
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
			<label class="label">
				<span class="font-medium">Nombre</span>
				<input class="input" type="text" name="name" autocomplete="username" />
			</label>
			<label class="label">
				<span class="font-medium">Contraseña</span>
				<input class="input" type="password" name="password" autocomplete="current-password" />
			</label>
			{#if form?.message || clientError}
				<p class="text-red-500 text-sm">{form?.message ?? clientError}</p>
			{/if}
			<button class="btn preset-filled-primary-500 w-full mt-2" type="submit">Ingresar</button>
		</form>
	</div>
</div>
