import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';
import { setJusValue } from '$lib/currency.model';
export const POST: RequestHandler = async ({ locals, request }) => {
	const user = locals.user;
	if (!user) {
		throw redirect(302, '/login');
	}

	const data = (await request.json()) as Record<string, string>;
	const { jus_value } = data;
	if (!jus_value) {
		return new Response(JSON.stringify({ error: 'Faltan datos' }), { status: 400 });
	}

	try {
		const response = await setJusValue(+jus_value.split('.').join(''));
		return new Response(JSON.stringify(response), { status: 200 });
	} catch (error) {
		console.log('error', error);
		return new Response(JSON.stringify({ error }), { status: 500 });
	}
};
