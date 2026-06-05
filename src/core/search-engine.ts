import { 
  SearchResult, 
  SearchOptions, 
  ContentSearchResult, 
  ContentSearchOptions,
  ContentMatch,
  RegexSearchOptions,
  FilterOptions,
  SortOption,
  SortOrder,
  FileEntry,
  Logger,
  DEFAULT_SEARCH_OPTIONS,
  DEFAULT_CONTENT_SEARCH_OPTIONS,
  TEXT_EXTENSIONS
} from '../types';
import { IndexDatabase } from '../database/index-database';
import * as fs from 'fs';
import * as iconv from 'iconv-lite';
import * as jschardet from 'jschardet';

export class SearchEngine {
  private db: IndexDatabase;
  private logger: Logger;

  constructor(db: IndexDatabase, logger: Logger) {
    this.db = db;
    this.logger = logger;
  }

  async searchByName(query: string, options: Partial<SearchOptions> = {}): Promise<SearchResult[]> {
    const opts = { ...DEFAULT_SEARCH_OPTIONS, ...options };
    const startTime = Date.now();

    await this.db.initialize();

    let entries: FileEntry[];

    if (!query || query.trim() === '') {
      entries = this.db.filterFiles({ maxResults: opts.maxResults });
    } else {
      entries = this.db.searchByName(
        opts.caseSensitive ? query : query.toLowerCase(),
        opts.caseSensitive,
        opts.matchMode,
        opts.maxResults
      );
    }

    const results = entries.map(entry => this.entryToResult(entry));
    
    const elapsed = Date.now() - startTime;
    this.logger.debug('Search completed', { query, elapsed, results: results.length });

    return results;
  }

  async searchByContent(query: string, options: Partial<ContentSearchOptions> = {}): Promise<ContentSearchResult[]> {
    const opts = { ...DEFAULT_CONTENT_SEARCH_OPTIONS, ...options };
    const startTime = Date.now();
    const results: ContentSearchResult[] = [];

    await this.db.initialize();

    const fileEntries = this.db.filterFiles({
      extensions: opts.fileExtensions,
      maxResults: 10000
    });

    for (const entry of fileEntries) {
      if (results.length >= opts.maxResults) break;
      if (entry.isDirectory) continue;
      if (entry.size > 10 * 1024 * 1024) continue;

      try {
        const matches = this.searchInFile(entry.path, query, opts);
        if (matches.length > 0) {
          results.push({
            ...this.entryToResult(entry),
            matches
          });
        }
      } catch (error) {
        this.logger.debug('Failed to search in file', { path: entry.path, error });
      }
    }

    const elapsed = Date.now() - startTime;
    this.logger.debug('Content search completed', { query, elapsed, results: results.length });

    return results;
  }

  async searchByRegex(pattern: string, options: Partial<RegexSearchOptions> = {}): Promise<SearchResult[]> {
    const opts = { ...DEFAULT_SEARCH_OPTIONS, ...options };
    const startTime = Date.now();

    await this.db.initialize();

    let regex: RegExp;
    try {
      regex = new RegExp(pattern, opts.flags || (opts.caseSensitive ? '' : 'i'));
    } catch (error) {
      throw new Error(`Invalid regular expression: ${error}`);
    }

    const entries = this.db.searchByRegex(pattern, opts.flags || '', opts.maxResults);
    const results = entries.map(entry => this.entryToResult(entry));

    const elapsed = Date.now() - startTime;
    this.logger.debug('Regex search completed', { pattern, elapsed, results: results.length });

    return results;
  }

  filterResults(results: SearchResult[], filters: FilterOptions): SearchResult[] {
    return results.filter(result => {
      if (filters.sizeRange) {
        if (result.size < filters.sizeRange.min || result.size > filters.sizeRange.max) {
          return false;
        }
      }

      if (filters.dateRange) {
        const modifiedTime = result.modifiedTime.getTime();
        if (modifiedTime < filters.dateRange.start.getTime() || 
            modifiedTime > filters.dateRange.end.getTime()) {
          return false;
        }
      }

      if (filters.extensions && filters.extensions.length > 0) {
        if (!filters.extensions.includes(result.extension)) {
          return false;
        }
      }

      if (filters.directory) {
        if (!result.path.startsWith(filters.directory)) {
          return false;
        }
      }

      if (filters.isDirectory !== undefined) {
        if (result.isDirectory !== filters.isDirectory) {
          return false;
        }
      }

      return true;
    });
  }

  sortResults(results: SearchResult[], sortBy: SortOption, order: SortOrder = 'asc'): SearchResult[] {
    const startTime = Date.now();
    
    const sorted = [...results].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'path':
          comparison = a.path.localeCompare(b.path);
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'modifiedTime':
          comparison = a.modifiedTime.getTime() - b.modifiedTime.getTime();
          break;
        case 'createdTime':
          comparison = a.createdTime.getTime() - b.createdTime.getTime();
          break;
        case 'relevance':
        default:
          comparison = 0;
          break;
      }

      return order === 'asc' ? comparison : -comparison;
    });

    const elapsed = Date.now() - startTime;
    this.logger.debug('Sort completed', { sortBy, order, elapsed, count: results.length });

    return sorted;
  }

  private searchInFile(filePath: string, query: string, options: ContentSearchOptions): ContentMatch[] {
    const buffer = fs.readFileSync(filePath);
    const encoding = this.detectEncoding(buffer, options.encoding);
    const content = iconv.decode(buffer, encoding);
    const lines = content.split('\n');
    const matches: ContentMatch[] = [];

    const searchQuery = options.caseSensitive ? query : query.toLowerCase();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const searchLine = options.caseSensitive ? line : line.toLowerCase();

      if (searchLine.includes(searchQuery)) {
        const contextBefore = lines.slice(Math.max(0, i - options.contextLines), i);
        const contextAfter = lines.slice(i + 1, Math.min(lines.length, i + 1 + options.contextLines));

        matches.push({
          lineNumber: i + 1,
          lineContent: line,
          contextBefore,
          contextAfter
        });
      }
    }

    return matches;
  }

  private detectEncoding(buffer: Buffer, preferredEncoding: string): string {
    if (preferredEncoding !== 'auto') {
      return preferredEncoding;
    }

    try {
      const detected = jschardet.detect(buffer);
      if (detected.encoding && detected.confidence > 0.7) {
        const encoding = detected.encoding.toLowerCase();
        if (encoding === 'ascii') return 'utf-8';
        if (encoding === 'gb2312' || encoding === 'gbk') return 'gbk';
        return encoding;
      }
    } catch {
      // Detection failed, use utf-8
    }

    return 'utf-8';
  }

  private entryToResult(entry: FileEntry): SearchResult {
    return {
      path: entry.path,
      name: entry.name,
      size: entry.size,
      modifiedTime: new Date(entry.modifiedTime),
      createdTime: new Date(entry.createdTime),
      extension: entry.extension,
      isDirectory: entry.isDirectory === 1
    };
  }

  static isTextFile(extension: string): boolean {
    return TEXT_EXTENSIONS.has(extension.toLowerCase());
  }
}
