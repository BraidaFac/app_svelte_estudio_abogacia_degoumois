<script lang="ts">
	import BackToTop from '$lib/components/BackToTop.svelte';
	import type { ModalContext } from '$lib/types/modal.types';
	import { formatJUS } from '$lib/utils/formatters';
	import { getContext } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let cases = $derived(data.cases);

	const { openDetails } = getContext<ModalContext>('modals');

	const PAGE_SIZE = 20;
	let currentPage = $state(1);

	let totalPages = $derived(Math.ceil(cases.length / PAGE_SIZE));
	let paginatedCases = $derived(
		cases.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
	);

	function goToPage(page: number) {
		currentPage = Math.max(1, Math.min(page, totalPages));
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function confirmDelete(caso: any) {
		if (!confirm('¿Estás seguro de eliminar el caso?')) return;
		const data = new FormData();
		data.append('caseId', String(caso.id));
		fetch('/historial', { method: 'POST', body: data }).then(async (response) => {
			if (response.status !== 200) {
				const error = (await response.json()).error?.message ?? 'Error al eliminar';
				alert(error);
			} else {
				alert('Se ha eliminado el caso correctamente');
				window.location.reload();
			}
		});
	}
</script>

<BackToTop />
<section class="p-3">
	<p class="my-4 rounded-md text-center text-3xl">Historial de cancelación total</p>

	{#if cases.length === 0}
		<div class="text-surface-400 mt-16 flex flex-col items-center gap-4">
			<p class="text-xl">No hay casos en el historial</p>
		</div>
	{:else}
		<div class="overflow-x-auto">
			<table class="table min-w-[700px] text-center">
				<thead>
					<tr>
						<th class="text-center">Descripcion</th>
						<th class="text-center">Tipo caso</th>
						<th class="text-center">Nombre cliente</th>
						<th class="text-center">Telefono cliente</th>
						<th class="text-center">Monto saldado</th>
						<th class="text-center">Creado</th>
						<th class="text-center">Detalles</th>
						<th class="text-center">Eliminar</th>
					</tr>
				</thead>
				<tbody>
					{#each paginatedCases as caso}
						<tr>
							<td>{caso.description}</td>
							<td>{caso.type}</td>
							<td>{caso.clientName}</td>
							<td>{caso.clientPhone}</td>
							<td>{formatJUS(caso.amount)}</td>
							<td>{caso.created}</td>
							<td>
								<button
									class="btn preset-filled-warning-500 btn-sm"
									onclick={() => openDetails(caso)}>Ver</button
								>
							</td>
							<td>
								<button
									class="btn preset-filled-primary-500 btn-sm"
									onclick={() => confirmDelete(caso)}>Eliminar</button
								>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		{#if totalPages > 1}
			<div class="mt-4 flex items-center justify-center gap-2">
				<button
					class="btn btn-sm variant-soft"
					disabled={currentPage === 1}
					onclick={() => goToPage(currentPage - 1)}
				>
					← Anterior
				</button>
				<span class="text-sm">Página {currentPage} de {totalPages}</span>
				<button
					class="btn btn-sm variant-soft"
					disabled={currentPage === totalPages}
					onclick={() => goToPage(currentPage + 1)}
				>
					Siguiente →
				</button>
			</div>
		{/if}
	{/if}
</section>
