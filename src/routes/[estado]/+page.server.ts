import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getOnTimeCases, getSoonDueCases, getOverDueCases } from '$lib/case.model';

function formatear(fechaISO) {
	const regex = /^(\d{4})-(\d{2})-(\d{2})T/;

	const coincidencias = fechaISO.match(regex);

	if (coincidencias) {
		const año = coincidencias[1];
		const mes = coincidencias[2];
		const dia = coincidencias[3];

		return `${dia}/${mes}/${año}`;
	}
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = locals.user;
	if (!user) {
		throw redirect(302, '/login');
	}
	const { estado } = params;
	let cases;
	switch (estado.toUpperCase()) {
		case 'VENCIDO':
			cases = await getOverDueCases();
			break;

		case 'PROXIMO':
			cases = await getSoonDueCases();
			break;

		case 'ATIEMPO':
			cases = await getOnTimeCases();
			break;
		default:
			throw redirect(302, '/');
	}

	if (cases.length > 0) {
		cases = cases.map((c) => {
			return {
				...c,
				quantityPaymentsToPay: c.payments.filter((p) => !p.payment_date).length,
				dueDate: c.payments.find((p) => p.current)?.due_date
			};
		});
		cases.sort((a, b) => {
			const dateA = a.payments.find((p) => p.current)?.due_date;
			const dateB = b.payments.find((p) => p.current)?.due_date;
			return dateA.getTime() - dateB.getTime();
		});
		cases = cases.map((c) => {
			return {
				...c,
				dueDate: formatear(c.dueDate.toISOString())
			};
		});
	}
	return { user, cases };
};
