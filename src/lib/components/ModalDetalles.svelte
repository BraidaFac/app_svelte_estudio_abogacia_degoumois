<script lang="ts">
	import { getModalStore, type ModalSettings } from '@skeletonlabs/skeleton';
	const modalStore = getModalStore();
	const caso = $modalStore[0].meta.caso;
	const modalToPay: ModalSettings = {
		type: 'component',
		component: 'modalToPay',
		meta: { caso }
	};

	function formatear(fechaISO: Date) {
		const regex = /^(\d{4})-(\d{2})-(\d{2})T/;
		const coincidencias = fechaISO.toISOString().match(regex);

		if (coincidencias) {
			const año = coincidencias[1];
			const mes = coincidencias[2];
			const dia = coincidencias[3];

			return `${dia}/${mes}/${año}`;
		}
	}
	const payments =
		caso.restAmount > 0
			? caso.payments.map((p) => {
					return {
						...p,
						due_date: formatear(p.due_date)
					};
				})
			: caso.payments
					.filter((p) => p.payment_date)
					.map((p) => ({
						...p,
						due_date: formatear(p.due_date)
					}));

	// Base Classes
	const cBase = 'card p-6 w-1/2 shadow-xl space-y-4';
	const cHeader = 'text-2xl font-bold text-center';
	const cDiv = 'border border-surface-500 p-4 space-y-4 rounded-container-token ';
</script>

<div class="modal-example-form overflow-y-auto {cBase}">
	<header class={cHeader}>Detalles: {caso.description}</header>
	<div class={cDiv}>
		<ul class="list">
			{#each payments as p}
				<li class="grid grid-cols-4 justify-between gap-16 text-center">
					<span class="col-span-1 w-1/3">Cuota numero {p.payment_number}</span>
					<span class="col-span-1 w-1/3">Fecha {p.due_date}</span>
					{#if p.collector}
						<span class="col-span-1 w-1/2">Cobrador {p.collector}</span>
					{:else}
						<span class="col-span-1 w-1/2"></span>
					{/if}
					{#if p.current}
						<span class="col-span-1 w-1/4">
							<button
								class="variant-filled-success btn h-6"
								on:click={() => {
									modalStore.close();
									modalStore.trigger(modalToPay);
								}}
								>Cobrar
							</button>
						</span>
					{:else if p.payment_date}
						<span class="col-span-1 w-1/4">{p.amount.toString().replace(/\./, ',')} JUS</span>
					{:else}
						<span class="col-span-1 w-1/4"></span>
					{/if}
				</li>
			{/each}
		</ul>
	</div>
	<div class="flex flex-row">
		<button
			class="variant-filled-primary btn"
			on:click={() => {
				modalStore.close();
			}}>Salir</button
		>
	</div>
</div>
