<script lang="ts">
	import type { Role } from '@prisma/client';
	import type { ModalContext } from '$lib/types/modal.types';
	import { getContext } from 'svelte';

	let { user }: { user: { id: number; name: string; role: Role } } = $props();

	const { openNewCase, openJus } = getContext<ModalContext>('modals');

	let action_flag = $state(false);
	let logoutForm = $state<HTMLFormElement | undefined>();

	$effect(() => {
		const handler = (e: MouseEvent) => {
			if (e.target !== document.getElementById('menu-button')) {
				action_flag = false;
			}
		};
		document.querySelector('body')?.addEventListener('click', handler);
		return () => document.querySelector('body')?.removeEventListener('click', handler);
	});
</script>

<div class="burger relative float-right">
	<div class="relative inline-block text-left">
		<button
			onclick={() => (action_flag = !action_flag)}
			type="button"
			class="btn btn-sm preset-tonal-surface"
			id="menu-button"
			aria-expanded={action_flag}
			aria-haspopup="true"
		>
			Acciones
			<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>
		{#if action_flag}
			<div
				class="card absolute right-0 z-20 mt-1 w-40 shadow-xl"
				role="menu"
				aria-orientation="vertical"
				aria-labelledby="menu-button"
			>
				<div class="p-1 flex flex-col" role="none">
					<a
						href="/"
						onclick={(e) => {
							e.preventDefault();
							action_flag = false;
							openNewCase();
						}}
						class="btn btn-sm justify-start font-normal"
						role="menuitem"
						tabindex="-1">Nuevo caso</a
					>
					<a
						href="/"
						onclick={(e) => {
							e.preventDefault();
							action_flag = false;
							openJus();
						}}
						class="btn btn-sm justify-start font-normal"
						role="menuitem"
						tabindex="-1">JUS</a
					>
					{#if user.role === 'ADMIN'}
						<a
							href="/signup"
							class="btn btn-sm justify-start font-normal"
							role="menuitem"
							tabindex="-1">Alta Usuario</a
						>
						<a
							href="/historial"
							class="btn btn-sm justify-start font-normal"
							role="menuitem"
							tabindex="-1">Historial</a
						>
					{/if}
					<hr class="my-1 border-surface-300-700" />
					<form method="POST" action="/logout" bind:this={logoutForm}>
						<button
							onclick={() => {
								action_flag = false;
								logoutForm?.submit();
							}}
							class="btn btn-sm justify-start font-normal text-error-500 w-full"
							role="menuitem"
							tabindex="-1">Cerrar sesión</button
						>
					</form>
				</div>
			</div>
		{/if}
	</div>
</div>
