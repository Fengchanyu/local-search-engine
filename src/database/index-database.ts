import initSqlJs from 'sql.js';
import type { Database as SqlJsDatabase, SqlJsStatic } from 'sql.js';
import * as path from 'path';
import * as fs from 'fs';
import { FileEntry, Logger } from '../types';

export class IndexDatabase {
  private db: SqlJsDatabase | null = null;
  private SQL: SqlJsStatic | null = null;
  private logger: Logger;
  private dbPath: string;
  private initialized: boolean = false;

  constructor(dbPath: string, logger: Logger) {
    this.logger = logger;
    this.dbPath = dbPath;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    this.SQL = await initSqlJs();
    
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(this.dbPath)) {
      const buffer = fs.readFileSync(this.dbPath);
      this.db = new this.SQL.Database(buffer);
    } else {
      this.db = new this.SQL.Database();
    }

    this.initialized = true;
    this.initializeSchema();
  }

  private ensureInitialized(): void {
    if (!this.initialized || !this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
  }

  private initializeSchema(): void {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    this.db.run(`
      CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        path TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        extension TEXT NOT NULL,
        size INTEGER NOT NULL,
        created_time INTEGER NOT NULL,
        modified_time INTEGER NOT NULL,
        is_directory INTEGER NOT NULL
      )
    `);
    
    this.db!.run(`CREATE INDEX IF NOT EXISTS idx_files_name ON files(name)`);
    this.db!.run(`CREATE INDEX IF NOT EXISTS idx_files_extension ON files(extension)`);
    this.db!.run(`CREATE INDEX IF NOT EXISTS idx_files_path ON files(path)`);
    this.db!.run(`CREATE INDEX IF NOT EXISTS idx_files_modified_time ON files(modified_time)`);
    this.db!.run(`CREATE INDEX IF NOT EXISTS idx_files_size ON files(size)`);
    
    this.db!.run(`
      CREATE TABLE IF NOT EXISTS index_metadata (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);
    
    this.db!.run(`
      CREATE TABLE IF NOT EXISTS exclude_patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pattern TEXT UNIQUE NOT NULL
      )
    `);
    
    this.save();
    this.logger.info('Database schema initialized');
  }

  private save(): void {
    if (!this.db) {
      return;
    }
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.dbPath, buffer);
  }

  insertFile(entry: Omit<FileEntry, 'id'>): void {
    this.ensureInitialized();
    this.db!.run(
      `INSERT OR REPLACE INTO files (path, name, extension, size, created_time, modified_time, is_directory)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [entry.path, entry.name, entry.extension, entry.size, entry.createdTime, entry.modifiedTime, entry.isDirectory]
    );
    this.save();
  }

  insertFiles(entries: Omit<FileEntry, 'id'>[]): void {
    this.ensureInitialized();
    for (const entry of entries) {
      this.db!.run(
        `INSERT OR REPLACE INTO files (path, name, extension, size, created_time, modified_time, is_directory)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [entry.path, entry.name, entry.extension, entry.size, entry.createdTime, entry.modifiedTime, entry.isDirectory]
      );
    }
    this.save();
  }

  deleteFile(filePath: string): void {
    this.ensureInitialized();
    this.db!.run('DELETE FROM files WHERE path = ?', [filePath]);
    this.save();
  }

  deleteFiles(filePaths: string[]): void {
    this.ensureInitialized();
    for (const p of filePaths) {
      this.db!.run('DELETE FROM files WHERE path = ?', [p]);
    }
    this.save();
  }

  getFile(filePath: string): FileEntry | null {
    this.ensureInitialized();
    const result = this.db!.exec('SELECT * FROM files WHERE path = ?', [filePath]);
    if (result.length === 0 || result[0].values.length === 0) {
      return null;
    }
    return this.rowToFileEntry(result[0].values[0]);
  }

  searchByName(
    query: string,
    caseSensitive: boolean,
    matchMode: 'exact' | 'fuzzy' | 'wildcard',
    maxResults: number
  ): FileEntry[] {
    this.ensureInitialized();
    
    let sql: string;
    let params: any[];

    switch (matchMode) {
      case 'exact':
        sql = `SELECT * FROM files WHERE name = ? ORDER BY name LIMIT ?`;
        params = [query, maxResults];
        break;
      
      case 'fuzzy':
        sql = `SELECT * FROM files WHERE name LIKE ? ESCAPE '\\' ORDER BY name LIMIT ?`;
        params = [`%${this.escapeLike(caseSensitive ? query : query.toLowerCase())}%`, maxResults];
        break;
      
      case 'wildcard':
        const likePattern = this.wildcardToLike(query, caseSensitive);
        sql = `SELECT * FROM files WHERE name LIKE ? ESCAPE '\\' ORDER BY name LIMIT ?`;
        params = [likePattern, maxResults];
        break;
      
      default:
        throw new Error(`Unknown match mode: ${matchMode}`);
    }

    const result = this.db!.exec(sql, params);
    if (result.length === 0) return [];
    return result[0].values.map((row: any[]) => this.rowToFileEntry(row));
  }

  searchByRegex(pattern: string, flags: string, maxResults: number): FileEntry[] {
    this.ensureInitialized();
    const result = this.db!.exec('SELECT * FROM files ORDER BY name LIMIT 10000');
    if (result.length === 0) return [];
    
    const regex = new RegExp(pattern, flags);
    const matches: FileEntry[] = [];
    
    for (const row of result[0].values) {
      const entry = this.rowToFileEntry(row);
      if (regex.test(entry.name)) {
        matches.push(entry);
        if (matches.length >= maxResults) break;
      }
    }
    
    return matches;
  }

  searchByPath(pathPrefix: string, maxResults: number): FileEntry[] {
    this.ensureInitialized();
    const result = this.db!.exec(
      `SELECT * FROM files WHERE path LIKE ? ESCAPE '\\' ORDER BY path LIMIT ?`,
      [`${this.escapeLike(pathPrefix)}%`, maxResults]
    );
    if (result.length === 0) return [];
    return result[0].values.map((row: any[]) => this.rowToFileEntry(row));
  }

  filterFiles(options: {
    sizeRange?: { min: number; max: number };
    dateRange?: { start: number; end: number };
    extensions?: string[];
    directory?: string;
    isDirectory?: boolean;
    maxResults: number;
  }): FileEntry[] {
    this.ensureInitialized();
    
    const conditions: string[] = [];
    const params: any[] = [];

    if (options.sizeRange) {
      conditions.push('size >= ? AND size <= ?');
      params.push(options.sizeRange.min, options.sizeRange.max);
    }

    if (options.dateRange) {
      conditions.push('modified_time >= ? AND modified_time <= ?');
      params.push(options.dateRange.start, options.dateRange.end);
    }

    if (options.extensions && options.extensions.length > 0) {
      conditions.push(`extension IN (${options.extensions.map(() => '?').join(', ')})`);
      params.push(...options.extensions);
    }

    if (options.directory) {
      conditions.push('path LIKE ? ESCAPE "\\"');
      params.push(`${this.escapeLike(options.directory)}%`);
    }

    if (options.isDirectory !== undefined) {
      conditions.push('is_directory = ?');
      params.push(options.isDirectory ? 1 : 0);
    }

    params.push(options.maxResults);

    const sql = conditions.length > 0
      ? `SELECT * FROM files WHERE ${conditions.join(' AND ')} ORDER BY name LIMIT ?`
      : `SELECT * FROM files ORDER BY name LIMIT ?`;

    const result = this.db!.exec(sql, params);
    if (result.length === 0) return [];
    return result[0].values.map((row: any[]) => this.rowToFileEntry(row));
  }

  getFileCount(): number {
    this.ensureInitialized();
    const result = this.db!.exec('SELECT COUNT(*) as count FROM files');
    if (result.length === 0 || result[0].values.length === 0) return 0;
    return result[0].values[0][0] as number;
  }

  getTotalSize(): number {
    this.ensureInitialized();
    const result = this.db!.exec('SELECT SUM(size) as total FROM files');
    if (result.length === 0 || result[0].values.length === 0) return 0;
    return (result[0].values[0][0] as number) || 0;
  }

  setMetadata(key: string, value: string): void {
    this.ensureInitialized();
    this.db!.run(
      `INSERT OR REPLACE INTO index_metadata (key, value) VALUES (?, ?)`,
      [key, value]
    );
    this.save();
  }

  getMetadata(key: string): string | null {
    this.ensureInitialized();
    const result = this.db!.exec('SELECT value FROM index_metadata WHERE key = ?', [key]);
    if (result.length === 0 || result[0].values.length === 0) return null;
    return result[0].values[0][0] as string;
  }

  addExcludePattern(pattern: string): void {
    this.ensureInitialized();
    this.db!.run('INSERT OR IGNORE INTO exclude_patterns (pattern) VALUES (?)', [pattern]);
    this.save();
  }

  getExcludePatterns(): string[] {
    this.ensureInitialized();
    const result = this.db!.exec('SELECT pattern FROM exclude_patterns');
    if (result.length === 0) return [];
    return result[0].values.map((row: any[]) => row[0] as string);
  }

  clearAllFiles(): void {
    this.ensureInitialized();
    this.db!.run('DELETE FROM files');
    this.save();
    this.logger.info('All files cleared from database');
  }

  private rowToFileEntry(row: any[]): FileEntry {
    return {
      id: row[0] as number,
      path: row[1] as string,
      name: row[2] as string,
      extension: row[3] as string,
      size: row[4] as number,
      createdTime: row[5] as number,
      modifiedTime: row[6] as number,
      isDirectory: row[7] as number
    };
  }

  private escapeLike(str: string): string {
    return str.replace(/[%_\\]/g, '\\$&');
  }

  private wildcardToLike(pattern: string, caseSensitive: boolean): string {
    let result = pattern
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_')
      .replace(/\*/g, '%')
      .replace(/\?/g, '_');
    
    if (!caseSensitive) {
      result = result.toLowerCase();
    }
    
    return result;
  }

  close(): void {
    if (this.db) {
      this.save();
      this.db.close();
      this.db = null;
      this.logger.info('Database connection closed');
    }
  }

  getDatabaseSize(): number {
    if (fs.existsSync(this.dbPath)) {
      const stats = fs.statSync(this.dbPath);
      return stats.size;
    }
    return 0;
  }

  optimize(): void {
    this.ensureInitialized();
    this.db!.run('VACUUM');
    this.db!.run('ANALYZE');
    this.save();
    this.logger.info('Database optimized');
  }
}
