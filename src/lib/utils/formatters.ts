/**
 * Módulo de utilidades para formateo de datos
 * Centraliza funciones de formateo usadas en toda la aplicación
 */

/**
 * Formatea una fecha ISO a formato DD/MM/YYYY
 * @param dateISO - Fecha en formato ISO o Date
 * @returns Fecha formateada o undefined si el formato es inválido
 */
export function formatDateToDMY(dateISO: Date | string): string | undefined {
	const isoString = typeof dateISO === 'string' ? dateISO : dateISO.toISOString();
	const regex = /^(\d{4})-(\d{2})-(\d{2})T/;
	const matches = isoString.match(regex);

	if (matches) {
		const [, year, month, day] = matches;
		return `${day}/${month}/${year}`;
	}
	return undefined;
}

/**
 * Formatea una fecha ISO a formato DD-MM-YYYY
 * @param dateISO - Fecha en formato ISO string
 * @returns Fecha formateada o undefined si el formato es inválido
 */
export function formatDateToDashDMY(dateISO: string): string | undefined {
	const regex = /^(\d{4})-(\d{2})-(\d{2})T/;
	const matches = dateISO.match(regex);

	if (matches) {
		const [, year, month, day] = matches;
		return `${day}-${month}-${year}`;
	}
	return undefined;
}

/**
 * Agrega separadores de miles a un número
 * @param value - Número a formatear
 * @returns String con separadores de miles (usando punto)
 */
export function addThousandSeparator(value: number): string {
	return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Convierte un string con formato de miles a número
 * @param value - String con separadores de miles
 * @returns Número sin separadores
 */
export function removeThousandSeparator(value: string): number {
	return Number(value.replace(/\./g, ''));
}

/**
 * Formatea un número decimal reemplazando punto por coma
 * @param value - Número a formatear
 * @param decimals - Cantidad de decimales (por defecto 3)
 * @returns String con coma como separador decimal
 */
export function formatDecimalWithComma(value: number, decimals: number = 3): string {
	return value.toFixed(decimals).replace('.', ',');
}

/**
 * Convierte un string con coma decimal a número
 * @param value - String con coma como separador decimal
 * @returns Número
 */
export function parseCommaDecimal(value: string): number {
	return Number(value.replace(',', '.'));
}

// ============================================
// JUS / CURRENCY FORMATTERS
// ============================================

const _jusFormatter = new Intl.NumberFormat('es-AR', {
	minimumFractionDigits: 0,
	maximumFractionDigits: 4
});

/**
 * Formats a JUS amount with Argentine locale (dot as thousands separator,
 * comma as decimal separator) and appends " JUS".
 * Example: 1234.75 → "1.234,75 JUS"
 * @param value - Numeric JUS amount (number, already converted from Prisma.Decimal)
 */
export function formatJUS(value: number): string {
	return `${_jusFormatter.format(value)} JUS`;
}

/**
 * Formats a number with Argentine locale without a suffix.
 * Example: 1234.75 → "1.234,75"
 * @param value - Numeric value to format
 */
export function formatNumber(value: number): string {
	return _jusFormatter.format(value);
}
