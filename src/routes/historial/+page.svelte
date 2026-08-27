<script lang="ts">
	import type { ModalContext } from '$lib/types/modal.types';
	import { getContext } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let cases = $derived(data.cases);

	const { openDetails } = getContext<ModalContext>('modals');

	let activeBtn = $state(false);

	$effect(() => {
		const handler = () => {
			const navBar = document.querySelector('.nav-bar');
			activeBtn = !!(navBar && window.scrollY > navBar.clientHeight + 100);
		};
		document.addEventListener('scroll', handler);
		return () => document.removeEventListener('scroll', handler);
	});

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

{#if activeBtn}
	<button
		class="btn preset-filled-warning-500 fixed bottom-5 left-1/2 h-8"
		onclick={() => (document.documentElement.scrollTop = 0)}>Volver</button
	>
{/if}
<section class="p-3">
	<p class="my-4 rounded-md text-center text-3xl">Historial de cancelación total</p>
	<table class="table text-center">
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
			{#if cases.length === 0}
				<tr>
					<td colspan="8">No existen</td>
				</tr>
			{:else}
				{#each cases as caso}
					<tr>
						<td>{caso.description}</td>
						<td>{caso.type}</td>
						<td>{caso.clientName}</td>
						<td>{caso.clientPhone}</td>
						<td>{caso.amount} JUS</td>
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
			{/if}
		</tbody>
	</table>
</section>
