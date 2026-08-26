/**
 * API endpoint para registrar pagos
 */

import { createPayment } from '$lib/case.model';
import { getJusValue } from '$lib/jus.model';
import { createErrorResponse } from '$lib/utils/api';
import type { PaymentType } from '@prisma/client';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface PaymentRequestData {
	caseId: string;
	amount: string;
	typepayment: string;
	paymentNumber: string;
	collector: string;
}

export const POST: RequestHandler = async ({ locals, request }) => {
	const user = locals.user;

	if (!user) {
		throw redirect(302, '/login');
	}

	const jusValue = await getJusValue();
	if (!jusValue) {
		return createErrorResponse('No se pudo obtener el valor del JUS', 500);
	}

	const data = (await request.json()) as PaymentRequestData;
	const { caseId, amount, typepayment, paymentNumber, collector } = data;

	if (!isValidPaymentData(data)) {
		return createErrorResponse('Faltan datos', 400);
	}

	try {
		const amountJus = parseFloat(amount.replace(',', '.'));
		const response = await createPayment(parseInt(caseId, 10), {
			amount: parseFloat(amountJus.toFixed(3)),
			typepayment: typepayment as PaymentType,
			paymentNumber: parseInt(paymentNumber, 10),
			collector
		});

		return new Response(JSON.stringify({ response }), { status: 200 });
	} catch (error) {
		console.error('Error creating payment:', error);
		return createErrorResponse('Error al registrar pago', 500);
	}
};

function isValidPaymentData(data: PaymentRequestData): boolean {
	const { amount, typepayment, caseId, paymentNumber } = data;
	return Boolean(amount && typepayment && caseId && paymentNumber);
}
