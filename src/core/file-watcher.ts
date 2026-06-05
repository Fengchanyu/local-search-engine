import * as chokidar from 'chokidar';
import { EventEmitter } from 'events';
import { Logger } from '../types';

export interface FileSystemWatcherOptions {
  ignored?: (string | RegExp)[];
  ignoreInitial?: boolean;
  persistent?: boolean;
  usePolling?: boolean;
  pollingInterval?: number;
}

export class FileSystemWatcher extends EventEmitter {
  private watcher: chokidar.FSWatcher | null = null;
  private logger: Logger;
  private options: FileSystemWatcherOptions;
  private watchedPaths: Set<string> = new Set();

  constructor(logger: Logger, options: FileSystemWatcherOptions = {}) {
    super();
    this.logger = logger;
    const defaultIgnored: (string | RegExp)[] = [
      /(^|[\/\\])\../,
      'node_modules',
      '.git',
      '.svn',
      '**/*.tmp',
      '**/*.temp'
    ];
    this.options = {
      ignored: defaultIgnored,
      ignoreInitial: true,
      persistent: true,
      usePolling: false,
      pollingInterval: 100,
      ...options
    };
  }

  startWatching(paths: string[]): void {
    if (this.watcher) {
      this.stopWatching();
    }

    this.logger.info('Starting file system watcher', { paths });

    this.watcher = chokidar.watch(paths, {
      ignored: this.options.ignored,
      ignoreInitial: this.options.ignoreInitial,
      persistent: this.options.persistent,
      usePolling: this.options.usePolling,
      interval: this.options.pollingInterval,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100
      }
    });

    this.watcher
      .on('add', (path: string) => {
        this.logger.debug('File added', { path });
        this.emit('file-created', path);
      })
      .on('change', (path: string) => {
        this.logger.debug('File changed', { path });
        this.emit('file-modified', path);
      })
      .on('unlink', (path: string) => {
        this.logger.debug('File deleted', { path });
        this.emit('file-deleted', path);
      })
      .on('addDir', (path: string) => {
        this.logger.debug('Directory added', { path });
        this.emit('file-created', path);
      })
      .on('unlinkDir', (path: string) => {
        this.logger.debug('Directory deleted', { path });
        this.emit('file-deleted', path);
      })
      .on('error', (error: Error) => {
        this.logger.error('Watcher error', error);
        this.emit('error', error);
      })
      .on('ready', () => {
        this.logger.info('File system watcher ready');
        this.emit('ready');
      });

    paths.forEach(p => this.watchedPaths.add(p));
  }

  stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      this.watchedPaths.clear();
      this.logger.info('File system watcher stopped');
      this.emit('stopped');
    }
  }

  addWatchPath(path: string): void {
    if (this.watcher && !this.watchedPaths.has(path)) {
      this.watcher.add(path);
      this.watchedPaths.add(path);
      this.logger.debug('Added watch path', { path });
    }
  }

  removeWatchPath(path: string): void {
    if (this.watcher && this.watchedPaths.has(path)) {
      this.watcher.unwatch(path);
      this.watchedPaths.delete(path);
      this.logger.debug('Removed watch path', { path });
    }
  }

  getWatchedPaths(): string[] {
    return Array.from(this.watchedPaths);
  }

  isWatching(): boolean {
    return this.watcher !== null;
  }

  onFileCreated(callback: (path: string) => void): void {
    this.on('file-created', callback);
  }

  onFileDeleted(callback: (path: string) => void): void {
    this.on('file-deleted', callback);
  }

  onFileModified(callback: (path: string) => void): void {
    this.on('file-modified', callback);
  }

  onFileRenamed(callback: (oldPath: string, newPath: string) => void): void {
    this.on('file-renamed', callback);
  }

  onError(callback: (error: Error) => void): void {
    this.on('error', callback);
  }
}
