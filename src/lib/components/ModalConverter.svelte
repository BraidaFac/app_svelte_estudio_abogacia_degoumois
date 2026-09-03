<script lang="ts">
	import { page } from '$app/state';
	import { toRatesMap, formatAmount, toARS } from '$lib/utils/currency';
	import { X } from '@lucide/svelte';
	import type { CurrencyRecord } from '$lib/currency.model';

	let { dialog = $bindable<HTMLDialogElement | undefined>() }: { dialog?: HTMLDialogElement } =
		$props();

	const currencies: CurrencyRecord[] = $derived(page.data.currencies ?? []);
	const rates = $derived(toRatesMap(currencies));

	// Build cross-conversion table: for each unit of each currency, show equivalents
	const rows = $derived(
		currencies.map((c) => {
			const amountARS = toARS(1, c.value);
			return {
				name: c.name,
				equivalents: currencies
					.filter((other) => other.name !== c.name)
					.map((other) => ({
						name: other.name,
						value: amountARS / other.value,
						formatted: formatAmount(amountARS / other.value, other.name)
					}))
					.concat([{ name: 'ARS', value: amountARS, formatted: formatAmount(amountARS, 'ARS') }])
			};
		})
	);

	function handleClose() {
		dialog?.close();
	}
</script>

<dialog bind:this={dialog} onclick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
	<div class="modal-panel modal-panel-sm">
		<div class="modal-header">
			<h2 class="modal-title">Conversiones</h2>
			<button class="modal-icon-btn" onclick={handleClose} aria-label="Cerrar">
				<X size={18} />
			</button>
		</div>

		<div class="form-section">
			{#each rows as row (row.name)}
				<div style="margin-bottom: 1rem;">
					<p style="font-weight: 600; margin-bottom: 0.25rem;">1 {row.name} =</p>
					<ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.2rem;">
						{#each row.equivalents as eq}
							<li style="display: flex; justify-content: space-between; font-size: 0.9rem; opacity: 0.85;">
								<span>{eq.name}</span>
								<span>{eq.formatted}</span>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>

		<div style="display: flex; justify-content: flex-end; margin-top: 0.5rem;">
			<button class="btn btn-ghost" onclick={handleClose}>Cerrar</button>
		</div>
	</div>
</dialog>
