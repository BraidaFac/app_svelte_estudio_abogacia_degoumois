/**
 * Store para filtrado y búsqueda de casos
 * Implementa patrón de búsqueda reactiva
 */

import { writable } from 'svelte/store';

// ============================================
// TYPES
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SearchableItem = Record<string, any> & {
	searchTerms?: string;
};

export interface SearchStoreModel<T extends SearchableItem> {
	data: T[];
	filtered: T[];
	search: string;
}

// ============================================
// STORES
// ============================================

/**
 * Store global para el término de búsqueda
 */
export const filterStore = writable('');

/**
 * Crea un store de búsqueda para una colección de datos
 * @param data - Datos iniciales a filtrar
 * @returns Store con funcionalidad de búsqueda
 */
export function createSearchStore<T extends SearchableItem>(data: T[]) {
	const { subscribe, set, update } = writable<SearchStoreModel<T>>({
		data,
		filtered: data,
		search: ''
	});

	return { subscribe, set, update };
}

/**
 * Manejador de búsqueda que filtra los datos
 * @param store - Estado actual del store de búsqueda
 */
export function searchHandler<T extends SearchableItem>(store: SearchStoreModel<T>): void {
	const searchTerm = store.search?.toLowerCase().trim();

	if (!searchTerm) {
		store.filtered = [];
		return;
	}

	const searchWords = searchTerm.split(/\s+/);

	store.filtered = store.data.filter((item) => {
		const itemSearchTerms = item.searchTerms?.toString().toLowerCase() ?? '';
		return searchWords.every((word) => itemSearchTerms.includes(word));
	});
}
