import { useSearchParams } from 'react-router-dom';

interface ListStateOptions<T> {
  initialSortBy: keyof T | string;
  initialSortOrder?: 'asc' | 'desc';
  pageSize?: number;
}

interface ListState {
  page: number;
  pageSize: number;
  searchTerm: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  filter: string;
  year: string;
}

export const useListState = <T extends Record<string, any>>(options: ListStateOptions<T>) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const state: ListState = {
    page: parseInt(searchParams.get('page') || '1'),
    pageSize: parseInt(searchParams.get('pageSize') || String(options.pageSize || 10)),
    searchTerm: searchParams.get('search') || '',
    sortBy: searchParams.get('sortBy') || (options.initialSortBy as string),
    sortOrder: (searchParams.get('order') as 'asc' | 'desc') || options.initialSortOrder || 'asc',
    filter: searchParams.get('filter') || 'all',
    year: searchParams.get('year') || '',
  };

  const updateParams = (updates: Partial<ListState>) => {
    const newParams = new URLSearchParams(searchParams);
    
    if (updates.page !== undefined) newParams.set('page', updates.page.toString());
    if (updates.pageSize !== undefined) {
      newParams.set('pageSize', updates.pageSize.toString());
      newParams.set('page', '1');
    }
    
    if (updates.searchTerm !== undefined) {
      if (updates.searchTerm) newParams.set('search', updates.searchTerm);
      else newParams.delete('search');
      newParams.set('page', '1');
    }
    
    if (updates.sortBy !== undefined) newParams.set('sortBy', updates.sortBy);
    if (updates.sortOrder !== undefined) newParams.set('order', updates.sortOrder);
    
    if (updates.filter !== undefined) {
      if (updates.filter !== 'all') newParams.set('filter', updates.filter);
      else newParams.delete('filter');
      newParams.set('page', '1');
    }

    if (updates.year !== undefined) {
      if (updates.year) newParams.set('year', updates.year);
      else newParams.delete('year');
      newParams.set('page', '1');
    }

    setSearchParams(newParams);
  };

  const setPage = (page: number) => updateParams({ page });
  const setPageSize = (pageSize: number) => updateParams({ pageSize });
  const setSearchTerm = (searchTerm: string) => updateParams({ searchTerm });
  const setSort = (column: string) => {
    const isAsc = state.sortBy === column && state.sortOrder === 'asc';
    updateParams({ sortBy: column, sortOrder: isAsc ? 'desc' : 'asc' });
  };
  const setFilter = (filter: string) => updateParams({ filter });
  const setYear = (year: string) => updateParams({ year });

  const processList = (items: T[], customFilter?: (item: T, filter: string) => boolean) => {
    let result = [...items];

    // 1. Category Filter
    if (customFilter) {
      result = result.filter(item => customFilter(item, state.filter));
    }

    // 2. Search
    if (state.searchTerm) {
      const search = state.searchTerm.toLowerCase();
      result = result.filter(item => {
        return Object.values(item).some(val => {
          if (typeof val === 'string') return val.toLowerCase().includes(search);
          if (typeof val === 'object' && val !== null) {
            return Object.values(val).some(v => typeof v === 'string' && v.toLowerCase().includes(search));
          }
          return false;
        });
      });
    }

    // 3. Sort
    result.sort((a, b) => {
      const { sortBy, sortOrder } = state;
      const getNestedValue = (obj: any, path: string) => {
        try {
          return path.split('.').reduce((acc, part) => acc && acc[part], obj);
        } catch (e) {
          return undefined;
        }
      };

      const valA = getNestedValue(a, sortBy as string);
      const valB = getNestedValue(b, sortBy as string);

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      const comparison = valA < valB ? -1 : 1;
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // 4. Pagination
    const { page, pageSize } = state;
    const totalItems = result.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const currentPage = Math.min(page, totalPages || 1);

    const paginatedItems = result.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    );

    return {
      items: paginatedItems,
      totalItems,
      totalPages,
      currentPage,
      pageSize
    };
  };

  return { state, setPage, setPageSize, setSearchTerm, setSort, setFilter, setYear, processList };
};
