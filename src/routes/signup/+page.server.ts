import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { ZodError } from 'zod';
import { registerSchema } from './registerSchema';
import { createUser, deleteUser, getUsers } from '$lib/user.model';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || locals.user.role !== 'ADMIN') {
		redirect(302, '/');
	}
	const users = await getUsers();
	return { users: users.map((u) => ({ id: u.id, name: u.name, role: u.role })) };
};

export const actions: Actions = {
	create: async ({ request }) => {
		const formData = Object.fromEntries(await request.formData()) as Record<string, string>;

		let parsed: { name: string; password: string };
		try {
			parsed = registerSchema.parse(formData);
		} catch (error) {
			if (error instanceof ZodError) {
				const { fieldErrors: errors } = error.flatten();
				return fail(422, { data: { ...formData }, errors });
			}
			return fail(400, { message: 'Datos inválidos' });
		}

		const { error } = await createUser(parsed.password, parsed.name);
		if (error?.status === 400) {
			return fail(400, { message: 'El usuario ya existe' });
		}
		if (error) {
			return fail(500, { message: 'No se pudo registrar al usuario' });
		}

		return { success: true };
	},
	delete: async ({ request }) => {
		const formData = Object.fromEntries(await request.formData()) as Record<string, string>;
		try {
			const { id } = formData;
			await deleteUser(parseInt(id));
			return { id };
		} catch {
			return fail(500, { message: 'No se pudo eliminar al usuario' });
		}
	}
};
