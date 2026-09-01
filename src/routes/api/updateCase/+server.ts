import { saldarCase, closeCase } from '$lib/case.model';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;

	if (!user) {
		throw error(401, 'No autorizado');
	}

	try {
		const formData = await request.formData();
		const caseIdStr = formData.get('caseId')?.toString();
		const action = formData.get('action')?.toString();

		if (!caseIdStr || !action) {
			throw error(400, 'Faltan datos');
		}

		const caseId = parseInt(caseIdStr);

		if (action === 'saldar') {
			const updatedCase = await saldarCase(caseId);
			return json({ success: true, case: updatedCase });
		}

		if (action === 'cerrar') {
			const collector = formData.get('collector')?.toString()?.trim();
			if (!collector) throw error(400, 'Falta nombre del cobrador');
			await closeCase(caseId, collector);
			return json({ success: true });
		}

		throw error(400, 'Acción no válida');
	} catch (err: any) {
		console.error('Error updating case:', err);
		throw error(500, err.message || 'Error al actualizar el caso');
	}
};
