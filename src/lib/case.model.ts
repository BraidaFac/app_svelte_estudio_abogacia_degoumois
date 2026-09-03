/**
 * Modelo para operaciones CRUD de casos legales
 * Implementa principios SOLID y tipado estricto
 */

import type { PaymentType } from '@prisma/client';
import { differenceInDays } from 'date-fns';
import { db } from './db';
import type { CaseWithPayments, CreateCaseData, EditCaseData, RegisterPaymentData } from './types/case.types';

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
		include: { payments: true, currency: true }
	});

	if (!caso) {
		throw new Error('Caso no encontrado');
	}

	const restAmount = parseFloat((caso.restAmount.toNumber() - amount).toFixed(4));
	const totalPayments = caso.payments.length;
	// If restAmount reaches 0, treat as final regardless of remaining payment slots
	const hasNextPayment = paymentNumber < totalPayments && restAmount > 0;

	// Pending payments after the one being paid (for redistribution)
	const pendingAfterCurrent = caso.payments
		.filter((p) => p.payment_number > paymentNumber && !p.payment_date)
		.sort((a, b) => a.payment_number - b.payment_number);

	if (hasNextPayment) {
		return updatePaymentWithNext(
			caseId,
			paymentNumber,
			amount,
			typepayment,
			collector,
			restAmount,
			today,
			pendingAfterCurrent
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
		return await db.cases.findMany({
			where: { closed: false, restAmount: { gt: 0 } },
			include: { payments: true, currency: true }
		});
	} catch (error) {
		console.error('Error fetching cases with debt:', error);
		return [];
	}
}

/**
 * Obtiene todos los casos cerrados (historial)
 * @returns Lista de casos con closed = true
 */
export async function getCases(): Promise<CaseWithPayments[]> {
	try {
		return await db.cases.findMany({
			where: { closed: true },
			include: { payments: true, currency: true }
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
	const caso = await db.cases.findUnique({ where: { id: caseId }, include: { currency: true } });
	if (!caso) throw new Error('Caso no encontrado');

	return db.cases.update({
		where: { id: caseId },
		data: { restAmount: 0, closed: true, updatedAt: new Date() }
	});
}

/**
 * Cierra un caso marcando todos los pagos pendientes como cobrados
 * @param caseId - ID del caso
 * @param collector - Nombre del cobrador
 */
export async function closeCase(caseId: number, collector: string) {
	const caso = await db.cases.findUnique({
		where: { id: caseId },
		include: { payments: true, currency: true }
	});
	if (!caso) throw new Error('Caso no encontrado');

	const today = new Date();
	const pendingPayments = caso.payments.filter((p) => !p.payment_date);

	await db.$transaction([
		...pendingPayments.map((p) =>
			db.payment.update({
				where: { payment_number_caseId: { payment_number: p.payment_number, caseId } },
				data: {
					payment_date: today,
					collector,
					current: false,
					status: 'PAGADA'
				}
			})
		),
		db.cases.update({
			where: { id: caseId },
			data: { restAmount: 0, closed: true, updatedAt: today }
		})
	]);
}

/**
 * Edita los datos de un caso activo, redistribuyendo pagos pendientes
 */
export async function editCase(caseId: number, data: EditCaseData) {
	const caso = await db.cases.findUnique({
		where: { id: caseId },
		include: { payments: true }
	});

	if (!caso) throw new Error('Caso no encontrado');
	if (caso.closed) throw new Error('No se puede editar un caso cerrado');

	const paidAmount = parseFloat((caso.amount.toNumber() - caso.restAmount.toNumber()).toFixed(4));

	if (data.amount < paidAmount) {
		throw new Error(`El monto no puede ser menor al total ya cobrado (${paidAmount})`);
	}

	const newRestAmount = parseFloat((data.amount - paidAmount).toFixed(4));

	// Validate pending payments sum
	const pendingSum = parseFloat(
		data.pendingPayments.reduce((acc, p) => acc + p.amount, 0).toFixed(4)
	);
	if (Math.abs(pendingSum - newRestAmount) > 0.01) {
		throw new Error(
			`La suma de cuotas (${pendingSum}) no coincide con el monto restante (${newRestAmount})`
		);
	}

	const existingPending = caso.payments.filter((p) => !p.payment_date);
	const existingPendingNumbers = new Set(existingPending.map((p) => p.payment_number));
	const newPendingNumbers = new Set(data.pendingPayments.map((p) => p.payment_number));

	// Payments to delete: exist in DB but not in new list
	const toDelete = existingPending.filter((p) => !newPendingNumbers.has(p.payment_number));
	// Payments to create: in new list but not in DB
	const toCreate = data.pendingPayments.filter((p) => !existingPendingNumbers.has(p.payment_number));
	// Payments to update: in both
	const toUpdate = data.pendingPayments.filter((p) => existingPendingNumbers.has(p.payment_number));

	await db.$transaction([
		...toDelete.map((p) =>
			db.payment.delete({
				where: { payment_number_caseId: { payment_number: p.payment_number, caseId } }
			})
		),
		...toCreate.map((p) =>
			db.payment.create({
				data: {
					payment_number: p.payment_number,
					caseId,
					due_date: p.due_date,
					amount: p.amount,
					current: false,
					status: 'PENDIENTE'
				}
			})
		),
		...toUpdate.map((p) =>
			db.payment.update({
				where: { payment_number_caseId: { payment_number: p.payment_number, caseId } },
				data: { due_date: p.due_date, amount: p.amount }
			})
		),
		db.cases.update({
			where: { id: caseId },
			data: {
				description: data.description,
				clientName: data.clientName,
				clientPhone: data.clientPhone,
				clientEmail: data.clientEmail,
				caseNumber: data.caseNumber,
				type: data.type,
				period: data.period,
				amount: data.amount,
				restAmount: newRestAmount,
				updatedAt: new Date()
			}
		})
	]);
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
 * Actualiza un pago cuando hay pagos siguientes, redistribuyendo el restAmount
 * equitativamente entre las cuotas pendientes restantes.
 */
async function updatePaymentWithNext(
	caseId: number,
	paymentNumber: number,
	amount: number,
	typepayment: PaymentType,
	collector: string,
	restAmount: number,
	paymentDate: Date,
	pendingAfterCurrent: { payment_number: number }[]
) {
	const pendingCount = pendingAfterCurrent.length;
	// ponytail: even split — per-payment rounding handled by toFixed(4)
	const amountPerPending =
		pendingCount > 0 ? parseFloat((restAmount / pendingCount).toFixed(4)) : 0;

	return db.$transaction(async (tx) => {
		await tx.payment.update({
			where: { payment_number_caseId: { payment_number: paymentNumber, caseId } },
			data: { amount, typepayment, payment_date: paymentDate, current: false, collector, status: 'PAGADA' }
		});
		await tx.payment.update({
			where: { payment_number_caseId: { payment_number: paymentNumber + 1, caseId } },
			data: { current: true }
		});
		for (const p of pendingAfterCurrent) {
			await tx.payment.update({
				where: { payment_number_caseId: { payment_number: p.payment_number, caseId } },
				data: { amount: amountPerPending }
			});
		}
		return tx.cases.update({
			where: { id: caseId },
			data: { restAmount, updatedAt: paymentDate }
		});
	});
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
	const [, , casoUpdated] = await db.$transaction([
		db.payment.update({
			where: { payment_number_caseId: { payment_number: paymentNumber, caseId } },
			data: {
				amount,
				typepayment,
				payment_date: paymentDate,
				current: false,
				collector,
				status: 'PAGADA'
			}
		}),
		db.payment.deleteMany({
			where: { caseId, payment_number: { gt: paymentNumber }, payment_date: null }
		}),
		db.cases.update({
			where: { id: caseId },
			data: { restAmount: Math.max(0, restAmount), closed: true, updatedAt: paymentDate }
		})
	]);

	return casoUpdated;
}
