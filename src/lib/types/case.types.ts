/**
 * Tipos centralizados para Cases
 */

import type { Cases, Payment, PaymentType, typeCase } from '@prisma/client';

/**
 * Caso con sus pagos incluidos
 */
export interface CaseWithPayments extends Cases {
	payments: Payment[];
}

/**
 * Caso formateado para mostrar en la UI
 */
export interface FormattedCase extends CaseWithPayments {
	dueDate?: string;
	quantityPaymentsToPay: number;
	searchTerms?: string;
	created?: string;
}

/**
 * Datos para crear un nuevo caso
 */
export interface CreateCaseData {
	description: string;
	type: typeCase;
	clientName: string;
	clientPhone: string;
	userId: number;
	amount: number;
	restAmount: number;
	payments: {
		create: CreatePaymentData[];
	};
}

/**
 * Datos para crear un nuevo pago
 */
export interface CreatePaymentData {
	payment_number: number;
	due_date: Date;
	typepayment?: PaymentType;
	collector?: string;
	amount?: number;
	current: boolean;
	payment_date?: Date;
}

/**
 * Datos del formulario de nuevo caso
 */
export interface NewCaseFormData {
	description: string;
	amount: string;
	clientName: string;
	clientPhone: string;
	quantity_payment: string;
	due_date: string;
	type: string;
	period: string;
	amount_payment?: string;
	typepayment?: string;
	collector?: string;
}

/**
 * Datos para registrar un pago
 */
export interface RegisterPaymentData {
	amount: number;
	typepayment: PaymentType;
	paymentNumber: number;
	collector: string;
}

/**
 * Pago formateado para la UI
 */
export interface FormattedPayment extends Omit<Payment, 'due_date'> {
	due_date: string;
}
