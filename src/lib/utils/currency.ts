// Minimal interface — satisfied by both CurrencyRecord (from currency.model.ts)
// and any Prisma Currency result. No need for a separate CurrencyMeta type.
export type CurrencyRates = Record<string, number>;

const CURRENCY_SYMBOLS: Record<string, string> = {
	JUS: 'JUS',
	USD: 'U$D',
	EUR: '€',
	ARS: '$'
};

/**
 * Derives a { name: rate } map from any array that has name + value.
 * Accepts CurrencyRecord from currency.model.ts or raw Prisma results.
 */
export function toRatesMap(currencies: { name: string; value: number }[]): CurrencyRates {
	return Object.fromEntries(currencies.map((c) => [c.name, c.value]));
}

/**
 * Converts amount in any currency to ARS using pesos-per-unit rate.
 */
export function toARS(amount: number, rate: number): number {
	return amount * rate;
}

/**
 * Converts ARS amount to any currency using pesos-per-unit rate.
 */
export function fromARS(amountARS: number, rate: number): number {
	return amountARS / rate;
}

/**
 * Converts between two currencies using ARS as pivot.
 * convert(100, 1500, 5000) = 100 USD → 150000 ARS → 30 JUS
 */
export function convert(amount: number, fromRate: number, toRate: number): number {
	return toARS(amount, fromRate) / toRate;
}

/**
 * Formats an amount for display with the appropriate symbol.
 * JUS: "10,500 JUS"   USD: "U$D 1.000,00"   EUR: "€ 850,00"   ARS: "$ 150.000,00"
 */
export function formatAmount(amount: number, currencyName: string): string {
	if (currencyName === 'JUS') {
		return `${amount.toFixed(3).replace('.', ',')} JUS`;
	}
	const symbol = CURRENCY_SYMBOLS[currencyName] ?? currencyName;
	const formatted = amount.toLocaleString('es-AR', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
	return `${symbol} ${formatted}`;
}

/**
 * Returns equivalents of `amount` in fromCurrency across all currencies in rates.
 * Always includes ARS. Never includes the source currency in the result.
 * Returns {} if fromCurrency is not in rates.
 */
export function getEquivalents(
	amount: number,
	fromCurrency: string,
	rates: CurrencyRates
): Record<string, number> {
	const fromRate = rates[fromCurrency];
	if (fromRate === undefined) return {};
	const amountARS = toARS(amount, fromRate);
	const result: Record<string, number> = { ARS: amountARS };
	for (const [name, rate] of Object.entries(rates)) {
		if (name !== fromCurrency) {
			result[name] = parseFloat((amountARS / rate).toFixed(4));
		}
	}
	return result;
}
