<script lang="ts">
	import { page } from '$app/state';
</script>

<div class="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-8">
	<div class="card p-8 text-center shadow-xl">
		<h1 class="text-error-500 mb-2 text-6xl font-bold">
			{page.status}
		</h1>
		<p class="mb-6 text-2xl">
			{page.error?.message ?? 'Ocurrió un error inesperado'}
		</p>
		<a href="/" class="btn preset-filled-primary-500">Volver al inicio</a>
	</div>
</div>
