<script lang="ts">
	import type { ModalContext } from '$lib/types/modal.types';
	import type { FormattedCase } from '$lib/types/case.types';
	import { page } from '$app/state';
	import { getContext } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let cases = $derived(data.cases as FormattedCase[]);
	const param = page.params.estado ?? '';

	const { openToPay, openDetails } = getContext<ModalContext>('modals');

	let activeBtn = $state(false);

	$effect(() => {
		const handler = () => {
			const navBar = document.querySelector('.nav-bar');
			activeBtn = !!(navBar && window.scrollY > navBar.clientHeight + 100);
		};
		document.addEventListener('scroll', handler);
		return () => document.removeEventListener('scroll', handler);
	});
</script>

{#if activeBtn}
	<button
		class="btn preset-filled-warning-500 h-8 fixed bottom-5 left-1/2"
		onclick={() => (document.documentElement.scrollTop = 0)}>Volver</button
	>
{/if}

{#if param.toUpperCase() === 'VENCIDO'}
	<section>
		<p class="text-3xl bg-red-800 rounded-md text-center">Cuotas vencidas</p>
		<table class="table text-center">
			<thead>
				<tr>
					<th class="text-center">Descripcion</th>
					<th class="text-center">Tipo caso</th>
					<th class="text-center">Nombre cliente</th>
					<th class="text-center">Telefono cliente</th>
					<th class="text-center">Monto a saldar</th>
					<th class="text-center">Cuotas a pagar</th>
					<th class="text-center">Fecha a cobrar</th>
					<th class="text-center">Acciones</th>
				</tr>
			</thead>
			<tbody>
				{#if cases.length === 0}
					<tr><td colspan="8">No existen</td></tr>
				{:else}
					{#each cases as caso}
						<tr>
							<td>{caso.description}</td>
							<td>{caso.type}</td>
							<td>{caso.clientName}</td>
							<td>{caso.clientPhone}</td>
							<td>{caso.restAmount.toString().replace(/\./, ',')} JUS</td>
							<td>{caso.quantityPaymentsToPay}</td>
							<td>{caso.dueDate}</td>
							<td class="flex gap-2 justify-center">
								<button class="btn preset-filled-success-500 btn-sm" onclick={() => openToPay(caso)}
									>Cobrar</button
								>
								<button
									class="btn preset-filled-secondary-500 btn-sm"
									onclick={() => openDetails(caso)}>Detalles</button
								>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</section>
{:else if param.toUpperCase() === 'PROXIMO'}
	<section>
		<p class="text-3xl bg-yellow-600 rounded-md text-center">Cuotas por vencer</p>
		<table class="table text-center">
			<thead>
				<tr>
					<th class="text-center">Descripcion</th>
					<th class="text-center">Tipo caso</th>
					<th class="text-center">Nombre cliente</th>
					<th class="text-center">Telefono cliente</th>
					<th class="text-center">Monto a saldar</th>
					<th class="text-center">Cuotas a pagar</th>
					<th class="text-center">Fecha a cobrar</th>
					<th class="text-center">Acciones</th>
				</tr>
			</thead>
			<tbody>
				{#if cases.length === 0}
					<tr><td colspan="8">No existen</td></tr>
				{:else}
					{#each cases as caso}
						<tr>
							<td>{caso.description}</td>
							<td>{caso.type}</td>
							<td>{caso.clientName}</td>
							<td>{caso.clientPhone}</td>
							<td>{caso.restAmount.toString().replace(/\./, ',')} JUS</td>
							<td>{caso.quantityPaymentsToPay}</td>
							<td>{caso.dueDate}</td>
							<td class="flex gap-2 justify-center">
								<button class="btn preset-filled-success-500 btn-sm" onclick={() => openToPay(caso)}
									>Cobrar</button
								>
								<button
									class="btn preset-filled-secondary-500 btn-sm"
									onclick={() => openDetails(caso)}>Detalles</button
								>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</section>
{:else}
	<section>
		<p class="text-3xl bg-green-700 rounded-md text-center">Cuotas a tiempo</p>
		<table class="table text-center">
			<thead>
				<tr>
					<th class="text-center">Descripcion</th>
					<th class="text-center">Tipo caso</th>
					<th class="text-center">Nombre cliente</th>
					<th class="text-center">Telefono cliente</th>
					<th class="text-center">Monto a saldar</th>
					<th class="text-center">Cuotas a pagar</th>
					<th class="text-center">Fecha a cobrar</th>
					<th class="text-center">Acciones</th>
				</tr>
			</thead>
			<tbody>
				{#if cases.length === 0}
					<tr><td colspan="8">No existen</td></tr>
				{:else}
					{#each cases as caso}
						<tr>
							<td>{caso.description}</td>
							<td>{caso.type}</td>
							<td>{caso.clientName}</td>
							<td>{caso.clientPhone}</td>
							<td>{caso.restAmount.toString().replace(/\./, ',')} JUS</td>
							<td>{caso.quantityPaymentsToPay}</td>
							<td>{caso.dueDate}</td>
							<td class="flex gap-2 justify-center">
								<button class="btn preset-filled-success-500 btn-sm" onclick={() => openToPay(caso)}
									>Cobrar</button
								>
								<button
									class="btn preset-filled-secondary-500 btn-sm"
									onclick={() => openDetails(caso)}>Detalles</button
								>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</section>
{/if}
