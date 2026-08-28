import { describe, expect, it } from 'vitest';
import { formatDateToDMY, formatDateToDashDMY, formatJUS, formatNumber } from './formatters';

describe('formatJUS', () => {
	it('appends JUS suffix', () => {
		expect(formatJUS(50)).toBe('50 JUS');
	});

	it('formats thousands with dot separator (Argentine locale)', () => {
		expect(formatJUS(1234)).toBe('1.234 JUS');
	});

	it('formats decimals with comma separator', () => {
		expect(formatJUS(1234.75)).toBe('1.234,75 JUS');
	});

	it('handles zero', () => {
		expect(formatJUS(0)).toBe('0 JUS');
	});

	it('trims trailing zeros while keeping precision', () => {
		// 50.5 has one decimal place — formats as "50,5"
		expect(formatJUS(50.5)).toBe('50,5 JUS');
	});

	it('supports up to 4 decimal places', () => {
		expect(formatJUS(10.1234)).toBe('10,1234 JUS');
	});
});

describe('formatNumber', () => {
	it('formats without suffix', () => {
		expect(formatNumber(1234.75)).toBe('1.234,75');
	});

	it('handles zero', () => {
		expect(formatNumber(0)).toBe('0');
	});
});

describe('formatDateToDMY', () => {
	it('formats ISO date string', () => {
		expect(formatDateToDMY('2024-03-15T00:00:00.000Z')).toBe('15/03/2024');
	});
});

describe('formatDateToDashDMY', () => {
	it('formats with dash separator', () => {
		expect(formatDateToDashDMY('2024-03-15T00:00:00.000Z')).toBe('15-03-2024');
	});
});
