import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getCasesWithDebt } from '$lib/case.model';

type Cases = {
	id: number;
	description: string;
	created_at: Date;
	updated_at: Date;
	userId: number;
	clientName: string;
	clientPhone: string;
	type: string;
	amount: number;
	restAmount: number;
	dueDate?: string;
	quantityPaymentsToPay?: number;
	payments: {
		payment_number: number;
		caseId: number;
		amount?: number;
		payment_date?: string;
		due_date: Date;
		current: boolean;
		type: string;
		collector?: string;
	}[];
};
function formatear(fechaISO: string) {
	const regex = /^(\d{4})-(\d{2})-(\d{2})T/;

	const coincidencias = fechaISO.match(regex);

	if (coincidencias) {
		const año = coincidencias[1];
		const mes = coincidencias[2];
		const dia = coincidencias[3];

		return `${dia}-${mes}-${año}`;
	}
}
export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('update:cases');
	const user = locals.user;
	if (!user) {
		throw redirect(302, '/login');
	}
	let cases: Cases[] = await getCasesWithDebt();

	if (cases.length > 0) {
		cases = cases.map((c) => {
			const dueDate = formatear(c.payments.find((p) => p.current)?.due_date.toISOString() ?? '');
			return {
				...c,
				quantityPaymentsToPay: c.payments.filter((p) => !p.payment_date).length,
				dueDate: dueDate
			};
		});

		cases.sort((a, b) => {
			if (a.dueDate === undefined || b.dueDate === undefined) return 0;
			return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
		});
	}
	return { user, cases };
};
