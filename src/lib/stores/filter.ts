import { writable } from 'svelte/store';

export interface SearchStoreModel<T extends Record<PropertyKey, any>> {
	data: T[];
	filtered: T[];
	search: string | undefined;
	type?: string;
	description?: string;
}

export const createSearchStore = <T extends Record<PropertyKey, any>>(data: T[]) => {
	const { subscribe, set, update } = writable<SearchStoreModel<T>>({
		data: data,
		filtered: data,
		search: '',
		type: '',
		description: ''
	});

	return {
		subscribe,
		set,
		update
	};
};

export const searchHandler = <T extends Record<PropertyKey, any>>(store: SearchStoreModel<T>) => {
	{
		const searchFilter = store.search?.toLowerCase();
		store.filtered = store.data.filter((item) => {
			return item.searchTerms.toLowerCase().includes(searchFilter);
		});
	}
};
