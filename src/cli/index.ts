#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import { LocalSearchEngine } from '../index';
import { 
  SearchOptions, 
  ContentSearchOptions, 
  FilterOptions,
  SortOption,
  SortOrder,
  SearchResult,
  ContentSearchResult
} from '../types';

const program = new Command();

program
  .name('search')
  .description('High-performance local file search engine')
  .version('1.0.0')
  .enablePositionalOptions();

program
  .argument('[query]', 'Search query')
  .option('-t, --type <extensions>', 'Filter by file type (comma-separated extensions)', parseExtensions)
  .option('-s, --size <range>', 'Filter by file size (e.g., 1KB-10MB)', parseSizeRange)
  .option('-d, --date <range>', 'Filter by date (today|yesterday|week|month|year|YYYY-MM-DD-YYYY-MM-DD)', parseDateRange)
  .option('-p, --path <directory>', 'Search in specific directory')
  .option('-r, --regex', 'Use regular expression search')
  .option('-c, --content', 'Search file content')
  .option('-f, --format <type>', 'Output format (text|json|csv)', 'text')
  .option('-l, --limit <n>', 'Limit number of results', parseInt, 100)
  .option('--case-sensitive', 'Case sensitive search')
  .option('--exact', 'Exact match mode')
  .option('--sort <field>', 'Sort by field (name|path|size|modifiedTime|createdTime)', 'name')
  .option('--order <direction>', 'Sort order (asc|desc)', 'asc')
  .option('--db <path>', 'Path to index database', getDefaultIndexPath())
  .action(async (query: string, options: any) => {
    try {
      const engine = new LocalSearchEngine({
        dbPath: options.db,
        logLevel: 'error'
      });

      await engine.initialize();

      if (!query) {
        program.help();
        return;
      }

      const searchOptions: Partial<SearchOptions> = {
        caseSensitive: options.caseSensitive || false,
        matchMode: options.exact ? 'exact' : 'fuzzy',
        maxResults: parseInt(options.limit) || 100
      };

      const filterOptions: FilterOptions = {};
      
      if (options.type) {
        filterOptions.extensions = options.type;
      }
      
      if (options.size) {
        filterOptions.sizeRange = options.size;
      }
      
      if (options.date) {
        filterOptions.dateRange = options.date;
      }
      
      if (options.path) {
        filterOptions.directory = options.path;
      }

      let results: SearchResult[] | ContentSearchResult[];

      if (options.content) {
        const contentOptions: Partial<ContentSearchOptions> = {
          ...searchOptions,
          fileExtensions: options.type || []
        };
        results = await engine.searchByContent(query, contentOptions);
      } else if (options.regex) {
        results = await engine.searchByRegex(query, searchOptions);
      } else {
        results = await engine.searchByName(query, searchOptions);
      }

      if (Object.keys(filterOptions).length > 0) {
        results = engine.filterResults(results, filterOptions);
      }

      results = engine.sortResults(results, options.sort as SortOption, options.order as SortOrder);

      outputResults(results, options.format, options.content);

      engine.close();

      process.exit(results.length > 0 ? 0 : 1);
    } catch (error: any) {
      console.error(`Error: ${error.message}`);
      process.exit(2);
    }
  });

program
  .command('build')
  .description('Build or update the search index')
  .option('-p, --path <directories>', 'Directories to index (comma-separated)', parsePaths)
  .option('--rebuild', 'Rebuild index from scratch')
  .option('--db <path>', 'Path to index database', getDefaultIndexPath())
  .action(async (options: any) => {
    try {
      const engine = new LocalSearchEngine({
        dbPath: options.db,
        logLevel: 'info',
        indexConfig: {
          includePaths: options.path || []
        }
      });

      await engine.initialize();

      console.log('Building index...');
      console.log('Paths to index:', options.path || 'default paths');
      
      engine.on('indexing-progress', (data: any) => {
        process.stdout.write(`\rIndexed ${data.indexedFiles} files...`);
      });

      if (options.rebuild) {
        await engine.rebuildIndex();
      } else {
        await engine.buildIndex(options.path);
      }

      console.log('\nIndex built successfully.');
      engine.close();
    } catch (error: any) {
      console.error(`Error: ${error.message}`);
      process.exit(2);
    }
  });

program
  .command('status')
  .description('Show index status')
  .option('--db <path>', 'Path to index database', getDefaultIndexPath())
  .action(async (options: any) => {
    try {
      const engine = new LocalSearchEngine({
        dbPath: options.db,
        logLevel: 'error'
      });

      await engine.initialize();
      const status = engine.getIndexStatus();
      
      console.log('Index Status:');
      console.log(`  Total files: ${status.totalFiles}`);
      console.log(`  Last update: ${status.lastUpdateTime.toLocaleString()}`);
      console.log(`  Indexing: ${status.isIndexing ? 'Yes' : 'No'}`);
      
      engine.close();
    } catch (error: any) {
      console.error(`Error: ${error.message}`);
      process.exit(2);
    }
  });

function parseExtensions(value: string): string[] {
  return value.split(',').map(ext => {
    if (!ext.startsWith('.')) {
      return '.' + ext;
    }
    return ext.toLowerCase();
  });
}

function parsePaths(value: string): string[] {
  return value.split(',').map(p => path.resolve(p.trim()));
}

function parseSizeRange(value: string): { min: number; max: number } {
  const units: { [key: string]: number } = {
    'B': 1,
    'KB': 1024,
    'MB': 1024 * 1024,
    'GB': 1024 * 1024 * 1024
  };

  const parseSize = (sizeStr: string): number => {
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)?$/i);
    if (!match) throw new Error(`Invalid size format: ${sizeStr}`);
    const num = parseFloat(match[1]);
    const unit = (match[2] || 'B').toUpperCase();
    return num * (units[unit] || 1);
  };

  const parts = value.split('-');
  if (parts.length === 1) {
    const size = parseSize(parts[0]);
    return { min: 0, max: size };
  }
  
  return { min: parseSize(parts[0]), max: parseSize(parts[1]) };
}

function parseDateRange(value: string): { start: Date; end: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (value.toLowerCase()) {
    case 'today':
      return { start: today, end: now };
    case 'yesterday':
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: yesterday, end: today };
    case 'week':
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return { start: weekAgo, end: now };
    case 'month':
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return { start: monthAgo, end: now };
    case 'year':
      const yearAgo = new Date(today);
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      return { start: yearAgo, end: now };
    default:
      const match = value.match(/^(\d{4}-\d{2}-\d{2})-(\d{4}-\d{2}-\d{2})$/);
      if (match) {
        return {
          start: new Date(match[1]),
          end: new Date(match[2])
        };
      }
      throw new Error(`Invalid date range format: ${value}`);
  }
}

function getDefaultIndexPath(): string {
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

function outputResults(results: SearchResult[] | ContentSearchResult[], format: string, isContent: boolean): void {
  switch (format) {
    case 'json':
      console.log(JSON.stringify(results, null, 2));
      break;
    case 'csv':
      console.log('Path,Name,Size,Modified,Extension');
      for (const r of results) {
        console.log(`"${r.path}","${r.name}",${r.size},"${r.modifiedTime.toISOString()}","${r.extension}"`);
      }
      break;
    default:
      for (const r of results) {
        console.log(r.path);
        if (isContent && 'matches' in r) {
          for (const match of r.matches) {
            console.log(`  Line ${match.lineNumber}: ${match.lineContent.trim()}`);
          }
        }
      }
      console.log(`\n${results.length} result(s) found.`);
  }
}

export { program };

if (require.main === module) {
  program.parse();
}
