<script lang="ts">
	import { onMount } from 'svelte';

	const NEW_URL = 'https://www.degoumoisabogados.com.ar';
	let countdown = $state(10);

	onMount(() => {
		const interval = setInterval(() => {
			countdown--;
			if (countdown <= 0) {
				clearInterval(interval);
				window.location.href = NEW_URL;
			}
		}, 1000);
		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<title>Estudio Degoumois — Nuevo sitio</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=IBM+Plex+Sans:wght@400;500&display=swap"
		rel="stylesheet"
	/>
	<meta http-equiv="refresh" content="10;url={NEW_URL}" />
</svelte:head>

<main>
	<div class="card">
		<div class="logo-wrap">
			<div class="logo-line"></div>
			<span class="logo-icon">⚖</span>
			<div class="logo-line"></div>
		</div>

		<h1 class="firm-name">Estudio Degoumois</h1>

		<div class="divider"></div>

		<p class="message">
			Disculpe las molestias.<br />
			Actualizamos nuestro servicio y nos mudamos a una nueva dirección.
		</p>

		<a href={NEW_URL} class="new-url-btn">
			www.degoumoisabogados.com.ar
		</a>

		<p class="countdown">
			Será redirigido automáticamente en <strong>{countdown}</strong> segundo{countdown !== 1 ? 's' : ''}...
		</p>
	</div>
</main>

<style>
	:global(*, *::before, *::after) { box-sizing: border-box; margin: 0; padding: 0; }

	:global(body) {
		background: #0d0d0d;
		color: #f5f5f5;
		font-family: 'IBM Plex Sans', sans-serif;
		min-height: 100vh;
	}

	main {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
	}

	.card {
		background: #141414;
		border: 1px solid #2e2e2e;
		border-radius: 12px;
		padding: 3rem 2.5rem;
		max-width: 520px;
		width: 100%;
		text-align: center;
		box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6);
	}

	.logo-wrap {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}

	.logo-line {
		flex: 1;
		height: 1px;
		background: #2e2e2e;
		max-width: 60px;
	}

	.logo-icon {
		font-size: 1.5rem;
		opacity: 0.5;
	}

	.firm-name {
		font-family: 'Cinzel', Georgia, serif;
		font-size: 1.6rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		color: #f5f5f5;
		margin-bottom: 1.5rem;
	}

	.divider {
		width: 40px;
		height: 2px;
		background: #d43124;
		margin: 0 auto 1.75rem;
		border-radius: 2px;
	}

	.message {
		color: #a8a8a8;
		font-size: 0.95rem;
		line-height: 1.7;
		margin-bottom: 2rem;
	}

	.new-url-btn {
		display: inline-block;
		background: #d43124;
		color: #fff;
		text-decoration: none;
		font-family: 'IBM Plex Sans', sans-serif;
		font-size: 0.9rem;
		font-weight: 500;
		letter-spacing: 0.02em;
		padding: 0.75rem 1.75rem;
		border-radius: 6px;
		margin-bottom: 1.75rem;
		transition: background 150ms ease, box-shadow 150ms ease;
	}

	.new-url-btn:hover {
		background: #b82a1f;
		box-shadow: 0 4px 16px rgba(212, 49, 36, 0.35);
	}

	.countdown {
		color: #4e4e4e;
		font-size: 0.8rem;
	}

	.countdown strong {
		color: #6e6e6e;
	}
</style>
