export interface SearchOptions {
  caseSensitive: boolean;
  matchMode: 'exact' | 'fuzzy' | 'wildcard';
  maxResults: number;
}

export interface SearchResult {
  path: string;
  name: string;
  size: number;
  modifiedTime: Date;
  createdTime: Date;
  extension: string;
  isDirectory: boolean;
}

export interface ContentSearchOptions extends SearchOptions {
  fileExtensions: string[];
  contextLines: number;
  encoding: 'auto' | 'utf-8' | 'gbk' | 'gb2312';
}

export interface ContentSearchResult extends SearchResult {
  matches: ContentMatch[];
}

export interface ContentMatch {
  lineNumber: number;
  lineContent: string;
  contextBefore: string[];
  contextAfter: string[];
}

export interface RegexSearchOptions extends SearchOptions {
  searchTarget: 'filename' | 'content';
  flags: string;
}

export interface FilterOptions {
  sizeRange?: { min: number; max: number };
  dateRange?: { start: Date; end: Date };
  extensions?: string[];
  directory?: string;
  isDirectory?: boolean;
}

export type SortOption = 'relevance' | 'name' | 'path' | 'size' | 'modifiedTime' | 'createdTime';
export type SortOrder = 'asc' | 'desc';

export interface IndexStatus {
  totalFiles: number;
  indexedFiles: number;
  progress: number;
  isPaused: boolean;
  isIndexing: boolean;
  lastUpdateTime: Date;
}

export interface FileEntry {
  id?: number;
  path: string;
  name: string;
  extension: string;
  size: number;
  createdTime: number;
  modifiedTime: number;
  isDirectory: number;
}

export interface IndexConfig {
  includePaths: string[];
  excludePaths: string[];
  excludePatterns: string[];
  maxFileSize: number;
  indexContent: boolean;
}

export interface PreviewContent {
  type: 'text' | 'image' | 'unsupported';
  content: string | Buffer;
  language?: string;
}

export interface Logger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
}

export const DEFAULT_SEARCH_OPTIONS: SearchOptions = {
  caseSensitive: false,
  matchMode: 'fuzzy',
  maxResults: 1000
};

export const DEFAULT_CONTENT_SEARCH_OPTIONS: ContentSearchOptions = {
  ...DEFAULT_SEARCH_OPTIONS,
  fileExtensions: ['.txt', '.md', '.json', '.xml', '.html', '.css', '.js', '.ts', '.py', '.java', '.c', '.cpp', '.h', '.sh', '.bat', '.log'],
  contextLines: 2,
  encoding: 'auto'
};

export const DEFAULT_INDEX_CONFIG: IndexConfig = {
  includePaths: [],
  excludePaths: [
    '/proc',
    '/sys',
    '/dev',
    'C:\\Windows\\System32\\config',
    'C:\\$Recycle.Bin',
    '/.Trash',
    '/.Spotlight',
    '/node_modules',
    '/.git',
    '/.svn'
  ],
  excludePatterns: [
    '*.tmp',
    '*.temp',
    '*.log',
    '~$*',
    '.DS_Store',
    'Thumbs.db'
  ],
  maxFileSize: 10 * 1024 * 1024,
  indexContent: false
};

export const TEXT_EXTENSIONS = new Set([
  '.txt', '.md', '.markdown', '.json', '.xml', '.html', '.htm',
  '.css', '.scss', '.sass', '.less',
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.py', '.pyw', '.pyi',
  '.java', '.kt', '.kts', '.scala',
  '.c', '.cpp', '.cc', '.cxx', '.h', '.hpp', '.hxx',
  '.cs', '.vb', '.fs',
  '.go', '.rs', '.swift', '.kt',
  '.rb', '.php', '.pl', '.pm',
  '.sh', '.bash', '.zsh', '.fish', '.bat', '.cmd', '.ps1',
  '.sql', '.ddl', '.dml',
  '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf', '.config',
  '.csv', '.tsv',
  '.log', '.env', '.gitignore', '.dockerignore',
  '.vue', '.svelte',
  '.astro', '.graphql', '.gql'
]);

export const PERFORMANCE_TARGETS = {
  SEARCH_RESPONSE_TIME_MS: 100,
  COLD_START_TIME_MS: 3000,
  CONTENT_SEARCH_TIME_MS: 2000,
  REGEX_SEARCH_TIME_MS: 500,
  SORT_TIME_MS: 50,
  INDEX_BUILD_TIME_MINUTES: 10,
  INDEX_UPDATE_DELAY_MS: 5000,
  INDEX_LOAD_TIME_MS: 3000,
  MAX_INDEX_SIZE_MB: 500,
  MAX_IDLE_MEMORY_MB: 50,
  MAX_SEARCH_MEMORY_MB: 200,
  MAX_IDLE_CPU_PERCENT: 1,
  MAX_INDEX_CPU_PERCENT: 30
};
