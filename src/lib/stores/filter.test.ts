import { describe, it, expect } from 'vitest';
import { createSearchStore, searchHandler } from './filter';

describe('searchHandler', () => {
  const mockData = [
    { id: 1, searchTerms: 'García civil' },
    { id: 2, searchTerms: 'López penal' },
  ];

  it('muestra todos los items cuando la búsqueda está vacía', () => {
    const store = { data: mockData, filtered: [], search: '' };
    searchHandler(store);
    expect(store.filtered).toEqual(mockData);
  });

  it('filtra correctamente cuando hay término de búsqueda', () => {
    const store = { data: mockData, filtered: [], search: 'García' };
    searchHandler(store);
    expect(store.filtered).toHaveLength(1);
    expect(store.filtered[0].id).toBe(1);
  });

  it('filtra por múltiples palabras (todas deben coincidir)', () => {
    const store = { data: mockData, filtered: [], search: 'García civil' };
    searchHandler(store);
    expect(store.filtered).toHaveLength(1);
  });

  it('retorna vacío si ningún item coincide', () => {
    const store = { data: mockData, filtered: [], search: 'xyz' };
    searchHandler(store);
    expect(store.filtered).toHaveLength(0);
  });
});
