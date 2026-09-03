<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let clientError = $state<string | null>(null);

	function validateOrThrow(formdata: FormData) {
		const obj = Object.fromEntries(formdata.entries());
		if (obj.name === '' || obj.password === '') {
			throw new Error('Nombre y contraseña son requeridos');
		}
	}

	function manageError(error: unknown) {
		if (error instanceof Error) clientError = error.message;
	}
</script>

<div class="login-page">
	<div class="login-container">
		<div class="login-brand">
			<div class="brand-divider" style="margin-bottom: 2rem;">Sistema de Gestión</div>
			<h1 class="login-title">Estudio<br />Degoumois</h1>
			<div class="brand-divider" style="margin-top: 2rem;">& Asociados</div>
		</div>

		<form
			method="POST"
			class="login-form"
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
			<div class="label">
				<span>Nombre</span>
				<input class="input" type="text" name="name" autocomplete="username" />
			</div>
			<div class="label">
				<span>Contraseña</span>
				<input class="input" type="password" name="password" autocomplete="current-password" />
			</div>

			{#if form?.message || clientError}
				<p class="text-error" style="margin-bottom: 0.75rem;">{form?.message ?? clientError}</p>
			{/if}

			<button class="btn btn-primary" type="submit" style="width: 100%; margin-top: 0.5rem;">
				Ingresar
			</button>
		</form>
	</div>
</div>

<style>
	.login-page {
		min-height: 100vh;
		background: #000000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem 1rem;
	}

	.login-container {
		width: 100%;
		max-width: 26rem;
		display: flex;
		flex-direction: column;
		gap: 2.5rem;
	}

	.login-brand {
		text-align: center;
	}

	.login-title {
		font-family: 'Cinzel', Georgia, serif;
		font-size: clamp(2.5rem, 8vw, 4rem);
		font-weight: 700;
		letter-spacing: 0.06em;
		line-height: 1.1;
		color: #f5f5f5;
		margin: 0;
	}

	.login-form {
		display: flex;
		flex-direction: column;
		background: #0d0d0d;
		border: 1px solid #2e2e2e;
		border-radius: 6px;
		padding: 2rem;
	}
</style>
