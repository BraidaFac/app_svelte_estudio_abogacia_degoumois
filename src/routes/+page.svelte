<script lang="ts">
	import CasesContainer from '$lib/components/CasesContainer.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="hero-section">
	<a href="/vencido" class="hero-card card card-hover">
		<p class="hero-label" style="color: #ff6b5e;">Cuotas vencidas</p>
		<p class="hero-count" style="color: #ff6b5e;">{data.counts.overdue}</p>
	</a>
	<a href="/proximo" class="hero-card card card-hover">
		<p class="hero-label" style="color: #e6a93c;">Próximos vencimientos</p>
		<p class="hero-count" style="color: #e6a93c;">{data.counts.soon}</p>
	</a>
	<a href="/atiempo" class="hero-card card card-hover">
		<p class="hero-label" style="color: #3fb98a;">Cuotas al día</p>
		<p class="hero-count" style="color: #3fb98a;">{data.counts.onTime}</p>
	</a>
</div>

<CasesContainer cases={data.cases} />

<style>
	.hero-section {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
		padding: 1.5rem 1rem;
		margin-bottom: 0.5rem;
	}

	@media (max-width: 640px) {
		.hero-section {
			grid-template-columns: 1fr;
			padding: 1rem;
		}
	}

	.hero-card {
		display: block;
		padding: 1.5rem;
		text-align: center;
		text-decoration: none;
	}

	.hero-label {
		font-family: 'IBM Plex Sans', system-ui, sans-serif;
		font-size: 0.875rem;
		font-weight: 500;
		letter-spacing: 0.02em;
		margin: 0 0 0.75rem;
		opacity: 0.85;
	}

	.hero-count {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 3.5rem;
		font-weight: 500;
		font-variant-numeric: tabular-nums;
		line-height: 1;
		margin: 0;
	}
</style>
