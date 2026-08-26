/**
 * Modelo para operaciones CRUD de casos legales
 * Implementa principios SOLID y tipado estricto
 */

import type { PaymentType } from '@prisma/client';
import { differenceInDays } from 'date-fns';
import { db } from './db';
import type { CaseWithPayments, CreateCaseData, RegisterPaymentData } from './types/case.types';

// ============================================
// CREATE OPERATIONS
// ============================================

/**
 * Guarda un nuevo caso en la base de datos
 * @param data - Datos del caso a crear
 * @returns El caso creado
 */
export async function saveCase(data: CreateCaseData) {
	return db.cases.create({ data });
}

/**
 * Registra un pago para un caso existente
 * @param caseId - ID del caso
 * @param paymentData - Datos del pago
 * @returns El caso actualizado
 */
export async function createPayment(caseId: number, paymentData: RegisterPaymentData) {
	const { amount, typepayment, paymentNumber, collector } = paymentData;
	const today = new Date();

	const caso = await db.cases.findUnique({
		where: { id: caseId },
		include: { payments: true }
	});

	if (!caso) {
		throw new Error('Caso no encontrado');
	}

	const restAmount = Number((caso.restAmount - amount).toFixed(3));
	const totalPayments = caso.payments.length;
	const hasNextPayment = paymentNumber < totalPayments;

	if (hasNextPayment) {
		return updatePaymentWithNext(
			caseId,
			paymentNumber,
			amount,
			typepayment,
			collector,
			restAmount,
			today
		);
	}

	return updateFinalPayment(
		caseId,
		paymentNumber,
		amount,
		typepayment,
		collector,
		restAmount,
		today
	);
}

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Obtiene todos los casos con deuda pendiente
 * @returns Lista de casos con restAmount > 0
 */
export async function getCasesWithDebt(): Promise<CaseWithPayments[]> {
	try {
		return db.cases.findMany({
			where: { restAmount: { gt: 0 } },
			include: { payments: true }
		});
	} catch (error) {
		console.error('Error fetching cases with debt:', error);
		return [];
	}
}

/**
 * Obtiene todos los casos completamente pagados
 * @returns Lista de casos con restAmount = 0
 */
export async function getCases(): Promise<CaseWithPayments[]> {
	try {
		return db.cases.findMany({
			where: { restAmount: { equals: 0 } },
			include: { payments: true }
		});
	} catch (error) {
		console.error('Error fetching completed cases:', error);
		return [];
	}
}

// ============================================
// CLASSIFICATION TYPES AND HELPERS
// ============================================

type CaseCategory = 'overdue' | 'soon' | 'onTime' | null;

/**
 * Clasifica un caso según la fecha de vencimiento de su pago actual
 * @param caso - Caso con pagos
 * @param currentDate - Fecha de referencia
 * @returns Categoría del caso o null si no hay pago actual
 */
export function classifyCaseByDate(caso: CaseWithPayments, currentDate: Date): CaseCategory {
	const currentPayment = caso.payments.find((p) => p.current);
	if (!currentPayment) return null;

	if (currentPayment.due_date < currentDate) return 'overdue';

	const daysUntilDue = differenceInDays(currentPayment.due_date, currentDate);
	if (daysUntilDue < 5) return 'soon';

	return 'onTime';
}

/**
 * Obtiene todos los casos con deuda agrupados por categoría en una sola consulta
 * @returns Objeto con arrays overdue, soon, onTime
 */
export async function getCasesGrouped(): Promise<{
	overdue: CaseWithPayments[];
	soon: CaseWithPayments[];
	onTime: CaseWithPayments[];
}> {
	const currentDate = new Date();
	const cases = await getCasesWithDebt();

	const overdue: CaseWithPayments[] = [];
	const soon: CaseWithPayments[] = [];
	const onTime: CaseWithPayments[] = [];

	for (const caso of cases) {
		const category = classifyCaseByDate(caso, currentDate);
		if (category === 'overdue') overdue.push(caso);
		else if (category === 'soon') soon.push(caso);
		else if (category === 'onTime') onTime.push(caso);
	}

	return { overdue, soon, onTime };
}

/**
 * Obtiene casos con pagos vencidos
 * @returns Lista de casos vencidos
 */
export async function getOverDueCases(): Promise<CaseWithPayments[]> {
	const { overdue } = await getCasesGrouped();
	return overdue;
}

/**
 * Obtiene casos con pagos próximos a vencer (menos de 5 días)
 * @returns Lista de casos próximos a vencer
 */
export async function getSoonDueCases(): Promise<CaseWithPayments[]> {
	const { soon } = await getCasesGrouped();
	return soon;
}

/**
 * Obtiene casos con pagos al día (5 o más días hasta vencimiento)
 * @returns Lista de casos al día
 */
export async function getOnTimeCases(): Promise<CaseWithPayments[]> {
	const { onTime } = await getCasesGrouped();
	return onTime;
}

// ============================================
// DELETE OPERATIONS
// ============================================

/**
 * Elimina un caso y sus pagos asociados
 * @param caseId - ID del caso a eliminar
 * @returns El caso eliminado
 */
export async function deleteCase(caseId: number) {
	// Primero eliminar todos los pagos asociados al caso
	await db.payment.deleteMany({
		where: { caseId }
	});

	// Luego eliminar el caso
	return db.cases.delete({
		where: { id: caseId }
	});
}

/**
 * Salda un caso poniendo el restAmount en 0
 * @param caseId - ID del caso a saldar
 * @returns El caso actualizado
 */
export async function saldarCase(caseId: number) {
	const caso = await db.cases.findUnique({
		where: { id: caseId }
	});

	if (!caso) {
		throw new Error('Caso no encontrado');
	}

	return db.cases.update({
		where: { id: caseId },
		data: { 
			restAmount: 0,
			updatedAt: new Date()
		}
	});
}

// ============================================
// PRIVATE HELPER FUNCTIONS
// ============================================

/**
 * Encuentra el pago actual (pendiente) de un caso
 */
function findCurrentPayment(caso: CaseWithPayments) {
	return caso.payments.find((p) => p.current);
}

/**
 * Actualiza un pago cuando hay pagos siguientes
 */
async function updatePaymentWithNext(
	caseId: number,
	paymentNumber: number,
	amount: number,
	typepayment: PaymentType,
	collector: string,
	restAmount: number,
	paymentDate: Date
) {
	const [, , casoUpdated] = await db.$transaction([
		db.payment.update({
			where: { payment_number_caseId: { payment_number: paymentNumber, caseId } },
			data: { amount, typepayment, payment_date: paymentDate, current: false, collector }
		}),
		db.payment.update({
			where: { payment_number_caseId: { payment_number: paymentNumber + 1, caseId } },
			data: { current: true }
		}),
		db.cases.update({
			where: { id: caseId },
			data: { restAmount, updatedAt: paymentDate }
		})
	]);

	return casoUpdated;
}

/**
 * Actualiza el pago final de un caso
 */
async function updateFinalPayment(
	caseId: number,
	paymentNumber: number,
	amount: number,
	typepayment: PaymentType,
	collector: string,
	restAmount: number,
	paymentDate: Date
) {
	const [, casoUpdated] = await db.$transaction([
		db.payment.update({
			where: { payment_number_caseId: { payment_number: paymentNumber, caseId } },
			data: { amount, typepayment, payment_date: paymentDate, current: false, collector }
		}),
		db.cases.update({
			where: { id: caseId },
			data: { restAmount, updatedAt: paymentDate }
		})
	]);

	return casoUpdated;
}
