import { getOnTimeCases, getOverDueCases, getSoonDueCases } from '$lib/case.model';
import type { CaseWithPayments, FormattedCase } from '$lib/types/case.types';
import { formatDateToDMY } from '$lib/utils/formatters';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

type CaseStatus = 'VENCIDO' | 'PROXIMO' | 'ATIEMPO';

const caseStatusHandlers: Record<CaseStatus, () => Promise<CaseWithPayments[]>> = {
	VENCIDO: getOverDueCases,
	PROXIMO: getSoonDueCases,
	ATIEMPO: getOnTimeCases
};

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = locals.user;

	if (!user) {
		throw redirect(302, '/login');
	}

	const estado = params.estado.toUpperCase() as CaseStatus;
	const handler = caseStatusHandlers[estado];

	if (!handler) {
		throw redirect(302, '/');
	}

	const rawCases = await handler();

	if (rawCases.length === 0) {
		return { user, cases: [] };
	}

	const cases: FormattedCase[] = rawCases
		.map((c) => ({
			...c,
			quantityPaymentsToPay: c.payments.filter((p) => !p.payment_date).length,
			dueDate: c.payments.find((p) => p.current)?.due_date
		}))
		.sort((a, b) => {
			const dateA = a.payments.find((p) => p.current)?.due_date;
			const dateB = b.payments.find((p) => p.current)?.due_date;
			if (!dateA || !dateB) return 0;
			return dateA.getTime() - dateB.getTime();
		})
		.map((c) => ({
			...c,
			dueDate: c.dueDate ? formatDateToDMY(c.dueDate) : undefined
		}));

	return { user, cases };
};
