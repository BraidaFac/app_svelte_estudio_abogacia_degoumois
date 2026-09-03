<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { addThousandSeparator } from '$lib/utils/formatters';
	import { X, Pencil, Check } from '@lucide/svelte';
	import type { CurrencyRecord } from '$lib/currency.model';

	let { dialog = $bindable<HTMLDialogElement | undefined>() }: { dialog?: HTMLDialogElement } =
		$props();

	let loading = $state(false);
	let response_state = $state<number | undefined>();
	let editingName = $state<string | null>(null);
	let editValue = $state('');

	const currencies: CurrencyRecord[] = $derived(page.data.currencies ?? []);

	function addThousandSep(value: string): string {
		const numeric = value.replace(/\./g, '');
		if (isNaN(+numeric)) return value;
		return addThousandSeparator(+numeric);
	}

	function startEdit(currency: CurrencyRecord) {
		editingName = currency.name;
		editValue = addThousandSeparator(currency.value);
	}

	async function saveValue() {
		if (!editingName) return;
		loading = true;
		try {
			const response = await fetch('/api/currencies', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: editingName, value: editValue })
			});
			response_state = response.status;
			if (response.status === 200) {
				editingName = null;
				editValue = '';
				await invalidateAll();
			}
		} catch {
			response_state = 500;
		} finally {
			loading = false;
		}
	}

	function onValueInput(event: Event) {
		const input = event.target as HTMLInputElement;
		const raw = input.value.replace(/\./g, '');
		if (isNaN(+raw)) { input.value = input.value.slice(0, -1); return; }
		editValue = addThousandSep(raw);
		input.value = editValue;
	}

	function handleClose() {
		dialog?.close();
		response_state = undefined;
		editingName = null;
		editValue = '';
		loading = false;
	}
</script>

<dialog bind:this={dialog} onclick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
	<div class="modal-panel modal-panel-sm">
		<div class="modal-header">
			<h2 class="modal-title">Monedas</h2>
			<button class="modal-icon-btn" onclick={handleClose} aria-label="Cerrar">
				<X size={18} />
			</button>
		</div>

		{#if loading}
			<div class="spinner-wrap"><div class="er-spinner"></div></div>
		{:else}
			<div class="form-section">
				{#each currencies as currency (currency.name)}
					<div class="label" style="margin-bottom: 0.75rem;">
						<span>
							{currency.name}
							{#if currency.isDefault}<span style="font-size: 0.75rem; opacity: 0.6;">(defecto)</span>{/if}
						</span>
						{#if editingName === currency.name}
							<div style="display: flex; gap: 0.5rem; align-items: center;">
								<input
									class="input"
									type="text"
									value={editValue}
									oninput={onValueInput}
									placeholder="Valor en pesos"
								/>
								<button class="modal-icon-btn save-btn" onclick={saveValue} aria-label="Guardar">
									<Check size={16} />
								</button>
								<button class="modal-icon-btn" onclick={() => (editingName = null)} aria-label="Cancelar">
									<X size={16} />
								</button>
							</div>
						{:else}
							<div style="display: flex; justify-content: space-between; align-items: center;">
								<span class="input" style="background: transparent; cursor: default;">
									$ {addThousandSeparator(currency.value)}
								</span>
								<button class="modal-icon-btn" onclick={() => startEdit(currency)} aria-label="Editar {currency.name}">
									<Pencil size={15} />
								</button>
							</div>
						{/if}
					</div>
				{/each}

				{#if response_state && response_state !== 200}
					<p class="text-error" style="margin-top: 0.5rem;">Error al guardar. Intente nuevamente.</p>
				{/if}
			</div>

			<div style="display: flex; justify-content: flex-end; margin-top: 1rem;">
				<button class="btn btn-ghost" onclick={handleClose}>Cerrar</button>
			</div>
		{/if}
	</div>
</dialog>

<style>
	.save-btn:hover {
		color: #3fb98a;
		background: rgba(63, 185, 138, 0.1);
		border-color: rgba(63, 185, 138, 0.25);
	}
</style>
