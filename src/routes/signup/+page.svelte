<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { ZodError } from 'zod';
	import type { ActionData, PageData } from './$types';
	import { registerSchema } from './registerSchema';
	import { Trash2 } from '@lucide/svelte';

	let { form, data }: { form: ActionData; data: PageData } = $props();
	const users: { id: number; name: string; role: string }[] = [];
	const currentUser = page.data.user;
	let loading = $state(false);
	let fieldErrors = $state<Record<string, string | string[] | undefined>>({});
	let serverMessage = $state<string | null>(null);

	function validateOrThrow(formdata: FormData) {
		const obj = Object.fromEntries(formdata.entries());
		registerSchema.parse(obj);
	}

	function manageError(error: unknown) {
		if (error instanceof ZodError) {
			const { fieldErrors: fe } = error.flatten();
			fieldErrors = fe;
		}
	}

	$effect(() => {
		if (form?.message) serverMessage = form.message;
		if (form?.errors) fieldErrors = form.errors as Record<string, string | string[] | undefined>;
	});
</script>

<div class="signup-layout">
	<div class="signup-form-col">
		<h2 class="page-title">Alta de Usuario</h2>

		{#if loading}
			<div style="display: flex; justify-content: center; padding: 3rem 0;">
				<div class="er-spinner"></div>
			</div>
		{:else}
			<form
				method="POST"
				action="?/create"
				use:enhance={({ formData, cancel }) => {
					try {
						loading = true;
						fieldErrors = {};
						serverMessage = null;
						validateOrThrow(formData);
						return ({ update }) => {
							loading = false;
							update();
							invalidateAll();
						};
					} catch (error) {
						cancel();
						loading = false;
						manageError(error);
					}
				}}
				class="signup-form"
			>
				<div class="label">
					<span>Nombre y Apellido</span>
					<input autocomplete="off" class="input" type="text" placeholder="Nombre" name="name" />
					{#if fieldErrors['name']}
						<span class="text-error">{fieldErrors['name']}</span>
					{/if}
				</div>
				<div class="label">
					<span>Contraseña</span>
					<input
						autocomplete="off"
						class="input"
						type="password"
						placeholder="Contraseña"
						name="password"
					/>
					{#if fieldErrors['password']}
						<span class="text-error">{fieldErrors['password']}</span>
					{/if}
				</div>
				<div class="label">
					<span>Confirmar Contraseña</span>
					<input
						autocomplete="off"
						class="input"
						type="password"
						placeholder="Confirmar Contraseña"
						name="confirmPassword"
					/>
					{#if fieldErrors['confirmPassword']}
						{#each [fieldErrors['confirmPassword']].flat() as msg}
							<span class="text-error">{msg}</span>
						{/each}
					{/if}
				</div>
				{#if serverMessage}
					<p class="text-error" style="margin-bottom: 0.75rem;">{serverMessage}</p>
				{/if}
				<button type="submit" class="btn btn-primary">Guardar</button>
			</form>
		{/if}
	</div>

	<div class="users-col">
		<h2 class="page-title">Usuarios del sistema</h2>
		<div class="overflow-x-auto">
			<table class="er-table">
				<thead>
					<tr>
						<th>Nombre</th>
						<th>Rol</th>
						<th class="col-actions">Acciones</th>
					</tr>
				</thead>
				<tbody>
					{#if !users || users.length === 0}
						<tr>
							<td colspan="3" style="text-align: center; padding: 2rem; color: #6e6e6e;">
								No hay usuarios
							</td>
						</tr>
					{:else}
						{#each users as user (user.id)}
							<tr>
								<td>{user.name}</td>
								<td style="color: #a8a8a8;">{user.role}</td>
								<td class="col-actions">
									{#if user.id !== currentUser.id}
										<form
											method="POST"
											action="?/delete"
											use:enhance={() => {
												return ({ update, result }) => {
													if (result.status === 200) invalidateAll();
												};
											}}
										>
											<input hidden type="text" name="id" value={user.id} />
											<button class="btn btn-danger btn-sm">
												<Trash2 size={13} />
											</button>
										</form>
									{/if}
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>

<style>
	.signup-layout {
		display: flex;
		flex-direction: column;
		gap: 2.5rem;
		padding: 1.5rem 1rem;
	}

	@media (min-width: 768px) {
		.signup-layout {
			flex-direction: row;
			padding: 2rem 1.5rem;
		}

		.signup-form-col {
			width: 50%;
		}

		.users-col {
			width: 50%;
		}
	}

	.page-title {
		font-family: 'Cinzel', Georgia, serif;
		font-size: 1.25rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		color: #f5f5f5;
		margin: 0 0 1.25rem;
	}

	.signup-form {
		display: flex;
		flex-direction: column;
		max-width: 28rem;
	}
</style>
