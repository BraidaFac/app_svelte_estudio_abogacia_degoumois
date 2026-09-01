import { getCurrencies } from '$lib/currency.model';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const user = locals.user;
	try {
		const currencies = await getCurrencies();
		return { user, currencies };
	} catch (error) {
		console.error('Error fetching currencies:', error);
		return { user, currencies: [] };
	}
};
