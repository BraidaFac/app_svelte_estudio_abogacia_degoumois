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

// ============================================
// RATE LIMITING
// ============================================

interface RateLimitEntry {
	count: number;
	resetAt: number;
}

const AUTH_ROUTES = ['/login', '/signup'];

function makeRateLimiter(max: number, windowMs: number) {
	const store = new Map<string, RateLimitEntry>();
	return function check(ip: string): { allowed: boolean; retryAfterSeconds: number } {
		const now = Date.now();
		const entry = store.get(ip);
		if (!entry || now > entry.resetAt) {
			store.set(ip, { count: 1, resetAt: now + windowMs });
			return { allowed: true, retryAfterSeconds: 0 };
		}
		if (entry.count >= max) {
			return { allowed: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
		}
		entry.count++;
		return { allowed: true, retryAfterSeconds: 0 };
	};
}

// Auth: 10 intentos / 15 min (fuerza bruta)
export const checkRateLimit = makeRateLimiter(10, 15 * 60 * 1000);

// Global: 120 req / min por IP (protección VPS)
const checkGlobalLimit = makeRateLimiter(120, 60 * 1000);

// ============================================
// HANDLE HOOK
// ============================================

/**
 * Hook principal que verifica la autenticación del usuario
 */
export const handle: Handle = async ({ event, resolve }) => {
	const ip = event.getClientAddress();

	// Límite global: 120 req/min por IP
	const global = checkGlobalLimit(ip);
	if (!global.allowed) {
		return new Response(JSON.stringify({ error: 'Demasiadas solicitudes. Intente más tarde.' }), {
			status: 429,
			headers: {
				'Content-Type': 'application/json',
				'Retry-After': String(global.retryAfterSeconds)
			}
		});
	}

	// Límite estricto en auth: 10 intentos / 15 min
	const isAuthRoute = AUTH_ROUTES.some((route) => event.url.pathname.startsWith(route));
	if (isAuthRoute && event.request.method === 'POST') {
		const { allowed, retryAfterSeconds } = checkRateLimit(ip);
		if (!allowed) {
			return new Response(JSON.stringify({ error: 'Demasiados intentos. Intente más tarde.' }), {
				status: 429,
				headers: {
					'Content-Type': 'application/json',
					'Retry-After': String(retryAfterSeconds)
				}
			});
		}
	}

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
