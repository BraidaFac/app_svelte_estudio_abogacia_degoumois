/**
 * Tipos centralizados para Cases
 */

import type { Cases, Payment, PaymentType, PaymentStatus, typeCase } from '@prisma/client';

/**
 * Caso con sus pagos incluidos (resultado directo de Prisma — contiene Prisma.Decimal)
 * Solo usar en model layer, NO enviar al cliente directamente.
 */
export interface CaseWithPayments extends Cases {
	payments: Payment[];
}

/**
 * Pago con amount convertido a number — seguro para enviar al cliente via SvelteKit
 */
export interface ClientPayment extends Omit<Payment, 'amount'> {
	amount: number | null;
}

/**
 * Caso formateado para la UI — todos los campos monetarios como number.
 * Este tipo es el que viaja de +page.server.ts al componente.
 */
export interface FormattedCase extends Omit<
	CaseWithPayments,
	'amount' | 'restAmount' | 'payments'
> {
	amount: number;
	restAmount: number;
	payments: ClientPayment[];
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
 * Pago formateado para la UI (due_date como string)
 */
export interface FormattedPayment extends Omit<ClientPayment, 'due_date'> {
	due_date: string;
}
