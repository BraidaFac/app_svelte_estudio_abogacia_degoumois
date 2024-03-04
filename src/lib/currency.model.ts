import { db } from './db';

export const getJusValue = async () => {
	const jus = await db.currency.findUnique({
		where: {
			name: 'JUS'
		}
	});
	return jus?.value;
};

export const setJusValue = async (value: number) => {
	const jus = await db.currency.update({
		where: {
			name: 'JUS'
		},
		data: {
			value
		}
	});
	return jus.value;
};
