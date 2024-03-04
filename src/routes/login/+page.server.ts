import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { loginUser } from '$lib/user.model';

export const load: PageServerLoad = (event) => {
	const user = event.locals.user;
	if (user) {
		throw redirect(302, '/');
	}
};

export const actions: Actions = {
	default: async (event) => {
		const formData = Object.fromEntries(await event.request.formData());
		const { name, password } = formData as { name: string; password: string };

		const { error, token, jwtUser: user } = await loginUser(name, password);
		if (error) {
			return {
				status: 401,
				message: error
			};
		}
		// Set the cookie
		event.cookies.set('AuthorizationToken', `Bearer ${token}`, {
			httpOnly: true,
			path: '/',
			secure: true,
			sameSite: 'strict',
			maxAge: 60 * 60 * 24 * 5 // 5 day
		});
		throw redirect(302, '/');
	}
};
