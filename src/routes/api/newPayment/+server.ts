import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';
import { getJusValue } from '$lib/currency.model';
import { createPayment } from '$lib/case.model';
import type { PaymentType } from '@prisma/client';
export const POST: RequestHandler = async ({ locals, request }) => {
	const user = locals.user;
	if (!user) {
		throw redirect(302, '/login');
	}
	const jus_value = await getJusValue();
	if (!jus_value) {
		return new Response(JSON.stringify({ error: 'No se pudo obtener el valor del JUS' }), {
			status: 500
		});
	}
	const data = (await request.json()) as Record<string, string>;

	const { caseId, amount, typepayment, paymentNumber, collector } = data;
	if (!amount || !typepayment || !caseId || !paymentNumber) {
		return new Response(JSON.stringify({ error: 'Faltan datos' }), { status: 400 });
	}

	try {
		const response = await createPayment(+caseId, {
			amount: +(+amount.replace(',', '.')).toFixed(2),
			typepayment: typepayment as PaymentType,
			paymentNumber: +paymentNumber,
			collector
		});
		return new Response(JSON.stringify({ response }), { status: 200 });
	} catch (error) {
		console.log('error', error);
		return new Response(JSON.stringify({ error }), { status: 500 });
	}
};
