import { describe, it, expect } from 'vitest';
import { toRatesMap, toARS, fromARS, convert, formatAmount, getEquivalents } from './currency';

const rates = { JUS: 5000, USD: 1500, EUR: 1650 };

const currencies = [
	{ id: 1, name: 'JUS', value: 5000, isDefault: true },
	{ id: 2, name: 'USD', value: 1500, isDefault: false },
	{ id: 3, name: 'EUR', value: 1650, isDefault: false }
];

describe('toRatesMap', () => {
	it('convierte array a mapa name→value', () => {
		expect(toRatesMap(currencies)).toEqual({ JUS: 5000, USD: 1500, EUR: 1650 });
	});
});

describe('toARS', () => {
	it('100 USD × 1500 = 150000', () => expect(toARS(100, 1500)).toBe(150000));
	it('10 JUS × 5000 = 50000', () => expect(toARS(10, 5000)).toBe(50000));
});

describe('fromARS', () => {
	it('150000 ARS ÷ 1500 = 100 USD', () => expect(fromARS(150000, 1500)).toBe(100));
	it('50000 ARS ÷ 5000 = 10 JUS', () => expect(fromARS(50000, 5000)).toBe(10));
});

describe('convert', () => {
	it('100 USD → JUS: 100×1500÷5000 = 30', () => expect(convert(100, 1500, 5000)).toBe(30));
	it('30 JUS → USD: 30×5000÷1500 = 100', () => expect(convert(30, 5000, 1500)).toBe(100));
});

describe('formatAmount', () => {
	it('JUS: usa coma decimal y sufijo JUS', () => {
		expect(formatAmount(10.5, 'JUS')).toBe('10,500 JUS');
	});
	it('USD: prefijo U$D y formato argentino', () => {
		expect(formatAmount(1000, 'USD')).toMatch(/U\$D/);
	});
	it('EUR: prefijo €', () => {
		expect(formatAmount(850, 'EUR')).toMatch(/€/);
	});
	it('ARS: prefijo $', () => {
		expect(formatAmount(150000, 'ARS')).toMatch(/\$/);
	});
});

describe('getEquivalents', () => {
	it('100 USD → incluye ARS, JUS, EUR', () => {
		const result = getEquivalents(100, 'USD', rates);
		expect(result.ARS).toBe(150000);
		expect(result.JUS).toBeCloseTo(30, 2);
		expect(result.EUR).toBeCloseTo(90.91, 1);
		expect(result.USD).toBeUndefined(); // no se incluye a sí misma
	});
	it('10 JUS → incluye ARS, USD, EUR', () => {
		const result = getEquivalents(10, 'JUS', rates);
		expect(result.ARS).toBe(50000);
		expect(result.USD).toBeCloseTo(33.33, 1);
	});
	it('moneda desconocida → objeto vacío', () => {
		expect(getEquivalents(100, 'BTC', rates)).toEqual({});
	});
});
