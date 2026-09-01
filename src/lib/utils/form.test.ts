import { describe, it, expect } from 'vitest';
import { z, ZodError } from 'zod';
import { validateOrThrow, manageFormError } from './form';

const schema = z.object({
	name: z.string().min(1),
	amount: z.string().min(1)
});

describe('validateOrThrow', () => {
	it('no lanza si los datos son válidos', () => {
		expect(() => validateOrThrow({ name: 'García', amount: '100' }, schema)).not.toThrow();
	});

	it('lanza ZodError si faltan campos requeridos', () => {
		expect(() => validateOrThrow({ name: '', amount: '100' }, schema)).toThrow(ZodError);
	});
});

describe('manageFormError', () => {
	it('retorna fieldErrors si el error es ZodError', () => {
		try {
			schema.parse({ name: '', amount: '' });
		} catch (error) {
			const result = manageFormError(error);
			expect(result).toHaveProperty('name');
		}
	});

	it('retorna objeto vacío si el error no es ZodError', () => {
		const result = manageFormError(new Error('otro error'));
		expect(result).toEqual({});
	});
});
