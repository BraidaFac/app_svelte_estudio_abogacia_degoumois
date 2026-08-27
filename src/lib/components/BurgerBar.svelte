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
		<div>
			<button
				onclick={() => (action_flag = !action_flag)}
				type="button"
				class="inline-flex w-full justify-center gap-x-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-white hover:text-black"
				id="menu-button"
				aria-expanded="true"
				aria-haspopup="true"
			>
				Acciones
			</button>
		</div>
		{#if action_flag}
			<div
				class="absolute right-0 z-10 mt-2 w-28 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
				role="menu"
				aria-orientation="vertical"
				aria-labelledby="menu-button"
				tabindex="-1"
			>
				<div class="py-1" role="none">
					<a
						href="/"
						onclick={(e) => {
							e.preventDefault();
							action_flag = false;
							openNewCase();
						}}
						class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 hover:text-gray-900 transition-colors duration-150"
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
						class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 hover:text-gray-900 transition-colors duration-150"
						role="menuitem"
						tabindex="-1">JUS</a
					>
					{#if user.role === 'ADMIN'}
						<a
							href="/signup"
							class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 hover:text-gray-900 transition-colors duration-150"
							role="menuitem"
							tabindex="-1">Alta Usuario</a
						>
						<a
							href="/historial"
							class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 hover:text-gray-900 transition-colors duration-150"
							role="menuitem"
							tabindex="-1">Historial</a
						>
					{/if}
					<form method="POST" action="/logout" bind:this={logoutForm}>
						<button
							onclick={() => {
								action_flag = false;
								logoutForm?.submit();
							}}
							class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-200 hover:text-gray-900 transition-colors duration-150"
							role="menuitem"
							tabindex="-1">Sign out</button
						>
					</form>
				</div>
			</div>
		{/if}
	</div>
</div>
