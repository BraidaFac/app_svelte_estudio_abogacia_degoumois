import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';
import { saveCase } from '$lib/case.model';
import { getJusValue } from '$lib/currency.model';
export const POST: RequestHandler = async ({ locals, request }) => {
	const user = locals.user;
	if (!user) {
		throw redirect(302, '/login');
	}
	const jus_value = await getJusValue();
	if (!jus_value) {
		return new Response(JSON.stringify({ error: 'No se pudo obtener el valor del JUS' }), {
			status: 500
		});
	}
	const data = (await request.json()) as Record<string, string>;
	const {
		description,
		amount,
		clientName,
		clientPhone,
		quantity_payment,
		amount_payment,
		due_date,
		typepayment,
		collector,
		type
	} = data;
	if (
		!description ||
		!amount ||
		!clientName ||
		!clientPhone ||
		!quantity_payment ||
		!due_date ||
		!type
	) {
		return new Response(JSON.stringify({ error: 'Faltan datos' }), { status: 400 });
	}
	const amount_payment_float = amount_payment ? amount_payment.split('.').join('') : undefined;
	const payments = Array.from({ length: parseInt(quantity_payment) }, (_, i) => {
		const currentDate = new Date(due_date);
		currentDate.setMonth(currentDate.getMonth() + i);
		return {
			payment_number: i + 1,
			due_date: currentDate,
			typepayment: typepayment && i === 0 ? typepayment : undefined,
			collector: collector && i === 0 ? collector : undefined,
			amount:
				amount_payment_float && i === 0
					? +(parseFloat(amount_payment_float) / jus_value).toFixed(3)
					: undefined,
			current:
				(i === 0 && !amount_payment_float) || (i === 1 && amount_payment_float) ? true : false,
			payment_date: i === 0 && amount_payment_float ? currentDate : undefined
		};
	});

	const caso = {
		description,
		type,
		clientName,
		clientPhone,
		userId: user.id,
		payments: { create: payments },
		amount: +parseFloat(amount).toFixed(3),
		restAmount: amount_payment_float
			? +(parseFloat(amount) - parseFloat(amount_payment_float) / jus_value).toFixed(3)
			: +parseFloat(amount).toFixed(3)
	};

	try {
		const response = await saveCase(caso);
		return new Response(JSON.stringify(response), { status: 201 });
	} catch (error) {
		console.log('error', error);
		return new Response(JSON.stringify({ error }), { status: 500 });
	}
};
