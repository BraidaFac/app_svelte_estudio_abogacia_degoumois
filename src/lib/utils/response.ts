import { toaster } from '$lib/stores/toast';
import type { ApiResponse } from '$lib/types/api.types';

/**
 * Parses an ApiResponse from a fetch Response, shows a toast notification,
 * and returns the typed result. Centralizes all feedback logic.
 */
export async function handleApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
	const result: ApiResponse<T> = await response.json();
	if (result.success) {
		toaster.success({ title: result.message ?? 'Operación realizada correctamente.' });
	} else {
		toaster.error({ title: result.error.message });
	}
	return result;
}
