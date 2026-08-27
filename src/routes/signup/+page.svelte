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

<div class="mt-10 flex w-full justify-center">
	<div class="flex w-1/2 justify-center">
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
				class="w-3/4"
			>
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
						<span class="text-red-600">{fieldErrors['name']}</span>
					{/if}
				</label>
				<label class="label">
					<span>Password</span>
					<input
						autocomplete="off"
						autosave="off"
						class="input"
						type="password"
						placeholder="Password"
						name="password"
					/>
					{#if fieldErrors['password']}
						<span class="text-red-600">{fieldErrors['password']}</span>
					{/if}
				</label>
				<label class="label">
					<span>Confirmar Password</span>
					<input
						autocomplete="off"
						autosave="off"
						class="input"
						type="password"
						placeholder="Confirmar Password"
						name="confirmPassword"
					/>
					{#if fieldErrors['confirmPassword']}
						{#each [fieldErrors['confirmPassword']].flat() as msg}
							<span class="block text-red-600">{msg}</span>
						{/each}
					{/if}
				</label>
				{#if serverMessage}
					<span class="block text-red-600">{serverMessage}</span>
				{/if}
				<button type="submit" class="btn preset-filled-primary-500 mt-4">Guardar</button>
			</form>
		{/if}
	</div>
	<div class="w-1/2 px-3">
		<h1 class="mb-3 text-center text-4xl">Usuarios</h1>
		<table class="table">
			<thead class="bg-gray-50">
				<tr>
					<th>Nombre</th>
					<th>Rol</th>
					<th>Acciones</th>
				</tr>
			</thead>
			<tbody>
				{#if !users || users.length === 0}
					<tr>
						<td colspan="3">No hay usuarios</td>
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
										<button class="btn preset-filled-primary-500 btn-sm">Eliminar</button>
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
