import { setJusValue } from '$lib/jus.model';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

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
		const numericValue = Number(jus_value.replaceAll('.', ''));
		const response = await setJusValue(numericValue);
		return new Response(JSON.stringify(response), { status: 200 });
	} catch (error) {
		console.error('Error setting JUS value:', error);
		return new Response(JSON.stringify({ error: 'Error al guardar valor JUS' }), { status: 500 });
	}
};
