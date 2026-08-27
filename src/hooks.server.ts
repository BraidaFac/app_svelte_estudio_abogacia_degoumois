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

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const AUTH_ROUTES = ['/login', '/signup'];

const rateLimitStore = new Map<string, RateLimitEntry>();

export function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds: number } {
	const now = Date.now();
	const entry = rateLimitStore.get(ip);

	if (!entry || now > entry.resetAt) {
		rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
		return { allowed: true, retryAfterSeconds: 0 };
	}

	if (entry.count >= RATE_LIMIT_MAX) {
		const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
		return { allowed: false, retryAfterSeconds };
	}

	entry.count++;
	return { allowed: true, retryAfterSeconds: 0 };
}

// ============================================
// HANDLE HOOK
// ============================================

/**
 * Hook principal que verifica la autenticación del usuario
 */
export const handle: Handle = async ({ event, resolve }) => {
	// Rate limiting en rutas de auth (solo en métodos POST)
	const isAuthRoute = AUTH_ROUTES.some((route) => event.url.pathname.startsWith(route));
	if (isAuthRoute && event.request.method === 'POST') {
		const ip = event.getClientAddress();
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
