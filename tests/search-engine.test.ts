import * as fs from 'fs';
import * as path from 'path';
import { SearchEngine } from '../src/core/search-engine';
import { IndexDatabase } from '../src/database/index-database';
import { createLogger } from '../src/utils/logger';

const TEST_DB_PATH = path.join(__dirname, 'test-search.db');

describe('SearchEngine', () => {
  let db: IndexDatabase;
  let engine: SearchEngine;
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
    engine = new SearchEngine(db, logger);

    const now = Date.now();
    const entries = [
      { path: '/project/src/index.ts', name: 'index.ts', extension: '.ts', size: 1024, createdTime: now, modifiedTime: now, isDirectory: 0 },
      { path: '/project/src/utils.ts', name: 'utils.ts', extension: '.ts', size: 2048, createdTime: now, modifiedTime: now, isDirectory: 0 },
      { path: '/project/README.md', name: 'README.md', extension: '.md', size: 4096, createdTime: now, modifiedTime: now, isDirectory: 0 },
      { path: '/project/package.json', name: 'package.json', extension: '.json', size: 512, createdTime: now, modifiedTime: now, isDirectory: 0 },
      { path: '/project/docs/guide.md', name: 'guide.md', extension: '.md', size: 8192, createdTime: now, modifiedTime: now, isDirectory: 0 }
    ];
    db.insertFiles(entries);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  describe('searchByName', () => {
    it('should return all files when query is empty', async () => {
      const results = await engine.searchByName('', { maxResults: 100 });
      expect(results.length).toBe(5);
    });

    it('should find files by fuzzy match', async () => {
      const results = await engine.searchByName('read', { matchMode: 'fuzzy', maxResults: 100 });
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('README.md');
    });

    it('should find files by exact match', async () => {
      const results = await engine.searchByName('index.ts', { matchMode: 'exact', maxResults: 100 });
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('index.ts');
    });

    it('should find files by wildcard pattern', async () => {
      const results = await engine.searchByName('*.md', { matchMode: 'wildcard', maxResults: 100 });
      expect(results.length).toBe(2);
    });

    it('should respect case sensitivity', async () => {
      const insensitive = await engine.searchByName('readme', { caseSensitive: false, maxResults: 100 });
      expect(insensitive.length).toBe(1);

      const sensitive = await engine.searchByName('README.md', { caseSensitive: true, matchMode: 'exact', maxResults: 100 });
      expect(sensitive.length).toBe(1);
    });

    it('should limit results', async () => {
      const results = await engine.searchByName('', { maxResults: 2 });
      expect(results.length).toBe(2);
    });

    it('should return SearchResult with correct properties', async () => {
      const results = await engine.searchByName('index.ts', { maxResults: 100 });
      expect(results[0]).toHaveProperty('path');
      expect(results[0]).toHaveProperty('name');
      expect(results[0]).toHaveProperty('size');
      expect(results[0]).toHaveProperty('modifiedTime');
      expect(results[0]).toHaveProperty('createdTime');
      expect(results[0]).toHaveProperty('extension');
      expect(results[0]).toHaveProperty('isDirectory');
    });
  });

  describe('searchByRegex', () => {
    it('should find files matching regex pattern', async () => {
      const results = await engine.searchByRegex('\\.ts$', { maxResults: 100 });
      expect(results.length).toBe(2);
    });

    it('should throw error for invalid regex', async () => {
      await expect(engine.searchByRegex('[invalid', { maxResults: 100 }))
        .rejects.toThrow('Invalid regular expression');
    });

    it('should respect regex flags', async () => {
      const results = await engine.searchByRegex('README', { flags: 'i', maxResults: 100 });
      expect(results.length).toBe(1);
    });
  });

  describe('filterResults', () => {
    let allResults: any[];

    beforeEach(async () => {
      allResults = await engine.searchByName('', { maxResults: 100 });
    });

    it('should filter by size range', () => {
      const filtered = engine.filterResults(allResults, {
        sizeRange: { min: 1000, max: 3000 }
      });
      expect(filtered.length).toBe(2);
    });

    it('should filter by extension', () => {
      const filtered = engine.filterResults(allResults, {
        extensions: ['.ts']
      });
      expect(filtered.length).toBe(2);
    });

    it('should filter by directory', () => {
      const filtered = engine.filterResults(allResults, {
        directory: '/project/docs'
      });
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('guide.md');
    });

    it('should combine multiple filters', () => {
      const filtered = engine.filterResults(allResults, {
        extensions: ['.md'],
        sizeRange: { min: 0, max: 5000 }
      });
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('README.md');
    });
  });

  describe('sortResults', () => {
    let results: any[];

    beforeEach(async () => {
      results = await engine.searchByName('', { maxResults: 100 });
    });

    it('should sort by name ascending', () => {
      const sorted = engine.sortResults(results, 'name', 'asc');
      const names = sorted.map(r => r.name);
      const expected = [...names].sort((a, b) => a.localeCompare(b));
      expect(names).toEqual(expected);
    });

    it('should sort by name descending', () => {
      const sorted = engine.sortResults(results, 'name', 'desc');
      const names = sorted.map(r => r.name);
      const expected = [...names].sort((a, b) => b.localeCompare(a));
      expect(names).toEqual(expected);
    });

    it('should sort by size', () => {
      const sorted = engine.sortResults(results, 'size', 'asc');
      const sizes = sorted.map(r => r.size);
      expect(sizes).toEqual([...sizes].sort((a, b) => a - b));
    });

    it('should sort by path', () => {
      const sorted = engine.sortResults(results, 'path', 'asc');
      const paths = sorted.map(r => r.path);
      const expected = [...paths].sort((a, b) => a.localeCompare(b));
      expect(paths).toEqual(expected);
    });
  });

  describe('isTextFile', () => {
    it('should identify text file extensions', () => {
      expect(SearchEngine.isTextFile('.txt')).toBe(true);
      expect(SearchEngine.isTextFile('.md')).toBe(true);
      expect(SearchEngine.isTextFile('.json')).toBe(true);
      expect(SearchEngine.isTextFile('.ts')).toBe(true);
      expect(SearchEngine.isTextFile('.js')).toBe(true);
      expect(SearchEngine.isTextFile('.py')).toBe(true);
    });

    it('should return false for non-text extensions', () => {
      expect(SearchEngine.isTextFile('.exe')).toBe(false);
      expect(SearchEngine.isTextFile('.png')).toBe(false);
      expect(SearchEngine.isTextFile('.zip')).toBe(false);
    });
  });
});
