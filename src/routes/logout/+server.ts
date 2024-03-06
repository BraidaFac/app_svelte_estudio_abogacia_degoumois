import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, cookies }) => {
	console.log('logout');

	const user = locals.user;
	if (!user) {
		throw redirect(302, '/login');
	}
	locals.user = undefined;
	cookies.delete('AuthorizationToken', {
		httpOnly: true,
		path: '/',
		secure: true,
		sameSite: 'strict'
	});

	throw redirect(302, '/login');
};
