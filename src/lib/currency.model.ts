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
	const jus = await db.currency.upsert({
		where: {
			name: 'JUS'
		},
		update: {
			value
		},
		create: {
			name: 'JUS',
			value
		}
	});
	return jus.value;
};
