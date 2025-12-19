/**
 * Server hooks para autenticación y manejo de sesiones
 */

import { JWT_ACCESS_SECRET } from '$env/static/private';
import { db } from '$lib/db';
import type { Role } from '@prisma/client';
import type { Handle } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';

interface JwtPayload {
	id: number;
	name: string;
	role: Role;
}

/**
 * Hook principal que verifica la autenticación del usuario
 */
export const handle: Handle = async ({ event, resolve }) => {
	const authCookie = event.cookies.get('AuthorizationToken');

	if (authCookie) {
		const token = extractToken(authCookie);

		try {
			const jwtUser = verifyToken(token);
			const user = await findUser(jwtUser.id);

			if (user) {
				event.locals.user = {
					id: user.id,
					name: user.name,
					role: user.role
				};
			}
		} catch (error) {
			console.error('Authentication error:', error);
			// Token inválido o usuario no encontrado - continuar sin usuario
		}
	}

	return resolve(event);
};

/**
 * Extrae el token del header Bearer
 */
function extractToken(authHeader: string): string {
	return authHeader.split(' ')[1];
}

/**
 * Verifica y decodifica el token JWT
 */
function verifyToken(token: string): JwtPayload {
	const decoded = jwt.verify(token, JWT_ACCESS_SECRET);

	if (typeof decoded === 'string') {
		throw new Error('Invalid token format');
	}

	return decoded as JwtPayload;
}

/**
 * Busca un usuario por ID
 */
async function findUser(id: number) {
	return db.user.findUnique({
		where: { id }
	});
}
