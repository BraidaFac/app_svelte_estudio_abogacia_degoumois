import { redirect, type Actions, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getCases, deleteCase } from '$lib/case.model';

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

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	if (!user) {
		throw redirect(302, '/login');
	}

	let cases = await getCases();

	if (cases.length > 0) {
		cases.sort((a, b) => {
			return b.createdAt.getTime() - a.createdAt.getTime();
		});
		cases = cases.map((c) => {
			return {
				...c,
				created: formatear(c.createdAt.toISOString()),
				quantityPaymentsToPay: c.payments.filter((p) => !p.payment_date).length
			};
		});
	}
	return { user, cases };
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const user = locals.user;
		if (!user) {
			throw redirect(302, '/login');
		}
		const data = (await request.formData()).get('caseId')?.toString();
		if (!data) {
			throw error(400, 'Faltan datos');
		}
		const caseId = parseInt(data);
		const caso = await deleteCase(caseId);
		if (caso) {
			return { success: true };
		}
		throw error(500, 'Error servidor');
	}
};
