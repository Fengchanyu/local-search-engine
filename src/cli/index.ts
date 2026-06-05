import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs';
import { LocalSearchEngine } from '../index';
import { SearchResult, SearchOptions, FilterOptions, SortOption, SortOrder } from '../types';

interface SortOptions {
  field: SortOption;
  order: SortOrder;
}

function getDefaultDbPath(): string {
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

const app = express();
const PORT = process.env.PORT || 3002;

let engine: LocalSearchEngine | null = null;

async function initializeEngine() {
  const dbPath = process.env.DB_PATH || getDefaultDbPath();
  console.log(`[DEBUG] Using database path: ${dbPath}`);
  console.log(`[DEBUG] DB_PATH env: ${process.env.DB_PATH}`);
  console.log(`[DEBUG] Database exists: ${fs.existsSync(dbPath)}`);
  
  engine = new LocalSearchEngine({
    dbPath,
    logLevel: 'error'
  });
  await engine.initialize();
  
  // Log file count
  const status = engine.getIndexStatus();
  console.log(`[DEBUG] Indexed files: ${status.indexedFiles}`);
}

app.use(cors());
app.use(express.json());

app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

app.get('/api/search', async (req: Request, res: Response) => {
  try {
    if (!engine) {
      await initializeEngine();
    }

    const query = req.query.query as string || '';
    const options: Partial<SearchOptions> = {
      matchMode: (req.query.matchMode as SearchOptions['matchMode']) || 'fuzzy',
      caseSensitive: req.query.caseSensitive === 'true',
      maxResults: parseInt(req.query.maxResults as string) || 100
    };

    const results = await engine!.searchByName(query, options);
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/search/content', async (req: Request, res: Response) => {
  try {
    if (!engine) {
      await initializeEngine();
    }

    const query = req.query.query as string || '';
    const options = {
      maxResults: parseInt(req.query.maxResults as string) || 100
    };

    const results = await engine!.searchByContent(query, options);
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Content search error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/search/regex', async (req: Request, res: Response) => {
  try {
    if (!engine) {
      await initializeEngine();
    }

    const pattern = req.query.pattern as string || '';
    const options = {
      maxResults: parseInt(req.query.maxResults as string) || 100
    };

    const results = await engine!.searchByRegex(pattern, options);
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Regex search error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/filter', async (req: Request, res: Response) => {
  try {
    if (!engine) {
      await initializeEngine();
    }

    const { results, filters } = req.body as { results: SearchResult[]; filters: FilterOptions };
    const filtered = engine!.filterResults(results, filters);
    res.json({ success: true, data: filtered });
  } catch (error) {
    console.error('Filter error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/sort', async (req: Request, res: Response) => {
  try {
    if (!engine) {
      await initializeEngine();
    }

    const { results, sort } = req.body as { results: SearchResult[]; sort: SortOptions };
    const sorted = engine!.sortResults(results, sort.field, sort.order);
    res.json({ success: true, data: sorted });
  } catch (error) {
    console.error('Sort error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/index/build', async (req: Request, res: Response) => {
  try {
    if (!engine) {
      await initializeEngine();
    }

    const { paths } = req.body as { paths: string[] };
    await engine!.buildIndex(paths);
    res.json({ success: true, message: '索引建立成功' });
  } catch (error) {
    console.error('Build index error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/index/rebuild', async (req: Request, res: Response) => {
  try {
    if (!engine) {
      await initializeEngine();
    }

    await engine!.rebuildIndex();
    res.json({ success: true, message: '索引重建成功' });
  } catch (error) {
    console.error('Rebuild index error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/index/status', async (req: Request, res: Response) => {
  try {
    if (!engine) {
      await initializeEngine();
    }

    const status = engine!.getIndexStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/index/pause', async (req: Request, res: Response) => {
  try {
    if (!engine) {
      await initializeEngine();
    }

    engine!.pauseIndexing();
    res.json({ success: true, message: '索引已暂停' });
  } catch (error) {
    console.error('Pause indexing error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/index/resume', async (req: Request, res: Response) => {
  try {
    if (!engine) {
      await initializeEngine();
    }

    engine!.resumeIndexing();
    res.json({ success: true, message: '索引已恢复' });
  } catch (error) {
    console.error('Resume indexing error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/index/stop', async (req: Request, res: Response) => {
  try {
    if (!engine) {
      await initializeEngine();
    }

    engine!.stopIndexing();
    res.json({ success: true, message: '索引已停止' });
  } catch (error) {
    console.error('Stop indexing error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/file/open', async (req: Request, res: Response) => {
  try {
    const { path } = req.body as { path: string };
    const { exec } = require('child_process');
    
    const platform = process.platform;
    let command: string;
    
    if (platform === 'win32') {
      command = `start "" "${path}"`;
    } else if (platform === 'darwin') {
      command = `open "${path}"`;
    } else {
      command = `xdg-open "${path}"`;
    }
    
    exec(command, (error: Error | null) => {
      if (error) {
        console.error('Open file error:', error);
        res.status(500).json({ success: false, error: error.message });
      } else {
        res.json({ success: true, message: '文件已打开' });
      }
    });
  } catch (error) {
    console.error('Open file error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/file/copy-path', async (req: Request, res: Response) => {
  try {
    const { path } = req.body as { path: string };
    
    const platform = process.platform;
    let command: string;
    
    if (platform === 'win32') {
      command = `echo ${path} | clip`;
    } else if (platform === 'darwin') {
      command = `echo "${path}" | pbcopy`;
    } else {
      command = `echo "${path}" | xclip -selection clipboard`;
    }
    
    const { exec } = require('child_process');
    exec(command, (error: Error | null) => {
      if (error) {
        console.error('Copy path error:', error);
        res.status(500).json({ success: false, error: error.message });
      } else {
        res.json({ success: true, message: '路径已复制' });
      }
    });
  } catch (error) {
    console.error('Copy path error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/file/stats', async (req: Request, res: Response) => {
  try {
    const filePath = req.query.path as string;
    const fs = require('fs');
    
    const stats = fs.statSync(filePath);
    
    res.json({
      success: true,
      data: {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      }
    });
  } catch (error) {
    console.error('Get file stats error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

process.on('SIGINT', () => {
  if (engine) {
    engine.close();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (engine) {
    engine.close();
  }
  process.exit(0);
});

async function startServer() {
  try {
    await initializeEngine();
    
    app.listen(PORT, () => {
      console.log(`API Server running on http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
