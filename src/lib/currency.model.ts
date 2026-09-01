import { db } from './db';

export type CurrencyRecord = {
	id: number;
	name: string;
	value: number;
	isDefault: boolean;
};

/**
 * Returns all currencies sorted by id.
 * value is converted from Decimal to number.
 */
export async function getCurrencies(): Promise<CurrencyRecord[]> {
	const rows = await db.currency.findMany({ orderBy: { id: 'asc' } });
	return rows.map((r) => ({ ...r, value: r.value.toNumber() }));
}

/**
 * Returns { JUS: 5000, USD: 1500, EUR: 1650 }
 */
export async function getCurrencyRates(): Promise<Record<string, number>> {
	const currencies = await getCurrencies();
	return Object.fromEntries(currencies.map((c) => [c.name, c.value]));
}

/**
 * Returns the currency with isDefault = true.
 * Throws if none configured (should not happen after seed).
 */
export async function getDefaultCurrency(): Promise<CurrencyRecord> {
	const currency = await db.currency.findFirst({ where: { isDefault: true } });
	if (!currency) throw new Error('No default currency configured');
	return { ...currency, value: currency.value.toNumber() };
}

/**
 * Updates the value (pesos per unit) for a named currency.
 */
export async function setCurrencyValue(name: string, value: number): Promise<number> {
	const updated = await db.currency.update({ where: { name }, data: { value } });
	return updated.value.toNumber();
}

/**
 * Sets a currency as default in a transaction — unsets all others first.
 */
export async function setCurrencyAsDefault(name: string): Promise<void> {
	await db.$transaction([
		db.currency.updateMany({ data: { isDefault: false } }),
		db.currency.update({ where: { name }, data: { isDefault: true } })
	]);
}

/**
 * Backward-compat shim — used during migration until jus.model.ts callers are updated.
 */
export async function getJusValue(): Promise<number | undefined> {
	const rates = await getCurrencyRates();
	return rates['JUS'];
}
