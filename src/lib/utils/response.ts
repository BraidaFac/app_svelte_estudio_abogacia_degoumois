import type { ApiResponse } from '$lib/types/api.types';

/**
 * Parses an ApiResponse from a fetch Response and returns the typed result.
 * Callers handle their own feedback (toast or in-modal message).
 */
export async function handleApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
	const result: ApiResponse<T> = await response.json();
	return result;
}
