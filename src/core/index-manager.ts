import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { 
  IndexStatus, 
  IndexConfig, 
  FileEntry, 
  Logger,
  DEFAULT_INDEX_CONFIG 
} from '../types';
import { IndexDatabase } from '../database/index-database';

export class IndexManager extends EventEmitter {
  private db: IndexDatabase;
  private logger: Logger;
  private config: IndexConfig;
  private isIndexing: boolean = false;
  private isPaused: boolean = false;
  private indexedFiles: number = 0;
  private totalFiles: number = 0;
  private shouldStop: boolean = false;
  private lastUpdateTime: Date = new Date();

  constructor(db: IndexDatabase, logger: Logger, config?: Partial<IndexConfig>) {
    super();
    this.db = db;
    this.logger = logger;
    this.config = { ...DEFAULT_INDEX_CONFIG, ...config };
  }

  async startIndexing(paths?: string[]): Promise<void> {
    if (this.isIndexing) {
      this.logger.warn('Indexing already in progress');
      return;
    }

    await this.db.initialize();

    this.isIndexing = true;
    this.isPaused = false;
    this.shouldStop = false;
    this.indexedFiles = 0;
    this.totalFiles = 0;

    const pathsToIndex = paths || this.config.includePaths || await this.getDefaultPaths();
    
    this.logger.info('Starting indexing', { paths: pathsToIndex });
    this.emit('indexing-started', { paths: pathsToIndex });

    try {
      for (const basePath of pathsToIndex) {
        if (this.shouldStop) break;
        await this.indexDirectory(basePath);
      }

      this.db.setMetadata('lastIndexTime', new Date().toISOString());
      this.lastUpdateTime = new Date();
      
      this.logger.info('Indexing completed', { 
        totalFiles: this.indexedFiles 
      });
      this.emit('indexing-completed', { 
        totalFiles: this.indexedFiles 
      });
    } catch (error) {
      this.logger.error('Indexing failed', error);
      this.emit('indexing-error', error);
    } finally {
      this.isIndexing = false;
    }
  }

  private async indexDirectory(dirPath: string): Promise<void> {
    if (this.shouldStop) return;
    
    while (this.isPaused) {
      await this.sleep(100);
      if (this.shouldStop) return;
    }

    try {
      const entries = await this.readDirectory(dirPath);
      const batch: Omit<FileEntry, 'id'>[] = [];

      for (const entry of entries) {
        if (this.shouldStop) return;

        const fullPath = path.join(dirPath, entry.name);
        
        if (this.shouldExclude(fullPath)) {
          continue;
        }

        try {
          const stats = await this.statFile(fullPath);
          const fileEntry: Omit<FileEntry, 'id'> = {
            path: fullPath,
            name: entry.name,
            extension: path.extname(entry.name).toLowerCase(),
            size: stats.size,
            createdTime: stats.birthtimeMs,
            modifiedTime: stats.mtimeMs,
            isDirectory: entry.isDirectory() ? 1 : 0
          };

          batch.push(fileEntry);
          this.indexedFiles++;

          if (batch.length >= 1000) {
            this.db.insertFiles(batch);
            batch.length = 0;
            this.emit('indexing-progress', {
              indexedFiles: this.indexedFiles,
              currentPath: fullPath
            });
          }

          if (entry.isDirectory()) {
            await this.indexDirectory(fullPath);
          }
        } catch (error) {
          this.logger.debug('Skipping file due to error', { path: fullPath, error });
        }
      }

      if (batch.length > 0) {
        this.db.insertFiles(batch);
        this.emit('indexing-progress', {
          indexedFiles: this.indexedFiles,
          currentPath: dirPath
        });
      }
    } catch (error) {
      this.logger.debug('Cannot read directory', { path: dirPath, error });
    }
  }

  pauseIndexing(): void {
    this.isPaused = true;
    this.logger.info('Indexing paused');
    this.emit('indexing-paused');
  }

  resumeIndexing(): void {
    this.isPaused = false;
    this.logger.info('Indexing resumed');
    this.emit('indexing-resumed');
  }

  stopIndexing(): void {
    this.shouldStop = true;
    this.isPaused = false;
    this.logger.info('Indexing stopped');
    this.emit('indexing-stopped');
  }

  async rebuildIndex(): Promise<void> {
    this.logger.info('Rebuilding index');
    this.db.clearAllFiles();
    await this.startIndexing();
  }

  getIndexStatus(): IndexStatus {
    return {
      totalFiles: this.db.getFileCount(),
      indexedFiles: this.indexedFiles,
      progress: this.totalFiles > 0 ? this.indexedFiles / this.totalFiles : 0,
      isPaused: this.isPaused,
      isIndexing: this.isIndexing,
      lastUpdateTime: this.lastUpdateTime
    };
  }

  addFile(filePath: string): void {
    try {
      const stats = fs.statSync(filePath);
      const name = path.basename(filePath);
      
      const fileEntry: Omit<FileEntry, 'id'> = {
        path: filePath,
        name: name,
        extension: path.extname(name).toLowerCase(),
        size: stats.size,
        createdTime: stats.birthtimeMs,
        modifiedTime: stats.mtimeMs,
        isDirectory: stats.isDirectory() ? 1 : 0
      };

      this.db.insertFile(fileEntry);
      this.lastUpdateTime = new Date();
      this.logger.debug('File added to index', { path: filePath });
      this.emit('file-added', { path: filePath });
    } catch (error) {
      this.logger.error('Failed to add file to index', { path: filePath, error });
    }
  }

  updateFile(filePath: string): void {
    this.addFile(filePath);
    this.emit('file-updated', { path: filePath });
  }

  removeFile(filePath: string): void {
    this.db.deleteFile(filePath);
    this.lastUpdateTime = new Date();
    this.logger.debug('File removed from index', { path: filePath });
    this.emit('file-removed', { path: filePath });
  }

  renameFile(oldPath: string, newPath: string): void {
    this.db.deleteFile(oldPath);
    this.addFile(newPath);
    this.logger.debug('File renamed in index', { oldPath, newPath });
    this.emit('file-renamed', { oldPath, newPath });
  }

  private async getDefaultPaths(): Promise<string[]> {
    const paths: string[] = [];
    const platform = process.platform;

    if (platform === 'win32') {
      const drives = await this.getWindowsDrives();
      paths.push(...drives);
    } else if (platform === 'darwin') {
      const home = process.env.HOME || '/Users';
      paths.push(home);
    } else {
      const home = process.env.HOME || '/home';
      paths.push(home);
    }

    return paths;
  }

  private async getWindowsDrives(): Promise<string[]> {
    const drives: string[] = [];
    for (let i = 65; i <= 90; i++) {
      const drive = String.fromCharCode(i) + ':\\';
      try {
        fs.accessSync(drive, fs.constants.R_OK);
        drives.push(drive);
      } catch {
        // Drive not accessible
      }
    }
    return drives;
  }

  private shouldExclude(filePath: string): boolean {
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    for (const excludePath of this.config.excludePaths) {
      const normalizedExclude = excludePath.replace(/\\/g, '/');
      if (normalizedPath.includes(normalizedExclude)) {
        return true;
      }
    }

    for (const pattern of this.config.excludePatterns) {
      const regex = this.patternToRegex(pattern);
      if (regex.test(path.basename(filePath))) {
        return true;
      }
    }

    return false;
  }

  private patternToRegex(pattern: string): RegExp {
    const regexStr = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    return new RegExp(`^${regexStr}$`, 'i');
  }

  private readDirectory(dirPath: string): Promise<fs.Dirent[]> {
    return new Promise((resolve, reject) => {
      fs.readdir(dirPath, { withFileTypes: true }, (err, entries) => {
        if (err) reject(err);
        else resolve(entries);
      });
    });
  }

  private statFile(filePath: string): Promise<fs.Stats> {
    return new Promise((resolve, reject) => {
      fs.stat(filePath, (err, stats) => {
        if (err) reject(err);
        else resolve(stats);
      });
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
