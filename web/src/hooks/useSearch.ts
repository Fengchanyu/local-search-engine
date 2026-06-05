import { useState, useCallback } from 'react';
import { SearchResult, SearchOptions, FilterOptions, SortOption, SortOrder } from '@/types';
import { searchFiles, searchContent } from '@/utils/api';

interface UseSearchOptions {
  initialQuery?: string;
  initialOptions?: Partial<SearchOptions>;
  initialFilters?: Partial<FilterOptions>;
  initialSort?: SortOption;
  initialSortOrder?: SortOrder;
}

interface UseSearchReturn {
  results: SearchResult[];
  isLoading: boolean;
  error: string | null;
  query: string;
  options: SearchOptions;
  filters: FilterOptions;
  sort: SortOption;
  sortOrder: SortOrder;
  totalResults: number;
  hasMore: boolean;
  search: (newQuery: string) => Promise<void>;
  searchContent: (newQuery: string) => Promise<void>;
  setOptions: (newOptions: Partial<SearchOptions>) => void;
  setFilters: (newFilters: Partial<FilterOptions>) => void;
  setSort: (newSort: SortOption) => void;
  setSortOrder: (newOrder: SortOrder) => void;
  loadMore: () => Promise<void>;
  clearResults: () => void;
  reset: () => void;
}

export function useSearch({
  initialQuery = '',
  initialOptions = {},
  initialFilters = {},
  initialSort = 'relevance',
  initialSortOrder = 'desc',
}: UseSearchOptions = {}): UseSearchReturn {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [options, setOptionsState] = useState<SearchOptions>({
    query: initialQuery,
    matchMode: initialOptions.matchMode || 'fuzzy',
    caseSensitive: initialOptions.caseSensitive || false,
    maxResults: initialOptions.maxResults || 100,
  });
  const [filters, setFiltersState] = useState<FilterOptions>(initialFilters);
  const [sort, setSortState] = useState<SortOption>(initialSort);
  const [sortOrder, setSortOrderState] = useState<SortOrder>(initialSortOrder);
  const [totalResults, setTotalResults] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  const search = useCallback(async (newQuery: string) => {
    if (!newQuery.trim()) {
      setResults([]);
      setTotalResults(0);
      setHasMore(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setQuery(newQuery);
    setCurrentPage(0);

    try {
      const data = await searchFiles({
        query: newQuery,
        matchMode: options.matchMode,
        caseSensitive: options.caseSensitive,
        maxResults: options.maxResults,
      });

      setResults(data);
      setTotalResults(data.length);
      setHasMore(data.length >= options.maxResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : '搜索时发生错误');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  const searchContentHandler = useCallback(async (newQuery: string) => {
    if (!newQuery.trim()) {
      setResults([]);
      setTotalResults(0);
      setHasMore(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setQuery(newQuery);
    setCurrentPage(0);

    try {
      const data = await searchContent({
        query: newQuery,
        matchMode: options.matchMode,
        caseSensitive: options.caseSensitive,
        maxResults: options.maxResults,
      });

      setResults(data);
      setTotalResults(data.length);
      setHasMore(data.length >= options.maxResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : '搜索时发生错误');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading || !query) return;

    setIsLoading(true);
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);

    try {
      const data = await searchFiles({
        query,
        matchMode: options.matchMode,
        caseSensitive: options.caseSensitive,
        maxResults: options.maxResults,
        offset: nextPage * options.maxResults,
      });

      setResults(prev => [...prev, ...data]);
      setHasMore(data.length >= options.maxResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载更多失败');
    } finally {
      setIsLoading(false);
    }
  }, [hasMore, isLoading, query, currentPage, options]);

  const setOptions = useCallback((newOptions: Partial<SearchOptions>) => {
    setOptionsState(prev => ({ ...prev, ...newOptions }));
  }, []);

  const setFilters = useCallback((newFilters: Partial<FilterOptions>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const setSort = useCallback((newSort: SortOption) => {
    setSortState(newSort);
  }, []);

  const setSortOrder = useCallback((newOrder: SortOrder) => {
    setSortOrderState(newOrder);
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setTotalResults(0);
    setHasMore(false);
    setError(null);
    setQuery('');
    setCurrentPage(0);
  }, []);

  const reset = useCallback(() => {
    clearResults();
    setOptionsState({
      query: '',
      matchMode: 'fuzzy',
      caseSensitive: false,
      maxResults: 100,
    });
    setFiltersState({});
    setSortState('relevance');
    setSortOrderState('desc');
  }, [clearResults]);

  return {
    results,
    isLoading,
    error,
    query,
    options,
    filters,
    sort,
    sortOrder,
    totalResults,
    hasMore,
    search,
    searchContent: searchContentHandler,
    setOptions,
    setFilters,
    setSort,
    setSortOrder,
    loadMore,
    clearResults,
    reset,
  };
}
