import * as fs from 'fs';
import * as path from 'path';
import { IndexManager } from '../src/core/index-manager';
import { IndexDatabase } from '../src/database/index-database';
import { createLogger } from '../src/utils/logger';

const TEST_DB_PATH = path.join(__dirname, 'test-index-manager.db');
const TEST_DIR = path.join(__dirname, 'test-files-im');

describe('IndexManager', () => {
  let db: IndexDatabase;
  let manager: IndexManager;
  let logger: any;

  beforeAll(() => {
    logger = createLogger({ type: 'console', logLevel: 'error' });
    
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  beforeEach(async () => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    
    const files = fs.existsSync(TEST_DIR) ? fs.readdirSync(TEST_DIR) : [];
    for (const file of files) {
      fs.rmSync(path.join(TEST_DIR, file), { recursive: true, force: true });
    }
    
    db = new IndexDatabase(TEST_DB_PATH, logger);
    await db.initialize();
    manager = new IndexManager(db, logger, {
      includePaths: [TEST_DIR],
      excludePaths: [],
      excludePatterns: [],
      maxFileSize: 10 * 1024 * 1024,
      indexContent: false
    });
  });

  afterEach(() => {
    manager.stopIndexing();
    db.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  afterAll(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('startIndexing', () => {
    it('should index files in a directory', async () => {
      fs.writeFileSync(path.join(TEST_DIR, 'test1.txt'), 'content1');
      fs.writeFileSync(path.join(TEST_DIR, 'test2.txt'), 'content2');

      await manager.startIndexing([TEST_DIR]);

      const status = manager.getIndexStatus();
      expect(status.totalFiles).toBe(2);
      expect(status.isIndexing).toBe(false);
    });

    it('should emit indexing events', async () => {
      const startedSpy = jest.fn();
      const completedSpy = jest.fn();
      
      manager.on('indexing-started', startedSpy);
      manager.on('indexing-completed', completedSpy);

      await manager.startIndexing([TEST_DIR]);

      expect(startedSpy).toHaveBeenCalled();
      expect(completedSpy).toHaveBeenCalled();
    });
  });

  describe('pauseIndexing and resumeIndexing', () => {
    it('should pause and resume indexing', async () => {
      for (let i = 0; i < 10; i++) {
        fs.writeFileSync(path.join(TEST_DIR, `file${i}.txt`), `content${i}`);
      }

      const indexingPromise = manager.startIndexing([TEST_DIR]);
      
      manager.pauseIndexing();
      const status = manager.getIndexStatus();
      expect(status.isPaused).toBe(true);
      
      manager.resumeIndexing();
      
      await indexingPromise;
      
      const finalStatus = manager.getIndexStatus();
      expect(finalStatus.isPaused).toBe(false);
    });
  });

  describe('stopIndexing', () => {
    it('should stop indexing', async () => {
      for (let i = 0; i < 100; i++) {
        fs.writeFileSync(path.join(TEST_DIR, `file${i}.txt`), `content${i}`);
      }

      const indexingPromise = manager.startIndexing([TEST_DIR]);
      
      setTimeout(() => manager.stopIndexing(), 10);
      
      await indexingPromise;
      
      const status = manager.getIndexStatus();
      expect(status.isIndexing).toBe(false);
    });
  });

  describe('addFile', () => {
    it('should add a file to the index', () => {
      const filePath = path.join(TEST_DIR, 'newfile.txt');
      fs.writeFileSync(filePath, 'new content');

      manager.addFile(filePath);

      const file = db.getFile(filePath);
      expect(file).not.toBeNull();
      expect(file?.name).toBe('newfile.txt');
    });

    it('should emit file-added event', () => {
      const spy = jest.fn();
      manager.on('file-added', spy);

      const filePath = path.join(TEST_DIR, 'newfile.txt');
      fs.writeFileSync(filePath, 'new content');

      manager.addFile(filePath);

      expect(spy).toHaveBeenCalledWith({ path: filePath });
    });
  });

  describe('removeFile', () => {
    it('should remove a file from the index', () => {
      const filePath = path.join(TEST_DIR, 'toRemove.txt');
      fs.writeFileSync(filePath, 'content');
      
      db.insertFile({
        path: filePath,
        name: 'toRemove.txt',
        extension: '.txt',
        size: 7,
        createdTime: Date.now(),
        modifiedTime: Date.now(),
        isDirectory: 0
      });

      manager.removeFile(filePath);

      expect(db.getFile(filePath)).toBeNull();
    });

    it('should emit file-removed event', () => {
      const spy = jest.fn();
      manager.on('file-removed', spy);

      manager.removeFile('/nonexistent/file.txt');

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('renameFile', () => {
    it('should rename a file in the index', () => {
      const oldPath = path.join(TEST_DIR, 'oldname.txt');
      const newPath = path.join(TEST_DIR, 'newname.txt');
      
      fs.writeFileSync(oldPath, 'content');
      
      db.insertFile({
        path: oldPath,
        name: 'oldname.txt',
        extension: '.txt',
        size: 7,
        createdTime: Date.now(),
        modifiedTime: Date.now(),
        isDirectory: 0
      });

      fs.renameSync(oldPath, newPath);
      manager.renameFile(oldPath, newPath);

      expect(db.getFile(oldPath)).toBeNull();
      expect(db.getFile(newPath)).not.toBeNull();
    });
  });

  describe('getIndexStatus', () => {
    it('should return correct status', async () => {
      fs.writeFileSync(path.join(TEST_DIR, 'test.txt'), 'content');
      await manager.startIndexing([TEST_DIR]);
      
      const status = manager.getIndexStatus();
      
      expect(status).toHaveProperty('totalFiles');
      expect(status).toHaveProperty('indexedFiles');
      expect(status).toHaveProperty('progress');
      expect(status).toHaveProperty('isPaused');
      expect(status).toHaveProperty('isIndexing');
      expect(status).toHaveProperty('lastUpdateTime');
    });
  });

  describe('rebuildIndex', () => {
    it('should clear and rebuild the index', async () => {
      fs.writeFileSync(path.join(TEST_DIR, 'file1.txt'), 'content1');
      fs.writeFileSync(path.join(TEST_DIR, 'file2.txt'), 'content2');

      await manager.startIndexing([TEST_DIR]);
      expect(db.getFileCount()).toBe(2);

      fs.unlinkSync(path.join(TEST_DIR, 'file1.txt'));
      fs.writeFileSync(path.join(TEST_DIR, 'file3.txt'), 'content3');

      await manager.rebuildIndex();
      
      expect(db.getFileCount()).toBe(2);
      expect(db.getFile(path.join(TEST_DIR, 'file1.txt'))).toBeNull();
      expect(db.getFile(path.join(TEST_DIR, 'file3.txt'))).not.toBeNull();
    });
  });
});
