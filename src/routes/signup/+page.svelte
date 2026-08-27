<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { ZodError } from 'zod';
	import type { ActionData, PageData } from './$types';
	import { registerSchema } from './registerSchema';

	let { form, data }: { form: ActionData; data: PageData } = $props();
	let users = $derived(data.users ?? []);
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

<div class="mt-8 flex w-full flex-col gap-8 px-4 md:flex-row md:px-6">
	<div class="flex w-full justify-center md:w-1/2">
		{#if loading}
			<div class="mt-20 flex justify-center">
				<div
					class="size-14 animate-spin rounded-full border-4 border-surface-300-700 border-t-primary-500"
				></div>
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
				class="w-full max-w-md space-y-3"
			>
				<h2 class="text-2xl font-semibold mb-4">Alta de Usuario</h2>
				<label class="label">
					<span>Nombre y Apellido</span>
					<input
						autocomplete="off"
						autosave="off"
						class="input"
						type="text"
						placeholder="Nombre"
						name="name"
					/>
					{#if fieldErrors['name']}
						<span class="text-red-500 text-sm">{fieldErrors['name']}</span>
					{/if}
				</label>
				<label class="label">
					<span>Contraseña</span>
					<input
						autocomplete="off"
						autosave="off"
						class="input"
						type="password"
						placeholder="Contraseña"
						name="password"
					/>
					{#if fieldErrors['password']}
						<span class="text-red-500 text-sm">{fieldErrors['password']}</span>
					{/if}
				</label>
				<label class="label">
					<span>Confirmar Contraseña</span>
					<input
						autocomplete="off"
						autosave="off"
						class="input"
						type="password"
						placeholder="Confirmar Contraseña"
						name="confirmPassword"
					/>
					{#if fieldErrors['confirmPassword']}
						{#each [fieldErrors['confirmPassword']].flat() as msg}
							<span class="block text-red-500 text-sm">{msg}</span>
						{/each}
					{/if}
				</label>
				{#if serverMessage}
					<p class="text-red-500 text-sm">{serverMessage}</p>
				{/if}
				<button type="submit" class="btn preset-filled-primary-500 mt-2">Guardar</button>
			</form>
		{/if}
	</div>

	<div class="w-full px-0 md:w-1/2">
		<h1 class="mb-4 text-2xl font-semibold">Usuarios del sistema</h1>
		<div class="overflow-x-auto">
			<table class="table w-full">
				<thead>
					<tr>
						<th>Nombre</th>
						<th>Rol</th>
						<th>Acciones</th>
					</tr>
				</thead>
				<tbody>
					{#if !users || users.length === 0}
						<tr>
							<td colspan="3" class="text-center opacity-60">No hay usuarios</td>
						</tr>
					{:else}
						{#each users as user (user.id)}
							<tr>
								<td>{user.name}</td>
								<td>{user.role}</td>
								<td>
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
											<button class="btn preset-filled-error-500 btn-sm">Eliminar</button>
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
