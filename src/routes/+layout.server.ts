import { getJusValue } from '$lib/jus.model';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const user = locals.user;

	try {
		const jus_value = await getJusValue();
		return { user, jus_value };
	} catch (error) {
		console.error('Error fetching JUS value:', error);
		return {
			user,
			jus_value: 0,
			error: { status: 500, message: 'Could not get JUS value' }
		};
	}
};
