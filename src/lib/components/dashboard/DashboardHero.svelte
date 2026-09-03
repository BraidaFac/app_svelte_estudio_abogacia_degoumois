<script lang="ts">
	let {
		cobradoEsteMesARS,
		porCobrarEsteMesARS,
		totalVencidoARS,
		casosActivos,
		displayAmount
	}: {
		cobradoEsteMesARS: number;
		porCobrarEsteMesARS: number;
		totalVencidoARS: number;
		casosActivos: number;
		displayAmount: (ars: number) => string;
	} = $props();
</script>

<div class="hero-grid">
	<div class="card hero-card">
		<p class="hero-label">Cobrado este mes</p>
		<p class="hero-value">{displayAmount(cobradoEsteMesARS)}</p>
	</div>
	<div class="card hero-card">
		<p class="hero-label">Por cobrar este mes</p>
		<p class="hero-value" style="color: var(--color-proximo);">
			{displayAmount(porCobrarEsteMesARS)}
		</p>
	</div>
	<div class="card hero-card">
		<p class="hero-label">Total vencido</p>
		<p class="hero-value" style="color: var(--color-vencida);">
			{displayAmount(totalVencidoARS)}
		</p>
	</div>
	<div class="card hero-card">
		<p class="hero-label">Casos activos</p>
		<p class="hero-value">{casosActivos}</p>
	</div>
</div>

<style>
	.hero-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
	}

	@media (max-width: 768px) {
		.hero-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 480px) {
		.hero-grid {
			grid-template-columns: 1fr;
		}
	}

	.hero-card {
		padding: 1.5rem;
		text-align: center;
	}

	.hero-label {
		font-family: 'IBM Plex Sans', sans-serif;
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-proximo);
		margin: 0 0 0.75rem;
	}

	.hero-value {
		font-family: 'IBM Plex Mono', monospace;
		font-size: clamp(1rem, 1.5vw, 1.35rem);
		font-weight: 500;
		font-variant-numeric: tabular-nums;
		line-height: 1.2;
		margin: 0;
		color: var(--color-text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
