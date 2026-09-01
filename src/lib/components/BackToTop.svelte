<script lang="ts">
	import { ArrowUp } from '@lucide/svelte';

	let visible = $state(false);

	$effect(() => {
		const handler = () => {
			const navBar = document.querySelector('.nav-bar');
			visible = !!(navBar && window.scrollY > navBar.clientHeight + 100);
		};
		document.addEventListener('scroll', handler, { passive: true });
		return () => document.removeEventListener('scroll', handler);
	});
</script>

{#if visible}
	<button
		class="back-to-top"
		onclick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
		aria-label="Volver arriba"
	>
		<ArrowUp size={16} />
		Volver
	</button>
{/if}

<style>
	.back-to-top {
		position: fixed;
		bottom: 1.5rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 40;
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.4rem 1rem;
		font-family: 'IBM Plex Sans', system-ui, sans-serif;
		font-size: 0.8125rem;
		font-weight: 500;
		color: #f5f5f5;
		background: #242424;
		border: 1px solid #3e3e3e;
		border-radius: 100px;
		cursor: pointer;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
		transition:
			background-color 150ms ease,
			border-color 150ms ease;
	}

	.back-to-top:hover {
		background: #1a1a1a;
		border-color: #d43124;
	}
</style>
