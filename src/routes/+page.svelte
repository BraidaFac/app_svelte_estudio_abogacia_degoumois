<script lang="ts">
	import CasesContainer from '$lib/components/CasesContainer.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="sections mb-10 grid grid-cols-3 gap-4 pt-10">
	<a href="/vencido" class="card card-hover p-4">
		<section class="p-4 text-center">
			<p class="text-3xl text-red-600">Cuotas vencidas</p>
			<p class="mt-2 text-5xl font-bold text-red-600">{data.counts.overdue}</p>
		</section>
	</a>
	<a href="/proximo" class="card card-hover p-4">
		<section class="p-4 text-center">
			<p class="text-3xl text-yellow-500">Próximos vencimientos</p>
			<p class="mt-2 text-5xl font-bold text-yellow-500">{data.counts.soon}</p>
		</section>
	</a>
	<a href="/atiempo" class="card card-hover p-4">
		<section class="p-4 text-center">
			<p class="text-3xl text-green-600">Cuotas al día</p>
			<p class="mt-2 text-5xl font-bold text-green-600">{data.counts.onTime}</p>
		</section>
	</a>
</div>
<CasesContainer cases={data.cases} />
