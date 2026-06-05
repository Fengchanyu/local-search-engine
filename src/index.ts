import * as path from 'path';
import * as fs from 'fs';
import { EventEmitter } from 'events';
import { 
  SearchResult, 
  SearchOptions, 
  ContentSearchResult, 
  ContentSearchOptions,
  RegexSearchOptions,
  FilterOptions,
  SortOption,
  SortOrder,
  IndexStatus,
  IndexConfig,
  Logger,
  DEFAULT_SEARCH_OPTIONS,
  DEFAULT_INDEX_CONFIG
} from './types';
import { createLogger } from './utils/logger';
import { IndexDatabase } from './database/index-database';
import { IndexManager } from './core/index-manager';
import { SearchEngine } from './core/search-engine';
import { FileSystemWatcher } from './core/file-watcher';
import { FileOperations } from './core/file-operations';

export interface LocalSearchEngineOptions {
  dbPath?: string;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  logType?: 'file' | 'console';
  logDir?: string;
  indexConfig?: Partial<IndexConfig>;
}

export class LocalSearchEngine extends EventEmitter {
  private db: IndexDatabase;
  private logger: Logger;
  private indexManager: IndexManager | null = null;
  private searchEngine: SearchEngine | null = null;
  private fileWatcher: FileSystemWatcher;
  private fileOperations: FileOperations;
  private config: IndexConfig;
  private isInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor(options: LocalSearchEngineOptions = {}) {
    super();
    
    const dbPath = options.dbPath || this.getDefaultDbPath();
    
    this.logger = createLogger({
      type: options.logType || 'console',
      logLevel: options.logLevel || 'info',
      logDir: options.logDir
    });

    this.config = { ...DEFAULT_INDEX_CONFIG, ...options.indexConfig };
    
    this.db = new IndexDatabase(dbPath, this.logger);
    this.fileWatcher = new FileSystemWatcher(this.logger);
    this.fileOperations = new FileOperations(this.logger);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    await this.db.initialize();
    
    this.indexManager = new IndexManager(this.db, this.logger, this.config);
    this.searchEngine = new SearchEngine(this.db, this.logger);
    
    this.setupEventForwarding();
    this.setupFileWatcher();

    const lastIndexTime = this.db.getMetadata('lastIndexTime');
    
    if (!lastIndexTime) {
      this.logger.info('No existing index found');
    } else {
      this.logger.info('Existing index found', { lastIndexTime });
    }

    this.isInitialized = true;
  }

  private setupEventForwarding(): void {
    if (!this.indexManager) return;
    
    this.indexManager.on('indexing-started', (data) => this.emit('indexing-started', data));
    this.indexManager.on('indexing-progress', (data) => this.emit('indexing-progress', data));
    this.indexManager.on('indexing-completed', (data) => this.emit('indexing-completed', data));
    this.indexManager.on('indexing-paused', () => this.emit('indexing-paused'));
    this.indexManager.on('indexing-resumed', () => this.emit('indexing-resumed'));
    this.indexManager.on('indexing-stopped', () => this.emit('indexing-stopped'));
    this.indexManager.on('indexing-error', (error) => this.emit('indexing-error', error));
  }

  private setupFileWatcher(): void {
    this.fileWatcher.onFileCreated((filePath: string) => {
      if (this.indexManager) {
        this.indexManager.addFile(filePath);
      }
    });

    this.fileWatcher.onFileDeleted((filePath: string) => {
      if (this.indexManager) {
        this.indexManager.removeFile(filePath);
      }
    });

    this.fileWatcher.onFileModified((filePath: string) => {
      if (this.indexManager) {
        this.indexManager.updateFile(filePath);
      }
    });
  }

  async buildIndex(paths?: string[]): Promise<void> {
    await this.initialize();
    
    await this.indexManager!.startIndexing(paths);
    
    const watchedPaths = paths || this.config.includePaths;
    if (watchedPaths && watchedPaths.length > 0) {
      this.fileWatcher.startWatching(watchedPaths);
    }
  }

  async rebuildIndex(): Promise<void> {
    this.fileWatcher.stopWatching();
    if (this.indexManager) {
      await this.indexManager.rebuildIndex();
    }
    
    if (this.config.includePaths.length > 0) {
      this.fileWatcher.startWatching(this.config.includePaths);
    }
  }

  pauseIndexing(): void {
    if (this.indexManager) {
      this.indexManager.pauseIndexing();
    }
  }

  resumeIndexing(): void {
    if (this.indexManager) {
      this.indexManager.resumeIndexing();
    }
  }

  stopIndexing(): void {
    if (this.indexManager) {
      this.indexManager.stopIndexing();
    }
  }

  getIndexStatus(): IndexStatus {
    if (this.indexManager) {
      return this.indexManager.getIndexStatus();
    }
    return {
      totalFiles: 0,
      indexedFiles: 0,
      progress: 0,
      isPaused: false,
      isIndexing: false,
      lastUpdateTime: new Date()
    };
  }

  async searchByName(query: string, options: Partial<SearchOptions> = {}): Promise<SearchResult[]> {
    await this.initialize();
    return this.searchEngine!.searchByName(query, options);
  }

  async searchByContent(query: string, options: Partial<ContentSearchOptions> = {}): Promise<ContentSearchResult[]> {
    await this.initialize();
    return this.searchEngine!.searchByContent(query, options);
  }

  async searchByRegex(pattern: string, options: Partial<RegexSearchOptions> = {}): Promise<SearchResult[]> {
    await this.initialize();
    return this.searchEngine!.searchByRegex(pattern, options);
  }

  filterResults(results: SearchResult[], filters: FilterOptions): SearchResult[] {
    if (!this.searchEngine) {
      throw new Error('Engine not initialized. Call initialize() first.');
    }
    return this.searchEngine.filterResults(results, filters);
  }

  sortResults(results: SearchResult[], sortBy: SortOption, order: SortOrder = 'asc'): SearchResult[] {
    if (!this.searchEngine) {
      throw new Error('Engine not initialized. Call initialize() first.');
    }
    return this.searchEngine.sortResults(results, sortBy, order);
  }

  async openFile(filePath: string): Promise<void> {
    return this.fileOperations.open(filePath);
  }

  async openInExplorer(filePath: string): Promise<void> {
    return this.fileOperations.openInExplorer(filePath);
  }

  async copyPath(filePath: string): Promise<string> {
    return this.fileOperations.copyPath(filePath);
  }

  async copyFile(source: string, destination: string): Promise<void> {
    return this.fileOperations.copyTo(source, destination);
  }

  async deleteFiles(filePaths: string[], moveToTrash: boolean = true): Promise<void> {
    return this.fileOperations.delete(filePaths, moveToTrash);
  }

  getFileStats(filePath: string) {
    return this.fileOperations.getStats(filePath);
  }

  private getDefaultDbPath(): string {
    const platform = process.platform;
    let dataDir: string;

    if (platform === 'win32') {
      dataDir = path.join(process.env.APPDATA || process.env.USERPROFILE || '.', 'local-search-engine');
    } else if (platform === 'darwin') {
      dataDir = path.join(process.env.HOME || '.', 'Library', 'Application Support', 'local-search-engine');
    } else {
      dataDir = path.join(process.env.HOME || '.', '.local', 'share', 'local-search-engine');
    }

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    return path.join(dataDir, 'index.db');
  }

  close(): void {
    this.fileWatcher.stopWatching();
    this.db.close();
    this.logger.info('LocalSearchEngine closed');
  }

  getDatabaseSize(): number {
    return this.db.getDatabaseSize();
  }

  optimizeDatabase(): void {
    this.db.optimize();
  }
}

export {
  SearchResult,
  SearchOptions,
  ContentSearchResult,
  ContentSearchOptions,
  RegexSearchOptions,
  FilterOptions,
  SortOption,
  SortOrder,
  IndexStatus,
  IndexConfig,
  Logger,
  DEFAULT_SEARCH_OPTIONS,
  DEFAULT_INDEX_CONFIG
};

export { IndexManager } from './core/index-manager';
export { SearchEngine } from './core/search-engine';
export { FileSystemWatcher } from './core/file-watcher';
export { FileOperations } from './core/file-operations';
export { IndexDatabase } from './database/index-database';
export { createLogger } from './utils/logger';
