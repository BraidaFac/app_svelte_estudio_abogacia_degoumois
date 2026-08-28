import { getOnTimeCases, getOverDueCases, getSoonDueCases } from '$lib/case.model';
import type { ClientPayment, FormattedCase } from '$lib/types/case.types';
import { formatDateToDMY } from '$lib/utils/formatters';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

type CaseStatus = 'VENCIDO' | 'PROXIMO' | 'ATIEMPO';

const caseStatusHandlers: Record<
	CaseStatus,
	() => Promise<import('$lib/types/case.types').CaseWithPayments[]>
> = {
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

	const cases = rawCases
		.map((c) => {
			const currentPayment = c.payments.find((p) => p.current);
			const payments: ClientPayment[] = c.payments.map((p) => ({
				...p,
				amount: p.amount ? p.amount.toNumber() : null
			}));
			return {
				...c,
				amount: c.amount.toNumber(),
				restAmount: c.restAmount.toNumber(),
				payments,
				quantityPaymentsToPay: c.payments.filter((p) => !p.payment_date).length,
				dueDate: currentPayment?.due_date, // keep as Date for sorting
				_sortMs: currentPayment?.due_date?.getTime() ?? Infinity
			};
		})
		.sort((a, b) => a._sortMs - b._sortMs)
		.map((c): FormattedCase => {
			const { _sortMs, ...rest } = c;
			return {
				...rest,
				dueDate: rest.dueDate ? formatDateToDMY(rest.dueDate as Date) : undefined
			};
		});

	return { user, cases };
};
