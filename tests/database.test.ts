import * as fs from 'fs';
import * as path from 'path';
import { IndexDatabase } from '../src/database/index-database';
import { createLogger } from '../src/utils/logger';

const TEST_DB_PATH = path.join(__dirname, 'test-index.db');

describe('IndexDatabase', () => {
  let db: IndexDatabase;
  let logger: any;

  beforeAll(() => {
    logger = createLogger({ type: 'console', logLevel: 'error' });
  });

  beforeEach(async () => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    db = new IndexDatabase(TEST_DB_PATH, logger);
    await db.initialize();
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  describe('insertFile', () => {
    it('should insert a file entry into the database', () => {
      const entry = {
        path: '/test/file.txt',
        name: 'file.txt',
        extension: '.txt',
        size: 1024,
        createdTime: Date.now(),
        modifiedTime: Date.now(),
        isDirectory: 0
      };

      db.insertFile(entry);

      const result = db.getFile('/test/file.txt');
      expect(result).not.toBeNull();
      expect(result?.name).toBe('file.txt');
      expect(result?.extension).toBe('.txt');
      expect(result?.size).toBe(1024);
    });

    it('should replace existing file entry with same path', () => {
      const entry1 = {
        path: '/test/file.txt',
        name: 'file.txt',
        extension: '.txt',
        size: 1024,
        createdTime: Date.now(),
        modifiedTime: Date.now(),
        isDirectory: 0
      };

      const entry2 = {
        path: '/test/file.txt',
        name: 'file.txt',
        extension: '.txt',
        size: 2048,
        createdTime: Date.now(),
        modifiedTime: Date.now(),
        isDirectory: 0
      };

      db.insertFile(entry1);
      db.insertFile(entry2);

      expect(db.getFileCount()).toBe(1);
      const result = db.getFile('/test/file.txt');
      expect(result?.size).toBe(2048);
    });
  });

  describe('insertFiles', () => {
    it('should insert multiple file entries in a batch', () => {
      const entries = [
        {
          path: '/test/file1.txt',
          name: 'file1.txt',
          extension: '.txt',
          size: 1024,
          createdTime: Date.now(),
          modifiedTime: Date.now(),
          isDirectory: 0
        },
        {
          path: '/test/file2.txt',
          name: 'file2.txt',
          extension: '.txt',
          size: 2048,
          createdTime: Date.now(),
          modifiedTime: Date.now(),
          isDirectory: 0
        }
      ];

      db.insertFiles(entries);

      expect(db.getFileCount()).toBe(2);
    });
  });

  describe('deleteFile', () => {
    it('should delete a file entry from the database', () => {
      const entry = {
        path: '/test/file.txt',
        name: 'file.txt',
        extension: '.txt',
        size: 1024,
        createdTime: Date.now(),
        modifiedTime: Date.now(),
        isDirectory: 0
      };

      db.insertFile(entry);
      expect(db.getFileCount()).toBe(1);

      db.deleteFile('/test/file.txt');
      expect(db.getFileCount()).toBe(0);
      expect(db.getFile('/test/file.txt')).toBeNull();
    });
  });

  describe('searchByName', () => {
    beforeEach(() => {
      const entries = [
        { path: '/test/readme.md', name: 'readme.md', extension: '.md', size: 1024, createdTime: Date.now(), modifiedTime: Date.now(), isDirectory: 0 },
        { path: '/test/README.txt', name: 'README.txt', extension: '.txt', size: 2048, createdTime: Date.now(), modifiedTime: Date.now(), isDirectory: 0 },
        { path: '/test/document.pdf', name: 'document.pdf', extension: '.pdf', size: 4096, createdTime: Date.now(), modifiedTime: Date.now(), isDirectory: 0 },
        { path: '/test/test_file.txt', name: 'test_file.txt', extension: '.txt', size: 512, createdTime: Date.now(), modifiedTime: Date.now(), isDirectory: 0 }
      ];
      db.insertFiles(entries);
    });

    it('should find files by exact match', () => {
      const results = db.searchByName('readme.md', false, 'exact', 100);
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('readme.md');
    });

    it('should find files by fuzzy match (substring)', () => {
      const results = db.searchByName('read', false, 'fuzzy', 100);
      expect(results.length).toBe(2);
    });

    it('should find files by wildcard pattern', () => {
      const results = db.searchByName('*.txt', false, 'wildcard', 100);
      expect(results.length).toBe(2);
      expect(results.every(r => r.extension === '.txt')).toBe(true);
    });

    it('should respect case sensitivity option', () => {
      const caseInsensitive = db.searchByName('README', false, 'fuzzy', 100);
      expect(caseInsensitive.length).toBe(2);

      const caseSensitive = db.searchByName('README.txt', true, 'exact', 100);
      expect(caseSensitive.length).toBe(1);
      expect(caseSensitive[0].name).toBe('README.txt');
    });

    it('should limit results to maxResults', () => {
      const results = db.searchByName('', false, 'fuzzy', 2);
      expect(results.length).toBe(2);
    });
  });

  describe('searchByRegex', () => {
    beforeEach(() => {
      const entries = [
        { path: '/test/file1.txt', name: 'file1.txt', extension: '.txt', size: 1024, createdTime: Date.now(), modifiedTime: Date.now(), isDirectory: 0 },
        { path: '/test/file2.txt', name: 'file2.txt', extension: '.txt', size: 2048, createdTime: Date.now(), modifiedTime: Date.now(), isDirectory: 0 },
        { path: '/test/data.json', name: 'data.json', extension: '.json', size: 512, createdTime: Date.now(), modifiedTime: Date.now(), isDirectory: 0 }
      ];
      db.insertFiles(entries);
    });

    it('should find files matching regex pattern', () => {
      const results = db.searchByRegex('file\\d+', 'i', 100);
      expect(results.length).toBe(2);
    });

    it('should return empty array for no matches', () => {
      const results = db.searchByRegex('nonexistent', 'i', 100);
      expect(results.length).toBe(0);
    });
  });

  describe('filterFiles', () => {
    beforeEach(() => {
      const now = Date.now();
      const entries = [
        { path: '/test/small.txt', name: 'small.txt', extension: '.txt', size: 100, createdTime: now, modifiedTime: now, isDirectory: 0 },
        { path: '/test/large.txt', name: 'large.txt', extension: '.txt', size: 10000, createdTime: now, modifiedTime: now, isDirectory: 0 },
        { path: '/test/doc.pdf', name: 'doc.pdf', extension: '.pdf', size: 5000, createdTime: now, modifiedTime: now, isDirectory: 0 }
      ];
      db.insertFiles(entries);
    });

    it('should filter by size range', () => {
      const results = db.filterFiles({
        sizeRange: { min: 50, max: 200 },
        maxResults: 100
      });
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('small.txt');
    });

    it('should filter by extension', () => {
      const results = db.filterFiles({
        extensions: ['.txt'],
        maxResults: 100
      });
      expect(results.length).toBe(2);
    });

    it('should combine multiple filters', () => {
      const results = db.filterFiles({
        extensions: ['.txt'],
        sizeRange: { min: 0, max: 500 },
        maxResults: 100
      });
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('small.txt');
    });
  });

  describe('metadata', () => {
    it('should store and retrieve metadata', () => {
      db.setMetadata('testKey', 'testValue');
      expect(db.getMetadata('testKey')).toBe('testValue');
    });

    it('should return null for non-existent metadata', () => {
      expect(db.getMetadata('nonexistent')).toBeNull();
    });
  });

  describe('getFileCount', () => {
    it('should return correct file count', () => {
      expect(db.getFileCount()).toBe(0);

      db.insertFile({
        path: '/test/file.txt',
        name: 'file.txt',
        extension: '.txt',
        size: 1024,
        createdTime: Date.now(),
        modifiedTime: Date.now(),
        isDirectory: 0
      });

      expect(db.getFileCount()).toBe(1);
    });
  });
});
