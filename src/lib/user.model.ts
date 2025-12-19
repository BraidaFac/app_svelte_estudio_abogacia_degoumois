/**
 * Modelo para operaciones de usuarios y autenticación
 * Implementa principios SOLID y tipado estricto
 */

import { JWT_ACCESS_SECRET } from '$env/static/private';
import { db } from '$lib/db';
import type { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// ============================================
// TYPES
// ============================================

interface UserError {
	status: number;
	message: string;
}

interface CreateUserResult {
	user?: { id: number; name: string; role: Role };
	error?: UserError;
}

interface LoginResult {
	token?: string;
	jwtUser?: JwtUserPayload;
	error?: string;
}

interface JwtUserPayload {
	id: number;
	name: string;
	role: Role;
}

// ============================================
// CONSTANTS
// ============================================

const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = '5d';

// ============================================
// PUBLIC FUNCTIONS
// ============================================

/**
 * Crea un nuevo usuario en el sistema
 * @param password - Contraseña en texto plano
 * @param name - Nombre del usuario
 * @returns Objeto con el usuario creado o error
 */
export async function createUser(password: string, name: string): Promise<CreateUserResult> {
	const existingUser = await db.user.findUnique({
		where: { name }
	});

	if (existingUser) {
		return {
			error: { status: 400, message: 'User already exists' }
		};
	}

	try {
		const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
		const user = await db.user.create({
			data: {
				password: hashedPassword,
				name,
				role: 'USER'
			}
		});

		return {
			user: { id: user.id, name: user.name, role: user.role }
		};
	} catch (error) {
		console.error('Error creating user:', error);
		return {
			error: { status: 500, message: 'Could not register user' }
		};
	}
}

/**
 * Autentica un usuario y genera un token JWT
 * @param name - Nombre del usuario
 * @param password - Contraseña en texto plano
 * @returns Token JWT y datos del usuario o error
 */
export async function loginUser(name: string, password: string): Promise<LoginResult> {
	const user = await db.user.findUnique({
		where: { name }
	});

	if (!user) {
		return { error: 'Credenciales incorrectas' };
	}

	const passwordIsValid = await bcrypt.compare(password, user.password);

	if (!passwordIsValid) {
		return { error: 'Credenciales incorrectas' };
	}

	const jwtUser: JwtUserPayload = {
		id: user.id,
		name: user.name,
		role: user.role
	};

	const token = jwt.sign(jwtUser, JWT_ACCESS_SECRET, {
		expiresIn: TOKEN_EXPIRY
	});

	return { token, jwtUser };
}

/**
 * Obtiene todos los usuarios del sistema
 * @returns Lista de usuarios
 */
export async function getUsers() {
	return db.user.findMany();
}

/**
 * Elimina un usuario por su ID
 * @param id - ID del usuario a eliminar
 * @throws Error si el usuario no existe
 */
export async function deleteUser(id: number): Promise<void> {
	const user = await db.user.findUnique({
		where: { id }
	});

	if (!user) {
		throw new Error('User not found');
	}

	await db.user.delete({
		where: { id }
	});
}
