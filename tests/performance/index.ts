import * as fs from 'fs';
import * as path from 'path';
import { LocalSearchEngine } from '../../src/index';
import { PERFORMANCE_TARGETS } from '../../src/types';

const TEST_DIR = path.join(__dirname, 'performance-test-files');
const TEST_DB_PATH = path.join(__dirname, 'performance-test.db');

interface PerformanceResult {
  name: string;
  target: number;
  actual: number;
  unit: string;
  passed: boolean;
}

async function runPerformanceTests(): Promise<PerformanceResult[]> {
  const results: PerformanceResult[] = [];

  console.log('Setting up test environment...');
  
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });

  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }

  const engine = new LocalSearchEngine({
    dbPath: TEST_DB_PATH,
    logLevel: 'error'
  });

  try {
    console.log('\n1. Testing search response time...');
    
    for (let i = 0; i < 10000; i++) {
      fs.writeFileSync(path.join(TEST_DIR, `file${i}.txt`), `content ${i}`);
    }
    
    await engine.buildIndex([TEST_DIR]);
    
    const searchTimes: number[] = [];
    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await engine.searchByName(`file${i * 100}`, { matchMode: 'fuzzy' });
      searchTimes.push(Date.now() - start);
    }
    
    const avgSearchTime = searchTimes.reduce((a, b) => a + b, 0) / searchTimes.length;
    results.push({
      name: 'Search Response Time',
      target: PERFORMANCE_TARGETS.SEARCH_RESPONSE_TIME_MS,
      actual: avgSearchTime,
      unit: 'ms',
      passed: avgSearchTime < PERFORMANCE_TARGETS.SEARCH_RESPONSE_TIME_MS
    });

    console.log('\n2. Testing sort performance...');
    
    const allResults = await engine.searchByName('', { maxResults: 10000 });
    const sortStart = Date.now();
    engine.sortResults(allResults, 'size', 'desc');
    const sortTime = Date.now() - sortStart;
    
    results.push({
      name: 'Sort Time (10000 results)',
      target: PERFORMANCE_TARGETS.SORT_TIME_MS,
      actual: sortTime,
      unit: 'ms',
      passed: sortTime < PERFORMANCE_TARGETS.SORT_TIME_MS
    });

    console.log('\n3. Testing regex search...');
    
    const regexStart = Date.now();
    await engine.searchByRegex('file\\d+\\.txt', { maxResults: 100 });
    const regexTime = Date.now() - regexStart;
    
    results.push({
      name: 'Regex Search Time',
      target: PERFORMANCE_TARGETS.REGEX_SEARCH_TIME_MS,
      actual: regexTime,
      unit: 'ms',
      passed: regexTime < PERFORMANCE_TARGETS.REGEX_SEARCH_TIME_MS
    });

    console.log('\n4. Testing index load time...');
    
    engine.close();
    
    const loadStart = Date.now();
    const newEngine = new LocalSearchEngine({
      dbPath: TEST_DB_PATH,
      logLevel: 'error'
    });
    const loadTime = Date.now() - loadStart;
    
    results.push({
      name: 'Index Load Time',
      target: PERFORMANCE_TARGETS.INDEX_LOAD_TIME_MS,
      actual: loadTime,
      unit: 'ms',
      passed: loadTime < PERFORMANCE_TARGETS.INDEX_LOAD_TIME_MS
    });

    console.log('\n5. Testing database size...');
    
    const dbSize = fs.statSync(TEST_DB_PATH).size;
    const dbSizeMB = dbSize / (1024 * 1024);
    
    results.push({
      name: 'Database Size (10000 files)',
      target: PERFORMANCE_TARGETS.MAX_INDEX_SIZE_MB,
      actual: parseFloat(dbSizeMB.toFixed(2)),
      unit: 'MB',
      passed: dbSizeMB < PERFORMANCE_TARGETS.MAX_INDEX_SIZE_MB
    });

    console.log('\n6. Testing filter performance...');
    
    const filterStart = Date.now();
    engine.filterResults(allResults, {
      sizeRange: { min: 0, max: 100 },
      extensions: ['.txt']
    });
    const filterTime = Date.now() - filterStart;
    
    results.push({
      name: 'Filter Time',
      target: 50,
      actual: filterTime,
      unit: 'ms',
      passed: filterTime < 50
    });

    newEngine.close();

  } finally {
    console.log('\nCleaning up...');
    
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  }

  return results;
}

async function main() {
  console.log('========================================');
  console.log('  Local Search Engine Performance Tests');
  console.log('========================================\n');

  const results = await runPerformanceTests();

  console.log('\n========================================');
  console.log('  Performance Test Results');
  console.log('========================================\n');

  console.log('| Test | Target | Actual | Unit | Status |');
  console.log('|------|--------|--------|------|--------|');
  
  let passed = 0;
  let failed = 0;

  for (const result of results) {
    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`| ${result.name} | < ${result.target} | ${result.actual} | ${result.unit} | ${status} |`);
    
    if (result.passed) passed++;
    else failed++;
  }

  console.log('\n----------------------------------------');
  console.log(`Total: ${results.length} tests`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Pass Rate: ${((passed / results.length) * 100).toFixed(1)}%`);
  console.log('----------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(console.error);
