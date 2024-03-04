// See https://kit.svelte.dev/docs/types#app

import type { Role } from '@prisma/client';

// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user?: {
				id: number;
				name: string;
				role: Role;
			};
		}

		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
