import { deleteCase, getCases } from '$lib/case.model';
import type { ClientPayment, FormattedCase } from '$lib/types/case.types';
import { formatDateToDMY } from '$lib/utils/formatters';
import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;

	if (!user) {
		throw redirect(302, '/login');
	}

	const rawCases = await getCases();

	if (rawCases.length === 0) {
		return { user, cases: [] };
	}

	const cases: FormattedCase[] = rawCases
		.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
		.map((c) => {
			const payments: ClientPayment[] = c.payments.map((p) => ({
				...p,
				amount: p.amount ? p.amount.toNumber() : null
			}));
			return {
				...c,
				amount: c.amount.toNumber(),
				restAmount: c.restAmount.toNumber(),
				payments,
				created: formatDateToDMY(c.createdAt),
				quantityPaymentsToPay: c.payments.filter((p) => !p.payment_date).length
			};
		});

	return { user, cases };
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const user = locals.user;

		if (!user) {
			throw redirect(302, '/login');
		}

		const formData = await request.formData();
		const caseIdStr = formData.get('caseId')?.toString();

		if (!caseIdStr) {
			throw error(400, 'Faltan datos');
		}

		const caseId = parseInt(caseIdStr);

		try {
			const caso = await deleteCase(caseId);
			if (caso) {
				return { success: true };
			}
			throw error(500, 'Error al eliminar caso');
		} catch (err) {
			console.error('Error deleting case:', err);
			throw error(500, 'Error servidor');
		}
	}
};
