import { z } from 'zod';

export const paymentSchema = z.object({
	amount: z.string({ required_error: 'Ingrese monto' }).min(1, { message: 'Ingrese monto' }),
	typepayment: z.string().min(1, { message: 'Ingrese tipo de pago' }),
	collector: z.string().min(1, { message: 'Ingrese cobrador' })
});
