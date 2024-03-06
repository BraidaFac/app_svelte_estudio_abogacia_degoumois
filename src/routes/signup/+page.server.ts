import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { ZodError } from 'zod';
import { registerSchema } from './registerSchema';
import { createUser, getUsers, deleteUser } from '$lib/user.model';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	if (user?.role !== 'ADMIN') {
		throw redirect(302, '/');
	}
	try {
		const users = await getUsers();
		return { users };
	} catch (error) {
		return {
			message: 'No se pudo obtener los usuarios'
		};
	}
};
export const actions: Actions = {
	create: async ({ request }) => {
		const formData = Object.fromEntries(await request.formData()) as Record<string, string>;

		try {
			const { name, password } = registerSchema.parse(formData);
			const { error } = await createUser(password, name);
			if (error?.status === 400) {
				return {
					message: 'El usuario ya existe'
				};
			}
			if (error?.status === 500) {
				return {
					message: 'No se pudo registrar al usuario'
				};
			}
		} catch (error) {
			if (error instanceof ZodError) {
				const { fieldErrors: errors } = error.flatten();
				return {
					data: { ...formData },
					errors
				};
			} else {
				return {
					message: 'No se pudo registrar al usuario'
				};
			}
		}
		throw redirect(302, '/login');
	},
	delete: async ({ request }) => {
		const formData = Object.fromEntries(await request.formData()) as Record<string, string>;
		try {
			const { id } = formData;
			await deleteUser(parseInt(id));
			return { id };
		} catch (error) {
			return {
				message: 'No se pudo eliminar al usuario'
			};
		}
	}
};
