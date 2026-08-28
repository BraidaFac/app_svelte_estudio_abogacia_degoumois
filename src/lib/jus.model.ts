/**
 * Modelo para operaciones relacionadas con el valor JUS
 * Este archivo estaba incompleto y se ha refactorizado
 */

import { db } from './db';

/**
 * Obtiene el valor actual del JUS
 * @returns Valor del JUS o undefined si no existe
 */
export async function getJusValue(): Promise<number | undefined> {
	const jus = await db.currency.findUnique({
		where: { name: 'JUS' }
	});
	return jus?.value.toNumber();
}

/**
 * Establece o actualiza el valor del JUS
 * @param value - Nuevo valor del JUS
 * @returns El valor actualizado
 */
export async function setJusValue(value: number): Promise<number> {
	const jus = await db.currency.upsert({
		where: { name: 'JUS' },
		update: { value },
		create: { name: 'JUS', value }
	});
	return jus.value.toNumber();
}
