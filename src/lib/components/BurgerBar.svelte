<script lang="ts">
	import type { Role } from '@prisma/client';
	import type { ModalContext } from '$lib/types/modal.types';
	import { getContext } from 'svelte';
	import { DropdownMenu } from 'bits-ui';
	import { ChevronDown, FilePlus, Scale, UserPlus, History, LogOut } from '@lucide/svelte';

	let { user }: { user: { id: number; name: string; role: Role } } = $props();

	const { openNewCase, openCurrencies } = getContext<ModalContext>('modals');

	let logoutForm = $state<HTMLFormElement | undefined>();
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<button {...props} class="btn btn-ghost btn-sm">
				Acciones
				<ChevronDown size={14} />
			</button>
		{/snippet}
	</DropdownMenu.Trigger>

	<DropdownMenu.Portal>
		<DropdownMenu.Content class="dropdown-content" sideOffset={6} align="end">
			<DropdownMenu.Item class="dropdown-item" onSelect={openNewCase}>
				<FilePlus size={14} />
				Nuevo caso
			</DropdownMenu.Item>

			<DropdownMenu.Item class="dropdown-item" onSelect={openCurrencies}>
				<Scale size={14} />
				Monedas
			</DropdownMenu.Item>

			{#if user.role === 'ADMIN'}
				<DropdownMenu.Separator class="dropdown-separator" />
				<DropdownMenu.Item class="dropdown-item">
					{#snippet child({ props })}
						<a {...props} href="/signup">
							<UserPlus size={14} />
							Alta Usuario
						</a>
					{/snippet}
				</DropdownMenu.Item>
				<DropdownMenu.Item class="dropdown-item">
					{#snippet child({ props })}
						<a {...props} href="/historial">
							<History size={14} />
							Historial
						</a>
					{/snippet}
				</DropdownMenu.Item>
			{/if}

			<DropdownMenu.Separator class="dropdown-separator" />

			<form method="POST" action="/logout" bind:this={logoutForm} style="display:contents">
				<DropdownMenu.Item class="dropdown-item danger" onSelect={() => logoutForm?.submit()}>
					<LogOut size={14} />
					Cerrar sesión
				</DropdownMenu.Item>
			</form>
		</DropdownMenu.Content>
	</DropdownMenu.Portal>
</DropdownMenu.Root>
