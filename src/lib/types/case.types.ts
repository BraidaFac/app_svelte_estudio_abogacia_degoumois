import type { Cases, Payment, PaymentType, PaymentStatus, typeCase, Currency } from '@prisma/client';

/**
 * Raw Prisma result — includes payments and currency relation.
 * Only used in model layer, never sent to client directly.
 */
export interface CaseWithPayments extends Cases {
	payments: Payment[];
	currency: Currency;
}

/**
 * Payment with amount as number — safe for SvelteKit serialization.
 */
export interface ClientPayment extends Omit<Payment, 'amount'> {
	amount: number | null;
}

/**
 * Currency info serialized for the client (Decimal → number).
 */
export interface ClientCurrency {
	id: number;
	name: string;
	value: number;
	isDefault: boolean;
}

/**
 * Formatted case for the UI — all Decimal fields as number.
 * restAmountPesos is pre-computed server-side (restAmount × currency.value).
 */
export interface FormattedCase
	extends Omit<CaseWithPayments, 'amount' | 'restAmount' | 'payments' | 'currency'> {
	amount: number;
	restAmount: number;
	restAmountPesos: number;
	closed: boolean;
	payments: ClientPayment[];
	currency: ClientCurrency;
	dueDate?: string;
	quantityPaymentsToPay: number;
	searchTerms?: string;
	created?: string;
}

/**
 * Data to create a new case — currencyId links to Currency table.
 */
export interface CreateCaseData {
	description: string;
	type: typeCase;
	clientName: string;
	clientPhone: string;
	userId: number;
	amount: number;
	restAmount: number;
	currencyId: number;
	payments: {
		create: CreatePaymentData[];
	};
}

export interface CreatePaymentData {
	payment_number: number;
	due_date: Date;
	typepayment?: PaymentType;
	collector?: string;
	amount?: number;
	current: boolean;
	payment_date?: Date;
}

export interface NewCaseFormData {
	description: string;
	amount: string;
	clientName: string;
	clientPhone: string;
	quantity_payment: string;
	due_date: string;
	type: string;
	period: string;
	currencyId: string;
	amount_payment?: string;
	typepayment?: string;
	collector?: string;
}

export interface RegisterPaymentData {
	amount: number;
	typepayment: PaymentType;
	paymentNumber: number;
	collector: string;
}

export interface FormattedPayment extends Omit<ClientPayment, 'due_date'> {
	due_date: string;
}
