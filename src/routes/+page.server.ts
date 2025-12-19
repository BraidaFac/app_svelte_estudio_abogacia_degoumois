import { getCasesWithDebt } from '$lib/case.model';
import type { FormattedCase } from '$lib/types/case.types';
import { formatDateToDashDMY } from '$lib/utils/formatters';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('update:cases');
	const user = locals.user;

	if (!user) {
		throw redirect(302, '/login');
	}

	const rawCases = await getCasesWithDebt();

	if (rawCases.length === 0) {
		return { user, cases: [] };
	}

	const cases: FormattedCase[] = rawCases
		.map((c) => {
			const currentPayment = c.payments.find((p) => p.current);
			const dueDate = currentPayment
				? formatDateToDashDMY(currentPayment.due_date.toISOString())
				: undefined;

			return {
				...c,
				quantityPaymentsToPay: c.payments.filter((p) => !p.payment_date).length,
				dueDate,
				searchTerms: `${c.description} ${c.type} ${c.clientName}`
			};
		})
		.sort((a, b) => {
			if (!a.dueDate || !b.dueDate) return 0;
			return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
		});

	return { user, cases };
};
