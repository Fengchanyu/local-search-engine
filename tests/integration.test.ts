import * as fs from 'fs';
import * as path from 'path';
import { LocalSearchEngine } from '../src/index';
import { createLogger } from '../src/utils/logger';

const TEST_DIR = path.join(__dirname, 'integration-test-files');
const TEST_DB_PATH = path.join(__dirname, 'integration-test.db');

describe('LocalSearchEngine Integration Tests', () => {
  let engine: LocalSearchEngine;

  beforeAll(() => {
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  beforeEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    
    engine = new LocalSearchEngine({
      dbPath: TEST_DB_PATH,
      logLevel: 'error',
      indexConfig: {
        includePaths: [TEST_DIR],
        excludePaths: [],
        excludePatterns: [],
        maxFileSize: 10 * 1024 * 1024,
        indexContent: false
      }
    });
  });

  afterEach(() => {
    engine.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  afterAll(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('Full workflow', () => {
    it('should build index and search files', async () => {
      fs.writeFileSync(path.join(TEST_DIR, 'document.txt'), 'Hello World');
      fs.writeFileSync(path.join(TEST_DIR, 'readme.md'), '# README');
      fs.writeFileSync(path.join(TEST_DIR, 'config.json'), '{"key": "value"}');

      await engine.buildIndex([TEST_DIR]);

      const results = await engine.searchByName('doc', { matchMode: 'fuzzy' });
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('document.txt');
    });

    it('should filter and sort results', async () => {
      fs.writeFileSync(path.join(TEST_DIR, 'small.txt'), 'x'.repeat(100));
      fs.writeFileSync(path.join(TEST_DIR, 'medium.txt'), 'x'.repeat(1000));
      fs.writeFileSync(path.join(TEST_DIR, 'large.txt'), 'x'.repeat(10000));

      await engine.buildIndex([TEST_DIR]);

      let results = await engine.searchByName('', { maxResults: 100 });
      results = engine.filterResults(results, {
        sizeRange: { min: 500, max: 5000 }
      });
      results = engine.sortResults(results, 'size', 'asc');

      expect(results.length).toBe(1);
      expect(results[0].name).toBe('medium.txt');
    });

    it('should search with regex', async () => {
      fs.writeFileSync(path.join(TEST_DIR, 'file1.txt'), 'content');
      fs.writeFileSync(path.join(TEST_DIR, 'file2.txt'), 'content');
      fs.writeFileSync(path.join(TEST_DIR, 'data.json'), '{}');

      await engine.buildIndex([TEST_DIR]);

      const results = await engine.searchByRegex('file\\d+\\.txt', {});
      expect(results.length).toBe(2);
    });
  });

  describe('Performance tests', () => {
    it('should search within 100ms for indexed files', async () => {
      for (let i = 0; i < 1000; i++) {
        fs.writeFileSync(path.join(TEST_DIR, `file${i}.txt`), `content${i}`);
      }

      await engine.buildIndex([TEST_DIR]);

      const start = Date.now();
      const results = await engine.searchByName('file500', { matchMode: 'fuzzy' });
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100);
      expect(results.length).toBe(1);
    });

    it('should sort 1000 results within 50ms', async () => {
      for (let i = 0; i < 1000; i++) {
        fs.writeFileSync(path.join(TEST_DIR, `sortfile${i}.txt`), `content${i}`);
      }

      await engine.buildIndex([TEST_DIR]);

      const results = await engine.searchByName('', { maxResults: 1000 });
      
      const start = Date.now();
      const sorted = engine.sortResults(results, 'size', 'desc');
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50);
      expect(sorted.length).toBe(1000);
    });
  });

  describe('File operations', () => {
    it('should get file stats', async () => {
      const filePath = path.join(TEST_DIR, 'stats.txt');
      fs.writeFileSync(filePath, 'test content');

      await engine.buildIndex([TEST_DIR]);

      const stats = engine.getFileStats(filePath);
      expect(stats.size).toBe(12);
      expect(stats.isFile()).toBe(true);
    });
  });

  describe('Index status', () => {
    it('should return correct index status', async () => {
      const testFile = path.join(TEST_DIR, 'status_test.txt');
      fs.writeFileSync(testFile, 'content');

      await engine.buildIndex([TEST_DIR]);

      const status = engine.getIndexStatus();
      expect(status.totalFiles).toBeGreaterThanOrEqual(1);
      expect(status.isIndexing).toBe(false);
    });
  });
});
