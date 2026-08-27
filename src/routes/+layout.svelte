<script lang="ts">
	import { setContext } from 'svelte';
	import type { Snippet } from 'svelte';
	import BurgerBar from '$lib/components/BurgerBar.svelte';
	import ModalForm from '$lib/components/ModalForm.svelte';
	import ModalToPay from '$lib/components/ModalToPay.svelte';
	import ModalJus from '$lib/components/ModalJus.svelte';
	import ModalDetalles from '$lib/components/ModalDetalles.svelte';
	import type { LayoutData } from './$types';
	import type { FormattedCase } from '$lib/types/case.types';
	import type { ModalContext } from '$lib/types/modal.types';
	import '../app.css';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
	let user = $derived(data.user);

	let formDialog = $state<HTMLDialogElement | undefined>();
	let toPayDialog = $state<HTMLDialogElement | undefined>();
	let jusDialog = $state<HTMLDialogElement | undefined>();
	let detailsDialog = $state<HTMLDialogElement | undefined>();
	let activeCaso = $state<FormattedCase | null>(null);

	setContext<ModalContext>('modals', {
		openNewCase: () => formDialog?.showModal(),
		openToPay: (caso: FormattedCase) => {
			activeCaso = caso;
			toPayDialog?.showModal();
		},
		openJus: () => jusDialog?.showModal(),
		openDetails: (caso: FormattedCase) => {
			activeCaso = caso;
			detailsDialog?.showModal();
		}
	});
</script>

<ModalForm bind:dialog={formDialog} />
<ModalToPay bind:dialog={toPayDialog} caso={activeCaso} />
<ModalJus bind:dialog={jusDialog} />
<ModalDetalles bind:dialog={detailsDialog} caso={activeCaso} />

<nav class="flex flex-row justify-between h-20 items-center nav-bar">
	<div class="ml-3 flex justify-between gap-3 w-1/3">
		<a href="/"><h1 class="text-4xl title">Estudio Degoumois</h1></a>
	</div>
	<div class="w-1/3 flex justify-center">
		{#if user}
			<button
				class="btn preset-tonal-success"
				onclick={(e) => {
					e.preventDefault();
					formDialog?.showModal();
				}}>Nuevo Caso</button
			>
		{/if}
	</div>
	<div class="mr-3 w-1/3 flex justify-end gap-10 items-center">
		{#if user}
			<span>Hola {user.name}</span>
			<BurgerBar {user} />
		{/if}
	</div>
</nav>

{@render children()}

<style>
	.title {
		font-family: 'Cinzel', serif;
		font-optical-sizing: auto;
		font-style: normal;
	}
</style>
