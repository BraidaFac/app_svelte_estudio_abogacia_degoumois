/**
 * API endpoint para crear nuevos casos
 */

import { saveCase } from '$lib/case.model';
import { getDefaultCurrency } from '$lib/currency.model';
import { apiSuccess, apiError, ApiErrors } from '$lib/utils/api';
import type { CreatePaymentData } from '$lib/types/case.types';
import type { typeCase, PaymentType, PaymentPeriod } from '@prisma/client';
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
	clientEmail: z.string().email().optional().or(z.literal('')),
	caseNumber: z.string().max(50).optional(),
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
			return apiError(ApiErrors.VALIDATION, error.errors[0]?.message ?? 'Datos inválidos', 400);
		}
		return apiError(ApiErrors.VALIDATION, 'Datos inválidos', 400);
	}

	// Resolve currency — use provided currencyId or fall back to default
	let resolvedCurrencyId: number;
	if (rawData.currencyId) {
		resolvedCurrencyId = Number(rawData.currencyId);
	} else {
		const defaultCurrency = await getDefaultCurrency();
		resolvedCurrencyId = defaultCurrency.id;
	}

	// 1 cuota + pago parcial no tiene sentido (no hay siguiente cuota para el saldo)
	if (parseInt(data.quantity_payment) === 1 && data.amount_payment) {
		const total = parseFloat(data.amount.replace(/\./g, '').replace(',', '.'));
		const partial = parseFloat(data.amount_payment.replace(/\./g, '').replace(',', '.'));
		if (partial < total) {
			return apiError(ApiErrors.VALIDATION, 'Con 1 cuota el monto a entregar debe ser el total', 400);
		}
	}

	try {
		const caso = buildCaseData(data, user.id, resolvedCurrencyId);
		const response = await saveCase(caso);
		return apiSuccess(response, 'Caso creado correctamente', 201);
	} catch (error) {
		console.error('Error creating case:', error);
		return apiError(ApiErrors.SERVER_ERROR, 'Error al crear caso', 500);
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
		clientEmail,
		caseNumber,
		quantity_payment,
		amount_payment,
		due_date,
		typepayment,
		collector,
		type,
		period
	} = data;

	// amount is already in native currency (JUS, USD, or EUR)
	const amountNative = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
	const amountPaymentNative = amount_payment
		? parseFloat(amount_payment.replace(/\./g, '').replace(',', '.'))
		: undefined;

	const payments = buildPayments(
		parseInt(quantity_payment, 10),
		due_date,
		period,
		typepayment,
		collector,
		amountPaymentNative,
		amountNative
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
		clientEmail: clientEmail || undefined,
		caseNumber: caseNumber || undefined,
		userId,
		currencyId,
		period: period as PaymentPeriod,
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
	amountPayment?: number,
	totalAmount: number = 0
): CreatePaymentData[] {
	const hasInitialPayment = Boolean(amountPayment);
	// Distribute pending amount evenly across non-paid payments
	const pendingCount = hasInitialPayment ? Math.max(quantity - 1, 0) : quantity;
	const pendingTotal = hasInitialPayment ? totalAmount - (amountPayment ?? 0) : totalAmount;
	const perPending = pendingCount > 0 ? parseFloat((pendingTotal / pendingCount).toFixed(4)) : 0;

	return Array.from({ length: quantity }, (_, i) => {
		const dueDate = calculateDueDate(startDate, period, i);
		const isFirstPayment = i === 0;

		let amount: number | undefined;
		if (isFirstPayment && hasInitialPayment) {
			amount = parseFloat((amountPayment!).toFixed(4));
		} else if (pendingCount > 0) {
			const pendingIdx = hasInitialPayment ? i - 1 : i;
			// Last pending payment absorbs rounding difference
			amount =
				pendingIdx === pendingCount - 1
					? parseFloat((pendingTotal - perPending * (pendingCount - 1)).toFixed(4))
					: perPending;
		}

		return {
			payment_number: i + 1,
			due_date: dueDate,
			typepayment: typepayment && isFirstPayment ? (typepayment as PaymentType) : undefined,
			collector: collector && isFirstPayment ? collector : undefined,
			amount,
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
