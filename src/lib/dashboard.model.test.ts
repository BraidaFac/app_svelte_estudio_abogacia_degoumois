import { describe, it, expect, vi } from 'vitest';

// partitionAging is a pure function; mock $lib/* so the module loads without real DB/SvelteKit aliases
vi.mock('$lib/db', () => ({ db: {} }));
vi.mock('$lib/utils/formatters', () => ({ formatDateToDashDMY: (s: string) => s }));

import { partitionAging } from './dashboard.model';

describe('partitionAging', () => {
	const now = new Date('2026-09-01T00:00:00Z');

	it('assigns row to d0_30 when 15 days overdue', () => {
		const rows = [{ due_date: new Date('2026-08-17T00:00:00Z'), arsAmount: '1000' }];
		const { aging, total } = partitionAging(rows, now);
		expect(aging.d0_30).toBe(1000);
		expect(aging.d31_60).toBe(0);
		expect(total).toBe(1000);
	});

	it('assigns row to d31_60 when 45 days overdue', () => {
		const rows = [{ due_date: new Date('2026-07-17T00:00:00Z'), arsAmount: '500' }];
		const { aging } = partitionAging(rows, now);
		expect(aging.d31_60).toBe(500);
	});

	it('assigns row to d61_90 when 75 days overdue', () => {
		const rows = [{ due_date: new Date('2026-06-18T00:00:00Z'), arsAmount: '200' }];
		const { aging } = partitionAging(rows, now);
		expect(aging.d61_90).toBe(200);
	});

	it('assigns row to d90plus when 120 days overdue', () => {
		const rows = [{ due_date: new Date('2026-05-04T00:00:00Z'), arsAmount: '800' }];
		const { aging } = partitionAging(rows, now);
		expect(aging.d90plus).toBe(800);
	});

	it('returns oldest date from first row (ASC order)', () => {
		const rows = [
			{ due_date: new Date('2026-05-04T00:00:00Z'), arsAmount: '100' },
			{ due_date: new Date('2026-08-17T00:00:00Z'), arsAmount: '100' },
		];
		const { oldest } = partitionAging(rows, now);
		expect(oldest?.toISOString()).toBe('2026-05-04T00:00:00.000Z');
	});

	it('returns null oldest when no rows', () => {
		const { oldest, total } = partitionAging([], now);
		expect(oldest).toBeNull();
		expect(total).toBe(0);
	});
});
