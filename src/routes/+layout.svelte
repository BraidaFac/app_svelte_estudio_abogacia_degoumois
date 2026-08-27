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

<nav class="nav-bar flex items-center justify-between border-b border-surface-300-700 px-4 py-3 md:px-6 md:py-4">
	<a href="/" class="flex-shrink-0">
		<h1 class="title text-2xl md:text-3xl lg:text-4xl">Estudio Degoumois</h1>
	</a>

	<div class="flex items-center gap-3 md:gap-6">
		{#if user}
			<button
				class="btn preset-tonal-success btn-sm md:btn-md hidden sm:inline-flex"
				onclick={(e) => {
					e.preventDefault();
					formDialog?.showModal();
				}}>Nuevo Caso</button
			>
			<span class="hidden md:inline text-sm opacity-75">Hola, {user.name}</span>
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
