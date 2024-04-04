import type { PaymentType } from '@prisma/client';
import { db } from './db';
import { differenceInDays } from 'date-fns';
export const saveCase = async (data: any) => {
	const caso = await db.cases.create({
		data
	});
	return caso;
};

export const createPayment = async (
	caseId: number,
	data: { amount: number; typepayment: PaymentType; paymentNumber: number; collector: string }
) => {
	const { amount, typepayment, paymentNumber, collector } = data;
	const today = new Date();

	const caso = await db.cases.findUnique({
		where: {
			id: caseId
		},
		include: {
			payments: true
		}
	});
	if (!caso) {
		throw new Error('Caso no encontrado');
	}
	const restAmount = +(caso.restAmount - amount).toFixed(3);
	const quantity_payment = caso.payments.length;
	if (paymentNumber < quantity_payment) {
		const [, , casoUpdated] = await db.$transaction([
			db.payment.update({
				where: {
					payment_number_caseId: {
						payment_number: paymentNumber,
						caseId
					}
				},
				data: {
					amount,
					typepayment,
					payment_date: today,
					current: false,
					collector
				}
			}),
			db.payment.update({
				where: {
					payment_number_caseId: {
						payment_number: paymentNumber + 1,
						caseId
					}
				},
				data: {
					current: true
				}
			}),
			db.cases.update({
				where: {
					id: caseId
				},
				data: {
					restAmount: restAmount,
					updatedAt: today
				}
			})
		]);
		return casoUpdated;
	} else {
		const [, casoUpdated] = await db.$transaction([
			db.payment.update({
				where: {
					payment_number_caseId: {
						payment_number: paymentNumber,
						caseId
					}
				},
				data: {
					amount,
					typepayment,
					payment_date: today,
					current: false,
					collector
				}
			}),
			db.cases.update({
				where: {
					id: caseId
				},
				data: {
					restAmount: restAmount,
					updatedAt: today
				}
			})
		]);
		return casoUpdated;
	}
};

export const getCasesWithDebt = async () => {
	try {
		const cases = await db.cases.findMany({
			where: {
				restAmount: {
					gt: 0
				}
			},
			include: {
				payments: true
			}
		});

		return cases;
	} catch (error) {
		console.log('error', error);
		return [];
	}
};
export const getCases = async () => {
	try {
		const cases = await db.cases.findMany({
			where:{
				restAmount:{
					equals:0
				}
			},
			include: {
				payments: true
			}
		});
		return cases;
	} catch (error) {
		console.log('error', error);
		return [];
	}
};

export const getOverDueCases = async () => {
	const currentDate = new Date();
	const cases = await getCasesWithDebt();
	const overdueCases = cases.filter((c) => {
		const lastPayment = c.payments.find((p) => p.current);
		if (!lastPayment) {
			return false;
		}
		return lastPayment.due_date < currentDate;
	});
	return overdueCases;
};
export const getSoonDueCases = async () => {
	const currentDate = new Date();
	const cases = await getCasesWithDebt();
	const soonDueCases = cases.filter((c) => {
		const lastPayment = c.payments.find((p) => p.current);
		if (!lastPayment) {
			return false;
		}
		return (
			lastPayment.due_date > currentDate && differenceInDays(lastPayment.due_date, currentDate) < 5
		);
	});
	return soonDueCases;
};

export const getOnTimeCases = async () => {
	const currentDate = new Date();
	const cases = await getCasesWithDebt();
	const onTimeCases = cases.filter((c) => {
		const lastPayment = c.payments.find((p) => p.current);
		if (!lastPayment) {
			return false;
		}
		return (
			lastPayment.due_date > currentDate && differenceInDays(lastPayment.due_date, currentDate) >= 5
		);
	});
	return onTimeCases;
};
export const deleteCase = async (caseId: number) => {
	const caso = await db.cases.delete({
		where: {
			id: caseId
		}
	});
	return caso;
};
