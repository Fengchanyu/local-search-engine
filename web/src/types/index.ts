export interface SearchResult {
  path: string;
  name: string;
  size: number;
  modifiedTime: string;
  createdTime: string;
  extension: string;
  isDirectory: boolean;
}

export interface ContentSearchResult extends SearchResult {
  matches: ContentMatch[];
}

export interface ContentMatch {
  lineNumber: number;
  lineContent: string;
  matchStart: number;
  matchEnd: number;
}

export interface SearchOptions {
  query: string;
  matchMode: 'exact' | 'fuzzy' | 'wildcard';
  caseSensitive: boolean;
  maxResults: number;
}

export interface FilterOptions {
  sizeRange?: {
    min: number;
    max: number;
  };
  dateRange?: {
    start: Date;
    end: Date;
  };
  extensions?: string[];
  directory?: string;
}

export type SortOption = 'relevance' | 'name' | 'path' | 'size' | 'modifiedTime' | 'createdTime';
export type SortOrder = 'asc' | 'desc';

export interface IndexStatus {
  totalFiles: number;
  indexedFiles: number;
  progress: number;
  isIndexing: boolean;
  isPaused: boolean;
  lastUpdateTime: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export type ViewMode = 'list' | 'grid' | 'table';

export type Theme = 'light' | 'dark' | 'system';

export interface AppState {
  searchResults: SearchResult[];
  isLoading: boolean;
  error: string | null;
  searchOptions: SearchOptions;
  filterOptions: FilterOptions;
  viewMode: ViewMode;
  selectedItems: string[];
}
