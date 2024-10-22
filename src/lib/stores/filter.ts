import { writable } from 'svelte/store';

export interface SearchStoreModel<T extends Record<PropertyKey, string | number>> {
	data: T[];
	filtered: T[];
	search: string | undefined;
	rubro?: string;
	descripcion?: string;
	marca?: string;
}

// Store para el filtro (búsqueda)
export const filterStore = writable('');

// Crear store de búsqueda
export const createSearchStore = <T extends Record<PropertyKey, string | number>>(data: T[]) => {
	const { subscribe, set, update } = writable<SearchStoreModel<T>>({
		data: data,
		filtered: data,
		search: '',
		rubro: '',
		marca: ''
	});

	return {
		subscribe,
		set,
		update
	};
};

// Manejador de búsqueda
export const searchHandler = <T extends Record<PropertyKey, string | number>>(
	store: SearchStoreModel<T>
) => {
	const searchTerm: string | undefined = store.search?.toLowerCase();

	if (searchTerm) {
		const filterSearchSplited = searchTerm.split(' ');
		store.filtered = store.data.filter((item) => {
			let counter = 0;
			filterSearchSplited.forEach((word) => {
				// Supongo que tienes una propiedad `searchTerms` en el objeto `item`
				if (item.searchTerms?.toString().toLowerCase().includes(word)) {
					counter++;
				}
			});

			// Filtrar solo si todas las palabras coinciden
			return counter === filterSearchSplited.length;
		});
	} else {
		// Si no hay búsqueda, restaurar todos los datos
		store.filtered = [];
	}
};
