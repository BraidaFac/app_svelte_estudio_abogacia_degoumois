/**
 * API endpoint para registrar pagos
 */

import { createPayment } from '$lib/case.model';
import { apiSuccess, apiError, ApiErrors } from '$lib/utils/api';
import type { PaymentType } from '@prisma/client';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z, ZodError } from 'zod';

// ============================================
// VALIDATION SCHEMA
// ============================================

const PaymentSchema = z.object({
	caseId: z.string().min(1),
	amount: z.string().min(1),
	typepayment: z.string().min(1),
	paymentNumber: z.string().min(1),
	collector: z.string().min(1)
});

export const POST: RequestHandler = async ({ locals, request }) => {
	const user = locals.user;

	if (!user) {
		throw redirect(302, '/login');
	}

	const rawData = await request.json();

	let data: z.infer<typeof PaymentSchema>;
	try {
		data = PaymentSchema.parse(rawData);
	} catch (error) {
		if (error instanceof ZodError) {
			return apiError(ApiErrors.VALIDATION, error.errors[0]?.message ?? 'Datos inválidos', 400);
		}
		return apiError(ApiErrors.VALIDATION, 'Datos inválidos', 400);
	}

	const { caseId, amount, typepayment, paymentNumber, collector } = data;

	try {
		// amount arrives in native currency from ModalToPay — parse directly
		const amountNative = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
		const response = await createPayment(parseInt(caseId, 10), {
			amount: parseFloat(amountNative.toFixed(3)),
			typepayment: typepayment as PaymentType,
			paymentNumber: parseInt(paymentNumber, 10),
			collector
		});
		return apiSuccess(response, 'Pago registrado correctamente');
	} catch (error) {
		console.error('Error creating payment:', error);
		return apiError(ApiErrors.SERVER_ERROR, 'Error al registrar pago', 500);
	}
};
