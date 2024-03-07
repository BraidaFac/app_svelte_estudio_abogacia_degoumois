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
		.min(1, { message: 'Ingrese decripcion' })
		.trim(),
	amount: z.string({ required_error: 'Ingrese monto' }).min(1, { message: 'Ingrese monto' }).trim(),
	quantity_payment: z
		.string({ required_error: 'Ingrese cantidad de cuotas' })
		.refine((value) => parseInt(value, 10) > 0, {
			message: 'La cantidad de cuotas debe ser mayor a 0'
		}),
	due_date: z
		.string({ required_error: 'Ingrese fecha de vencimiento' })
		.min(1, { message: 'Ingrese fecha de cobro' }),
	amount_payment: z.string().min(1, { message: 'Ingrese monto' }).optional(),
	typepayment: z.string().min(1, { message: 'Ingrese tipo de pago' }).optional()
});
