import { z } from 'zod';

export const modalSchema = z.object({
	clientName: z
		.string({ required_error: 'Ingrese cliente' })
		.min(1, { message: 'Ingrese cliente' })
		.max(50, { message: 'Ingrese hasta 50 caracteres' })
		.trim(),
	clientPhone: z
		.string({ required_error: 'Ingrese telefono cliente' })
		.min(6, { message: 'Numero incorrecto' })
		.trim(),
	description: z
		.string({ required_error: 'Ingrese descripcion' })
		.min(1, { message: 'Ingrese decripcion' }),
	amount: z.string({ required_error: 'Ingrese monto' }).min(1, { message: 'Ingrese monto' }),
	quantity_payment: z
		.string({ required_error: 'Ingrese cantidad de cuotas' })
		.min(1, { message: 'Ingrese cantidad de cuotas' }),
	due_date: z
		.string({ required_error: 'Ingrese fecha de vencimiento' })
		.min(1, { message: 'Ingrese fecha de cobro' }),
	amount_payment: z.string().min(1, { message: 'Ingrese monto' }).optional(),
	typepayment: z.string().min(1, { message: 'Ingrese tipo de pago' }).optional(),
	collector: z.string().min(1, { message: 'Ingrese cobrador' }).optional()
});
