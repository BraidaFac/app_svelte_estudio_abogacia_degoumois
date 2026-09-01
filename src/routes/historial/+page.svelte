<script lang="ts">
	import BackToTop from '$lib/components/BackToTop.svelte';
	import type { ModalContext } from '$lib/types/modal.types';
	import { formatAmount } from '$lib/utils/currency';
	import { getContext } from 'svelte';
	import type { PageData } from './$types';
	import { CheckCircle, Trash2 } from '@lucide/svelte';

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

<section class="p-4 md:p-6">
	<div class="section-header">
		<h2 class="section-title">Historial de casos saldados</h2>
		<span class="badge badge-pagada">
			<CheckCircle size={13} />
			{cases.length} caso{cases.length !== 1 ? 's' : ''}
		</span>
	</div>

	{#if cases.length === 0}
		<div class="empty-state">
			<p style="color: #6e6e6e;">No hay casos en el historial</p>
		</div>
	{:else}
		<div class="overflow-x-auto">
			<table class="er-table" style="min-width: 760px;">
				<thead>
					<tr>
						<th>Estado</th>
						<th>Descripción</th>
						<th>Tipo</th>
						<th>Cliente</th>
						<th>Teléfono</th>
						<th class="col-numeric">Monto saldado</th>
						<th>Creado</th>
						<th class="col-actions">Detalles</th>
						<th class="col-actions">Eliminar</th>
					</tr>
				</thead>
				<tbody>
					{#each paginatedCases as caso}
						<tr class="row-pagada">
							<td class="status-cell">
								<div class="status-inner">
									<CheckCircle size={12} />
									Saldado
								</div>
							</td>
							<td>{caso.description}</td>
							<td style="color: #a8a8a8;">{caso.type}</td>
							<td>{caso.clientName}</td>
							<td style="color: #a8a8a8;">{caso.clientPhone}</td>
							<td class="col-numeric">{formatAmount(caso.amount, caso.currency.name)}</td>
							<td>{caso.created}</td>
							<td class="col-actions">
								<button class="btn btn-ghost btn-sm" onclick={() => openDetails(caso)}>
									Ver
								</button>
							</td>
							<td class="col-actions">
								<button class="btn btn-danger btn-sm" onclick={() => confirmDelete(caso)}>
									<Trash2 size={13} />
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		{#if totalPages > 1}
			<div class="pagination">
				<button
					class="btn btn-ghost btn-sm"
					disabled={currentPage === 1}
					onclick={() => goToPage(currentPage - 1)}
				>
					← Anterior
				</button>
				<span class="pagination-info">Página {currentPage} de {totalPages}</span>
				<button
					class="btn btn-ghost btn-sm"
					disabled={currentPage === totalPages}
					onclick={() => goToPage(currentPage + 1)}
				>
					Siguiente →
				</button>
			</div>
		{/if}
	{/if}
</section>

<style>
	.section-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1.25rem;
	}

	.section-title {
		font-family: 'Cinzel', Georgia, serif;
		font-size: 1.25rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		color: #f5f5f5;
		margin: 0;
	}

	.empty-state {
		margin-top: 4rem;
		text-align: center;
	}

	.pagination {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		margin-top: 1.5rem;
	}

	.pagination-info {
		font-size: 0.875rem;
		color: #a8a8a8;
	}
</style>
