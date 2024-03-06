import { db } from '$lib/db';
import { JWT_ACCESS_SECRET } from '$env/static/private';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
const createUser = async (password: string, name: string) => {
	// Check if user exists
	const user = await db.user.findUnique({
		where: {
			name
		}
	});

	if (user) {
		return {
			error: {
				status: 400,
				message: 'User already exists'
			}
		};
	}

	try {
		const user = await db.user.create({
			data: {
				password: await bcrypt.hash(password, 10),
				name,
				role: 'USER'
			}
		});

		return { user };
	} catch (error) {
		return {
			error: {
				status: 500,
				message: 'Could not register user'
			}
		};
	}
};

const loginUser = async (name: string, password: string) => {
	// Check if user exists
	const user = await db.user.findUnique({
		where: {
			name
		}
	});

	if (!user) {
		return {
			error: 'Credenciales incorrectas'
		};
	}

	// Verify the password
	const passwordIsValid = await bcrypt.compare(password, user.password);

	if (!passwordIsValid) {
		return {
			error: 'Credenciales incorrectas'
		};
	}

	const jwtUser = {
		id: user.id,
		name: user.name,
		role: user.role
	};

	const token = jwt.sign(jwtUser, JWT_ACCESS_SECRET, {
		expiresIn: '5d'
	});

	return { token, jwtUser };
};
const getUsers = async () => {
	const users = await db.user.findMany();
	return users;
};
const deleteUser = async (id: number) => {
	const user = await db.user.findUnique({
		where: { id }
	});
	if (!user) {
		throw new Error('User not found');
	}
	await db.user.delete({
		where: { id }
	});
};
export { createUser, loginUser, getUsers, deleteUser };
