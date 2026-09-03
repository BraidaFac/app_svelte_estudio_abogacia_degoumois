import { getCurrencies, setCurrencyValue } from '$lib/currency.model';
import { apiSuccess, apiError, ApiErrors } from '$lib/utils/api';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/login');
	try {
		const currencies = await getCurrencies();
		return apiSuccess(currencies);
	} catch (error) {
		console.error('Error fetching currencies:', error);
		return apiError(ApiErrors.SERVER_ERROR, 'Error al obtener monedas', 500);
	}
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) throw redirect(302, '/login');

	const data = (await request.json()) as Record<string, string>;
	const { name, value } = data;

	if (!name || !value) {
		return apiError(ApiErrors.VALIDATION, 'Faltan datos: name y value requeridos', 400);
	}

	const numericValue = Number(value.toString().replaceAll('.', ''));
	if (isNaN(numericValue) || numericValue <= 0) {
		return apiError(ApiErrors.VALIDATION, 'Valor inválido', 400);
	}

	try {
		const updated = await setCurrencyValue(name, numericValue);
		return apiSuccess({ value: updated }, 'Moneda actualizada correctamente');
	} catch (error) {
		console.error('Error updating currency:', error);
		return apiError(ApiErrors.SERVER_ERROR, 'Error al actualizar moneda', 500);
	}
};
