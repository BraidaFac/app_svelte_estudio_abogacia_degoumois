import type { LayoutServerLoad } from './$types';
import { getJusValue } from '$lib/currency.model';
export const load: LayoutServerLoad = async ({ locals }) => {
	const user = locals.user;
	try {
		const jus_value = await getJusValue();
		return {
			user,
			jus_value
		};
	} catch (error) {
		return {
			error: {
				status: 500,
				message: 'Could not get JUS value'
			}
		};
	}
};
