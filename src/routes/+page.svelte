<script lang="ts">
	import CasesContainer from '$lib/components/CasesContainer.svelte';
	export let data;
	let cases: any[];

	$: {
		cases = data.cases;
	}
</script>

<div class="sections mb-10 grid grid-cols-3 gap-4 pt-10">
	<a href="/vencido" class="card card-hover p-4"
		><section class="p-4">
			<p class="text-center text-3xl text-red-600">Cuotas vencidas</p>
		</section></a
	>
	<a href="/proximo" class="card card-hover p-4"
		><section class="p-4">
			<p class="text-center text-3xl text-yellow-500">Proximos vencimientos</p>
		</section></a
	>
	<a href="/atiempo" class="card card-hover p-4"
		><section class="p-4">
			<p class="text-center text-3xl text-green-600">Cuotas al dia</p>
		</section></a
	>
</div>
{#key cases}
	<CasesContainer {cases} />
{/key}
