<script lang="ts">
	import { setContext } from 'svelte';
	import { page } from '$app/stores';
	import type { Snippet } from 'svelte';
	import { Toaster } from '@skeletonlabs/skeleton-svelte';
	import { toaster } from '$lib/stores/toast';
	import BurgerBar from '$lib/components/BurgerBar.svelte';
	import ModalForm from '$lib/components/ModalForm.svelte';
	import ModalToPay from '$lib/components/ModalToPay.svelte';
	import ModalCurrencies from '$lib/components/ModalCurrencies.svelte';
	import ModalConverter from '$lib/components/ModalConverter.svelte';
	import ModalDetalles from '$lib/components/ModalDetalles.svelte';
	import type { LayoutData } from './$types';
	import type { FormattedCase } from '$lib/types/case.types';
	import type { ModalContext } from '$lib/types/modal.types';
	import '../app.css';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
	let user = $derived(data.user);

	let formDialog = $state<HTMLDialogElement | undefined>();
	let toPayDialog = $state<HTMLDialogElement | undefined>();
	let currenciesDialog = $state<HTMLDialogElement | undefined>();
	let converterDialog = $state<HTMLDialogElement | undefined>();
	let detailsDialog = $state<HTMLDialogElement | undefined>();
	let activeCaso = $state<FormattedCase | null>(null);
	let detailsStartEdit = $state(false);
	let detailsStartDelete = $state(false);

	setContext<ModalContext>('modals', {
		openNewCase: () => formDialog?.showModal(),
		openToPay: (caso: FormattedCase) => {
			activeCaso = caso;
			toPayDialog?.showModal();
		},
		openCurrencies: () => currenciesDialog?.showModal(),
		openDetails: (caso: FormattedCase) => {
			activeCaso = caso;
			detailsDialog?.showModal();
		},
		openEdit: (caso: FormattedCase) => {
			activeCaso = caso;
			detailsStartEdit = true;
			detailsDialog?.showModal();
		},
		openDelete: (caso: FormattedCase) => {
			activeCaso = caso;
			detailsStartDelete = true;
			detailsDialog?.showModal();
		},
		openConverter: () => converterDialog?.showModal()
	});
</script>

<Toaster {toaster} />
<ModalForm bind:dialog={formDialog} />
<ModalToPay bind:dialog={toPayDialog} caso={activeCaso} />
<ModalCurrencies bind:dialog={currenciesDialog} />
<ModalConverter bind:dialog={converterDialog} />
<ModalDetalles bind:dialog={detailsDialog} caso={activeCaso} bind:startEdit={detailsStartEdit} bind:triggerDelete={detailsStartDelete} />

{#if user}
	<nav class="nav-bar flex items-center justify-between px-5 py-3 md:px-8 md:py-4">
		<a href="/" class="flex-shrink-0 no-underline">
			<span class="nav-title">Estudio Degoumois</span>
		</a>

		<nav class="site-nav hidden md:flex">
			<a href="/" class="site-nav-link" class:active={$page.url.pathname === '/'}>Inicio</a>
			<span class="site-nav-sep">·</span>
			<a href="/historial" class="site-nav-link" class:active={$page.url.pathname === '/historial'}>Historial</a>
			<span class="site-nav-sep">·</span>
			<a href="/dashboard" class="site-nav-link" class:active={$page.url.pathname.startsWith('/dashboard')}>Dashboard</a>
		</nav>

		<div class="flex items-center gap-3 md:gap-5">
			<button
				class="btn btn-primary btn-sm hidden sm:inline-flex"
				onclick={(e) => {
					e.preventDefault();
					formDialog?.showModal();
				}}
			>
				Nuevo Caso
			</button>
			<span class="hidden text-sm opacity-60 md:inline">{user.name}</span>
			<BurgerBar {user} />
		</div>
	</nav>
{/if}

{@render children()}

<style>
	.nav-title {
		font-family: 'Cinzel', Georgia, serif;
		font-size: 1.25rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		color: #f5f5f5;
	}

	@media (min-width: 768px) {
		.nav-title {
			font-size: 1.5rem;
		}
	}

	.site-nav {
		align-items: center;
		gap: 0.5rem;
	}

	:global(.site-nav-link) {
		font-size: 0.8rem;
		font-weight: 500;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: #6e6e6e;
		text-decoration: none;
		padding-bottom: 2px;
		border-bottom: 1px solid transparent;
		transition: color 0.15s, border-color 0.15s;
	}

	:global(.site-nav-link:hover) {
		color: #a8a8a8;
	}

	:global(.site-nav-link.active) {
		color: #f5f5f5;
		border-bottom-color: #d43124;
	}

	.site-nav-sep {
		color: #2e2e2e;
		font-size: 0.85rem;
		user-select: none;
	}
</style>
