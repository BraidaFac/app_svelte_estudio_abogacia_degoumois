<script lang="ts">
	import type { Role } from '@prisma/client';
	import { getModalStore, type ModalSettings } from '@skeletonlabs/skeleton';
	import { onMount } from 'svelte';

	export let user: { id: number; name: string; role: Role };

	onMount(() => {
		let body = document.querySelector('body');
		body?.addEventListener('click', (e) => {
			if (e.target !== document.getElementById('menu-button')) {
				action_flag = false;
			}
		});
	});

	const modalStore = getModalStore();
	const modal: ModalSettings = {
		type: 'component',
		component: 'modal'
	};

	const 	modalJus: ModalSettings = {
		type: 'component',
		component: 'modalJus'
	};

	let action_flag = false;
	let logoutForm: HTMLFormElement;
</script>

<div class="burger relative float-right">
	<div class="relative inline-block text-left">
		<div>
			<button
				on:click={() => (action_flag = !action_flag)}
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
						on:click|preventDefault={() => {
							action_flag = !action_flag;
							modalStore.trigger(modal);
						}}
						class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 hover:text-gray-900 transition-colors duration-150"
						role="menuitem"
						tabindex="-1"
						id="menu-item-1">Nuevo caso</a
					>
					<a
						href="/"
						on:click|preventDefault={() => {
							action_flag = !action_flag;
							modalStore.trigger(modalJus);
						}}
						class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 hover:text-gray-900 transition-colors duration-150"
						role="menuitem"
						tabindex="-1"
						id="menu-item-1">JUS</a
					>
					{#if user.role === 'ADMIN'}
						<a
							href="/signup"
							class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 hover:text-gray-900 transition-colors duration-150"
							role="menuitem"
							tabindex="-1"
							id="menu-item-1">Alta Usuario</a
						>
						<a
							href="/historial"
							class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 hover:text-gray-900 transition-colors duration-150"
							role="menuitem"
							tabindex="-1"
							id="menu-item-1">Historial</a
						>
					{/if}
					<form method="POST" action="/logout" bind:this={logoutForm}>
						<button
							on:click={() => {
								action_flag = !action_flag;
								logoutForm?.submit();
							}}
							class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-200 hover:text-gray-900 transition-colors duration-150"
							role="menuitem"
							tabindex="-1"
							id="menu-item-3">Sign out</button
						>
					</form>
				</div>
			</div>
		{/if}
	</div>
</div>
