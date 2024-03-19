<script lang="ts">
	import CasesContainer from '$lib/components/CasesContainer.svelte';
	import type { $Enums } from '@prisma/client';
import { getModalStore, type ModalSettings} from '@skeletonlabs/skeleton';
    const modalStore = getModalStore();
    const modal: ModalSettings = {
	type: 'component',
	component: 'modal',
};
	const modalToPay: ModalSettings = {
	type: 'component',
	component: 'modalToPay',
	meta: {}
	}
export let data;
let cases: ({ payments: { payment_number: number; due_date: Date; payment_date: Date | null; caseId: number; typepayment: $Enums.PaymentType | null; amount: number | null; current: boolean; collector: string | null; }[]; } & { id: number; description: string; createdAt: Date; updatedAt: Date | null; userId: number; clientName: string; clientPhone: string; amount: number; restAmount: number; type: $Enums.typeCase; })[];

$:{
	cases= data.cases
}


</script>
<div class="sections grid grid-cols-3 gap-4 pt-10 mb-10">
<a  href="/vencido" class="card p-4 card-hover "><section class="p-4"><p class="text-3xl  text-red-600 text-center">Cuotas vencidas</p></section></a>
<a href="/proximo" class="card p-4 card-hover"><section class="p-4"><p class="text-3xl text-yellow-500 text-center">Proximos vencimientos</p></section></a>
<a href="/atiempo" class="card p-4 card-hover"><section class="p-4"><p class="text-3xl text-green-600 text-center"> Cuotas al dia</p></section></a>
<form method="POST">
	<button type="submit">try</button>
</form>
</div>
{#key cases}
<CasesContainer  cases={cases}/>
{/key}
