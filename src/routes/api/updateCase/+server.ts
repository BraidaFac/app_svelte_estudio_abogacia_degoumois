import { saldarCase, closeCase } from '$lib/case.model';
import { apiSuccess, apiError, ApiErrors } from '$lib/utils/api';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;

	if (!user) {
		throw redirect(302, '/login');
	}

	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		return apiError(ApiErrors.VALIDATION, 'Datos inválidos', 400);
	}

	const caseIdStr = formData.get('caseId')?.toString();
	const action = formData.get('action')?.toString();

	if (!caseIdStr || !action) {
		return apiError(ApiErrors.VALIDATION, 'Faltan datos', 400);
	}

	const caseId = parseInt(caseIdStr);

	if (action === 'saldar') {
		try {
			const updatedCase = await saldarCase(caseId);
			return apiSuccess({ case: updatedCase });
		} catch (err) {
			console.error('Error saldando caso:', err);
			return apiError(ApiErrors.SERVER_ERROR, 'Error al saldar el caso', 500);
		}
	}

	if (action === 'cerrar') {
		const collector = formData.get('collector')?.toString()?.trim();
		if (!collector) return apiError(ApiErrors.VALIDATION, 'Falta nombre del cobrador', 400);
		try {
			await closeCase(caseId, collector);
			return apiSuccess(null, 'Caso cerrado correctamente');
		} catch (err) {
			console.error('Error cerrando caso:', err);
			return apiError(ApiErrors.SERVER_ERROR, 'Error al cerrar el caso', 500);
		}
	}

	return apiError(ApiErrors.VALIDATION, 'Acción no válida', 400);
};
