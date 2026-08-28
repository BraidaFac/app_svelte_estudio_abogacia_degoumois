<script lang="ts">
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
		class="btn preset-filled-warning-500 fixed bottom-5 left-1/2 z-10 h-8 -translate-x-1/2"
		onclick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
	>
		Volver
	</button>
{/if}
