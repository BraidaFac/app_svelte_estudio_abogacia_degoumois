import type { ApiResponse } from '$lib/types/api.types';

// ============================================
// ERROR CODES
// ============================================

export const ApiErrors = {
	VALIDATION: 'VALIDATION_ERROR',
	UNAUTHORIZED: 'UNAUTHORIZED',
	NOT_FOUND: 'NOT_FOUND',
	SERVER_ERROR: 'SERVER_ERROR'
} as const;

// ============================================
// RESPONSE HELPERS
// ============================================

export function apiSuccess<T>(data: T, message?: string, status = 200): Response {
	const body: ApiResponse<T> = { success: true, data, ...(message && { message }) };
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

export function apiError(code: string, message: string, status = 400): Response {
	const body: ApiResponse<never> = { success: false, error: { code, message } };
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

/** @deprecated use apiError instead */
export function createErrorResponse(message: string, status: number): Response {
	return new Response(JSON.stringify({ error: message }), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}
