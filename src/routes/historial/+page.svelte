<script lang="ts">
	import { getModalStore, type ModalSettings } from '@skeletonlabs/skeleton';
	import { page } from '$app/stores';
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	const modalStore = getModalStore();
	let previousModalValue: ModalSettings | undefined = $modalStore[0];
	let activeBtn = false;
	const modalToPay: ModalSettings = {
		type: 'component',
		component: 'modalToPay',
		meta: {}
	};
	const modalDetalle: ModalSettings = {
		type: 'component',
		component: 'modalDetalle',
		meta: {}
	};

	const modalAlert: ModalSettings = {
		type: 'alert'
	};
	const modalConfirm: ModalSettings = {
		type: 'confirm',
		title: 'Confirmar acción',
		body: 'Estas seguro de eliminar el caso?',
		meta: {},
		// TRUE if confirm pressed, FALSE if cancel pressed
		response: async (r: boolean) => {
			if (r) {
				const data = new FormData();
				data.append('caseId', modalConfirm.meta.caso.id);
				const response = await fetch('/historial', {
					method: 'POST',
					body: data
				});
				if (response.status !== 200) {
					const error = (await response.json()).error.message;
					modalAlert.title = 'Error';
					modalAlert.body = error;
					modalStore.trigger(modalAlert);
				} else {
					modalAlert.title = 'Exito al eliminar';
					modalAlert.body = 'Se ha eliminado el caso correctamente';
					modalStore.trigger(modalAlert);
					invalidateAll();
				}
			}
		}
	};
	export let data;
	let cases: any;
	$: {
		if (data?.cases) {
			cases = data.cases;
		}
	}
	$: {
		if (!$modalStore[0] && previousModalValue) {
			invalidateAll();
			previousModalValue = $modalStore[0];
		}
	}
	$: {
		if ($modalStore[0]) {
			previousModalValue = $modalStore[0];
		}
	}
	onMount(() => {
		document.addEventListener('scroll', () => {
			const navBar = document.querySelector('.nav-bar');
			if (navBar && window.scrollY > navBar.clientHeight + 100) {
				activeBtn = true;
			} else {
				activeBtn = false;
			}
		});
	});
</script>

{#if activeBtn}
	<button
		class="variant-filled-warning btn fixed bottom-5 left-1/2 h-8"
		on:click={() => {
			document.documentElement.scrollTop = 0;
		}}>Volver</button
	>
{/if}
<section class="p-3">
	<p class="my-4 rounded-md text-center text-3xl">Historial</p>
	<table class="table table-interactive text-center">
		<thead>
			<tr>
				<th class="text-center">Descripcion</th>
				<th class="text-center">Tipo caso</th>
				<th class="text-center">Nombre cliente</th>
				<th class="text-center">Telefono cliente</th>
				<th class="text-center">Monto a saldado</th>
				<th class="text-center">Creado</th>
				<th class="text-center">Detalles</th>
				<th class="text-center">Eliminar</th>
			</tr>
		</thead>
		<tbody
			>{#if cases.length === 0}
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
								class="variant-filled-warning btn h-8"
								on:click={() => {
									modalDetalle.meta = { caso };
									modalStore.trigger(modalDetalle);
								}}>Ver</button
							>
						</td>
						<td>
							<button
								class="variant-filled-primary btn h-8"
								on:click={() => {
									modalConfirm.meta = { caso };
									modalStore.trigger(modalConfirm);
								}}>Eliminar</button
							>
						</td>
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>
</section>
