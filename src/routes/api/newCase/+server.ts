/**
 * API endpoint para crear nuevos casos
 */

import { saveCase } from '$lib/case.model';
import { getDefaultCurrency } from '$lib/currency.model';
import { createErrorResponse } from '$lib/utils/api';
import type { CreatePaymentData } from '$lib/types/case.types';
import type { typeCase, PaymentType } from '@prisma/client';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z, ZodError } from 'zod';

// ============================================
// CONSTANTS
// ============================================

const PERIOD_DAYS = {
	SEMANAL: 7,
	QUINCENAL: 15,
	MENSUAL: 0 // Se maneja por mes
} as const;

// ============================================
// VALIDATION SCHEMA
// ============================================

const NewCaseSchema = z.object({
	description: z.string().min(1),
	amount: z.string().min(1),
	clientName: z.string().min(1),
	clientPhone: z.string().min(1),
	quantity_payment: z.string().min(1),
	due_date: z.string().min(1),
	type: z.string().min(1),
	period: z.enum(['SEMANAL', 'QUINCENAL', 'MENSUAL']),
	currencyId: z.coerce.number().int().positive().optional(),
	amount_payment: z.string().optional(),
	typepayment: z.string().optional(),
	collector: z.string().optional()
});

// ============================================
// MAIN HANDLER
// ============================================

export const POST: RequestHandler = async ({ locals, request }) => {
	const user = locals.user;

	if (!user) {
		throw redirect(302, '/login');
	}

	const rawData = await request.json();

	let data: z.infer<typeof NewCaseSchema>;
	try {
		data = NewCaseSchema.parse(rawData);
	} catch (error) {
		if (error instanceof ZodError) {
			return createErrorResponse(error.errors[0]?.message ?? 'Datos inválidos', 400);
		}
		return createErrorResponse('Datos inválidos', 400);
	}

	// Resolve currency — use provided currencyId or fall back to default
	let resolvedCurrencyId: number;
	if (rawData.currencyId) {
		resolvedCurrencyId = Number(rawData.currencyId);
	} else {
		const defaultCurrency = await getDefaultCurrency();
		resolvedCurrencyId = defaultCurrency.id;
	}

	try {
		const caso = buildCaseData(data, user.id, resolvedCurrencyId);
		const response = await saveCase(caso);
		return new Response(JSON.stringify(response), { status: 201 });
	} catch (error) {
		console.error('Error creating case:', error);
		return createErrorResponse('Error al crear caso', 500);
	}
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function buildCaseData(data: z.infer<typeof NewCaseSchema>, userId: number, currencyId: number) {
	const {
		description,
		amount,
		clientName,
		clientPhone,
		quantity_payment,
		amount_payment,
		due_date,
		typepayment,
		collector,
		type,
		period
	} = data;

	// amount is already in native currency (JUS, USD, or EUR)
	const amountNative = parseFloat(amount.replace(',', '.'));
	const amountPaymentNative = amount_payment
		? parseFloat(amount_payment.replaceAll('.', ''))
		: undefined;

	const payments = buildPayments(
		parseInt(quantity_payment, 10),
		due_date,
		period,
		typepayment,
		collector,
		amountPaymentNative
	);

	// restAmount is in native currency — direct subtraction, no rate conversion
	const restAmount = amountPaymentNative
		? parseFloat((amountNative - amountPaymentNative).toFixed(3))
		: amountNative;

	return {
		description,
		type: type as typeCase,
		clientName,
		clientPhone,
		userId,
		currencyId,
		payments: { create: payments },
		amount: amountNative,
		restAmount
	};
}

function buildPayments(
	quantity: number,
	startDate: string,
	period: string,
	typepayment?: string,
	collector?: string,
	amountPayment?: number
): CreatePaymentData[] {
	return Array.from({ length: quantity }, (_, i) => {
		const dueDate = calculateDueDate(startDate, period, i);
		const isFirstPayment = i === 0;
		const hasInitialPayment = Boolean(amountPayment);
		return {
			payment_number: i + 1,
			due_date: dueDate,
			typepayment: typepayment && isFirstPayment ? (typepayment as PaymentType) : undefined,
			collector: collector && isFirstPayment ? collector : undefined,
			// amount already in native currency — no conversion needed
			amount:
				amountPayment && isFirstPayment ? parseFloat(amountPayment.toFixed(3)) : undefined,
			current: (isFirstPayment && !hasInitialPayment) || (i === 1 && hasInitialPayment),
			payment_date: isFirstPayment && hasInitialPayment ? dueDate : undefined
		};
	});
}

function calculateDueDate(startDate: string, period: string, index: number): Date {
	const date = new Date(startDate);

	if (period === 'MENSUAL') {
		date.setMonth(date.getMonth() + index);
	} else {
		const days = PERIOD_DAYS[period as keyof typeof PERIOD_DAYS] || 0;
		date.setDate(date.getDate() + days * index);
	}

	return date;
}
