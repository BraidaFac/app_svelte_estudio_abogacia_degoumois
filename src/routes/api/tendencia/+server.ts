import { error, json } from '@sveltejs/kit';
import { getTendenciaDiaria, getTendenciaPagos } from '$lib/dashboard.model';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const yr = Number(url.searchParams.get('yr'));
	const mo = Number(url.searchParams.get('mo'));
	const dayParam = url.searchParams.get('day');

	if (!yr || !mo) throw error(400, 'yr y mo son requeridos');

	if (dayParam !== null) {
		const data = await getTendenciaPagos(yr, mo, Number(dayParam));
		return json(data);
	}

	const data = await getTendenciaDiaria(yr, mo);
	return json(data);
};
