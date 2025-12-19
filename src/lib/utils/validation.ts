/**
 * Módulo de utilidades para validación con Zod
 * Centraliza funciones de validación usadas en toda la aplicación
 */

import { ZodError, type ZodSchema } from 'zod';

/**
 * Resultado de validación con errores tipados
 */
export interface ValidationResult<T> {
	success: boolean;
	data?: T;
	errors?: Record<string, string | string[] | undefined>;
}

/**
 * Valida un objeto contra un schema Zod
 * @param data - Objeto a validar
 * @param schema - Schema Zod para validación
 * @returns Resultado de validación con datos o errores
 */
export function validateWithSchema<T>(data: unknown, schema: ZodSchema<T>): ValidationResult<T> {
	try {
		const validatedData = schema.parse(data);
		return { success: true, data: validatedData };
	} catch (error) {
		if (error instanceof ZodError) {
			const { fieldErrors } = error.flatten();
			return { success: false, errors: fieldErrors };
		}
		throw error;
	}
}

/**
 * Valida y lanza error si falla (para uso en formularios con throw)
 * @param data - Objeto a validar
 * @param schema - Schema Zod para validación
 * @throws ZodError si la validación falla
 */
export function validateOrThrow<T>(data: unknown, schema: ZodSchema<T>): T {
	return schema.parse(data);
}

/**
 * Extrae errores de campo de un ZodError
 * @param error - Error capturado
 * @returns Objeto con errores por campo o null si no es ZodError
 */
export function extractFieldErrors(
	error: unknown
): Record<string, string | string[] | undefined> | null {
	if (error instanceof ZodError) {
		const { fieldErrors } = error.flatten();
		return fieldErrors;
	}
	return null;
}

/**
 * Tipo para el estado de errores de formulario
 */
export type FormErrors = Record<string, string | string[] | undefined>;

/**
 * Estado inicial para errores de formulario
 */
export const initialFormErrors: FormErrors = {};
