import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./db', () => ({
	db: {
		cases: {
			findMany: vi.fn()
		}
	}
}));

import { db } from './db';
import { classifyCaseByDate } from './case.model';

describe('classifyCaseByDate', () => {
	const now = new Date();

	const makeCase = (daysOffset: number, current: boolean = true) => ({
		id: 1,
		payments: [
			{
				current,
				due_date: new Date(now.getTime() + daysOffset * 24 * 60 * 60 * 1000)
			}
		]
	});

	it('clasifica como overdue si la fecha es pasada', () => {
		const caso = makeCase(-1);
		expect(classifyCaseByDate(caso as any, now)).toBe('overdue');
	});

	it('clasifica como soon si faltan menos de 5 días', () => {
		const caso = makeCase(3);
		expect(classifyCaseByDate(caso as any, now)).toBe('soon');
	});

	it('clasifica como onTime si faltan 5 o más días', () => {
		const caso = makeCase(10);
		expect(classifyCaseByDate(caso as any, now)).toBe('onTime');
	});

	it('retorna null si no hay pago actual', () => {
		const caso = makeCase(10, false);
		expect(classifyCaseByDate(caso as any, now)).toBeNull();
	});
});
