import { describe, it, expect } from 'vitest';

// Mock SvelteKit virtual modules and dependencies before importing hooks
vi.mock('$env/dynamic/private', () => ({ env: { JWT_ACCESS_SECRET: 'test-secret' } }));
vi.mock('$lib/db', () => ({ db: { user: { findUnique: vi.fn() } } }));
vi.mock('jsonwebtoken', () => ({ default: { verify: vi.fn() } }));

import { vi } from 'vitest';
import { checkRateLimit } from './hooks.server';

describe('checkRateLimit', () => {
	it('permite el primer intento', () => {
		const result = checkRateLimit('1.2.3.4');
		expect(result.allowed).toBe(true);
		expect(result.retryAfterSeconds).toBe(0);
	});

	it('bloquea después de 10 intentos', () => {
		const ip = '5.6.7.8';
		for (let i = 0; i < 10; i++) checkRateLimit(ip);
		const result = checkRateLimit(ip);
		expect(result.allowed).toBe(false);
		expect(result.retryAfterSeconds).toBeGreaterThan(0);
	});

	it('permite intentos hasta el límite', () => {
		const ip = '9.10.11.12';
		for (let i = 0; i < 9; i++) {
			const result = checkRateLimit(ip);
			expect(result.allowed).toBe(true);
		}
		// El 10mo intento aún debe ser permitido (límite es 10)
		const tenthResult = checkRateLimit(ip);
		expect(tenthResult.allowed).toBe(true);
		// El 11mo debe ser bloqueado
		const blockedResult = checkRateLimit(ip);
		expect(blockedResult.allowed).toBe(false);
	});
});
