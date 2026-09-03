import { untrack } from 'svelte';

type SortDir = 'asc' | 'desc';

export type TableStore<T extends object = object> = ReturnType<typeof createTableStore<T>>;

function parseDDMMYYYY(s: string): Date | null {
	const m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
	if (!m) return null;
	return new Date(+m[3], +m[2] - 1, +m[1]);
}

function compareValues(a: unknown, b: unknown): number {
	if (a == null && b == null) return 0;
	if (a == null) return 1;  // nulls al final
	if (b == null) return -1;
	if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
	if (typeof a === 'number' && typeof b === 'number') return a - b;
	if (typeof a === 'string' && typeof b === 'string') {
		const da = parseDDMMYYYY(a);
		const db = parseDDMMYYYY(b);
		if (da && db) return da.getTime() - db.getTime();
		return a.localeCompare(b, 'es');
	}
	return String(a).localeCompare(String(b), 'es');
}

/**
 * Reactive table store for filter + sort + pagination.
 * Must be called during component initialization (script context).
 */
export function createTableStore<T extends object>(
	getItems: () => T[],
	initialPageSize = 25,
	defaultSortKey = '',
	defaultSortDir: SortDir = 'asc'
) {
	let search = $state('');
	let sortKey = $state(defaultSortKey);
	let sortDir = $state<SortDir>(defaultSortDir);
	let page = $state(1);
	let pageSize = $state(initialPageSize);

	const filtered = $derived.by(() => {
		const term = search.toLowerCase().trim();
		const items = getItems();
		if (!term) return items;
		const words = term.split(/\s+/);
		return items.filter((item) => {
			const rec = item as Record<string, unknown>;
			const terms = (
				(rec.searchTerms as string | undefined) ?? Object.values(rec).join(' ')
			).toLowerCase();
			return words.every((w) => terms.includes(w));
		});
	});

	const sorted = $derived.by(() => {
		if (!sortKey) return filtered;
		return [...filtered].sort((a, b) => {
			const ra = a as Record<string, unknown>;
			const rb = b as Record<string, unknown>;
			const cmp = compareValues(ra[sortKey], rb[sortKey]);
			return sortDir === 'asc' ? cmp : -cmp;
		});
	});

	const totalFiltered = $derived(filtered.length);
	const totalPages = $derived(Math.max(1, Math.ceil(sorted.length / pageSize)));
	const paginatedItems = $derived(sorted.slice((page - 1) * pageSize, page * pageSize));
	const isDefaultSort = $derived(sortKey === defaultSortKey && sortDir === defaultSortDir);

	// Reset to page 1 on filter/sort/pageSize change
	$effect.pre(() => {
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		search; sortKey; sortDir; pageSize;
		untrack(() => { page = 1; });
	});

	function goToPage(p: number) {
		page = Math.max(1, Math.min(p, totalPages));
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function toggleSort(key: string) {
		if (sortKey === key) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = key;
			sortDir = 'asc';
		}
	}

	function resetSort() {
		sortKey = defaultSortKey;
		sortDir = defaultSortDir;
	}

	return {
		get search() { return search; },
		set search(v: string) { search = v; },
		get sortKey() { return sortKey; },
		get sortDir() { return sortDir; },
		get page() { return page; },
		get pageSize() { return pageSize; },
		set pageSize(v: number) { pageSize = v; },
		get filtered() { return filtered; },
		get paginatedItems() { return paginatedItems; },
		get totalFiltered() { return totalFiltered; },
		get totalPages() { return totalPages; },
		get isDefaultSort() { return isDefaultSort; },
		goToPage,
		toggleSort,
		resetSort
	};
}
