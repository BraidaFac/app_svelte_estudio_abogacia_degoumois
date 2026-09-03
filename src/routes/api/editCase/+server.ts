import { editCase } from '$lib/case.model';
import { apiSuccess, apiError, ApiErrors } from '$lib/utils/api';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z, ZodError } from 'zod';

const EditCaseSchema = z.object({
	caseId: z.number().int().positive(),
	description: z.string().min(1),
	clientName: z.string().min(1),
	clientPhone: z.string().min(1),
	clientEmail: z.string().email().nullable().optional(),
	caseNumber: z.string().max(50).nullable().optional(),
	type: z.enum(['CIVIL', 'PENAL', 'LABORAL', 'FAMILIAR', 'OTRO']),
	period: z.enum(['SEMANAL', 'QUINCENAL', 'MENSUAL']),
	amount: z.number().positive(),
	pendingPayments: z.array(
		z.object({
			payment_number: z.number().int().positive(),
			due_date: z.string().min(1),
			amount: z.number().min(0)
		})
	)
});

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw redirect(302, '/login');

	let raw: unknown;
	try {
		raw = await request.json();
	} catch {
		return apiError(ApiErrors.VALIDATION, 'Datos inválidos', 400);
	}

	let data: z.infer<typeof EditCaseSchema>;
	try {
		data = EditCaseSchema.parse(raw);
	} catch (error) {
		if (error instanceof ZodError) {
			return apiError(ApiErrors.VALIDATION, error.errors[0]?.message ?? 'Datos inválidos', 400);
		}
		return apiError(ApiErrors.VALIDATION, 'Datos inválidos', 400);
	}

	try {
		await editCase(data.caseId, {
			description: data.description,
			clientName: data.clientName,
			clientPhone: data.clientPhone,
			clientEmail: data.clientEmail ?? null,
			caseNumber: data.caseNumber ?? null,
			type: data.type,
			period: data.period,
			amount: data.amount,
			pendingPayments: data.pendingPayments.map((p) => ({
				payment_number: p.payment_number,
				due_date: new Date(p.due_date),
				amount: p.amount
			}))
		});
		return apiSuccess(null, 'Caso actualizado correctamente');
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Error al editar el caso';
		return apiError(ApiErrors.SERVER_ERROR, msg, 500);
	}
};
