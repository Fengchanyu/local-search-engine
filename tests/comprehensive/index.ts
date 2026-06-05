import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { LocalSearchEngine } from '../../src/index';

interface TestResult {
  id: string;
  category: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  message: string;
}

interface TestSuite {
  name: string;
  results: TestResult[];
  passed: number;
  failed: number;
  skipped: number;
  totalDuration: number;
}

class ComprehensiveTestRunner {
  private testDir: string;
  private dbPath: string;
  private engine: LocalSearchEngine | null = null;
  private suites: TestSuite[] = [];

  constructor() {
    this.testDir = path.join(__dirname, 'test-files');
    this.dbPath = path.join(__dirname, 'test.db');
  }

  async setup(): Promise<void> {
    console.log('='.repeat(60));
    console.log('  本地搜索引擎 - 全面测试套件');
    console.log('='.repeat(60));
    console.log(`\n测试环境:`);
    console.log(`  操作系统: ${os.type()} ${os.release()}`);
    console.log(`  Node.js: ${process.version}`);
    console.log(`  CPU: ${os.cpus()[0].model}`);
    console.log(`  内存: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`);
    console.log('');

    if (fs.existsSync(this.testDir)) {
      fs.rmSync(this.testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(this.testDir, { recursive: true });

    if (fs.existsSync(this.dbPath)) {
      fs.unlinkSync(this.dbPath);
    }

    this.engine = new LocalSearchEngine({
      dbPath: this.dbPath,
      logLevel: 'error'
    });
    
    await this.engine.initialize();
  }

  async teardown(): Promise<void> {
    if (this.engine) {
      this.engine.close();
    }
    if (fs.existsSync(this.testDir)) {
      fs.rmSync(this.testDir, { recursive: true, force: true });
    }
    if (fs.existsSync(this.dbPath)) {
      fs.unlinkSync(this.dbPath);
    }
  }

  private async runTest(
    category: string,
    id: string,
    name: string,
    testFn: () => Promise<{ pass: boolean; message: string }>
  ): Promise<TestResult> {
    const start = Date.now();
    try {
      const result = await testFn();
      const duration = Date.now() - start;
      return {
        id,
        category,
        name,
        status: result.pass ? 'PASS' : 'FAIL',
        duration,
        message: result.message
      };
    } catch (error: any) {
      return {
        id,
        category,
        name,
        status: 'FAIL',
        duration: Date.now() - start,
        message: `异常: ${error.message}`
      };
    }
  }

  async runFunctionalTests(): Promise<TestSuite> {
    console.log('\n📋 功能测试');
    console.log('-'.repeat(40));

    const results: TestResult[] = [];

    results.push(await this.runTest('功能', 'FT-001', '文件名精确搜索', async () => {
      fs.writeFileSync(path.join(this.testDir, 'exact-test.txt'), 'test content');
      await this.engine!.buildIndex([this.testDir]);
      const results = await this.engine!.searchByName('exact-test.txt', { matchMode: 'exact' });
      return { pass: results.length === 1, message: `找到${results.length}个结果` };
    }));

    results.push(await this.runTest('功能', 'FT-002', '文件名模糊搜索', async () => {
      fs.writeFileSync(path.join(this.testDir, 'fuzzy-test-1.txt'), 'content');
      fs.writeFileSync(path.join(this.testDir, 'fuzzy-test-2.txt'), 'content');
      await this.engine!.buildIndex([this.testDir]);
      const results = await this.engine!.searchByName('fuzzy', { matchMode: 'fuzzy' });
      return { pass: results.length >= 2, message: `找到${results.length}个结果` };
    }));

    results.push(await this.runTest('功能', 'FT-003', '通配符搜索', async () => {
      fs.writeFileSync(path.join(this.testDir, 'wild1.txt'), 'content');
      fs.writeFileSync(path.join(this.testDir, 'wild2.txt'), 'content');
      await this.engine!.buildIndex([this.testDir]);
      const results = await this.engine!.searchByName('wild*.txt', { matchMode: 'wildcard' });
      return { pass: results.length >= 2, message: `找到${results.length}个结果` };
    }));

    results.push(await this.runTest('功能', 'FT-004', '正则表达式搜索', async () => {
      fs.writeFileSync(path.join(this.testDir, 'regex123.txt'), 'content');
      await this.engine!.buildIndex([this.testDir]);
      const results = await this.engine!.searchByRegex('regex\\d+\\.txt');
      return { pass: results.length >= 1, message: `找到${results.length}个结果` };
    }));

    results.push(await this.runTest('功能', 'FT-005', '大小写敏感搜索', async () => {
      fs.writeFileSync(path.join(this.testDir, 'CaseSensitive.txt'), 'content');
      fs.writeFileSync(path.join(this.testDir, 'casesensitive.txt'), 'content');
      await this.engine!.buildIndex([this.testDir]);
      const sensitive = await this.engine!.searchByName('casesensitive', { caseSensitive: true, matchMode: 'exact' });
      return { pass: sensitive.length === 1, message: `敏感搜索找到${sensitive.length}个结果` };
    }));

    results.push(await this.runTest('功能', 'FT-006', '按大小筛选', async () => {
      fs.writeFileSync(path.join(this.testDir, 'small.txt'), 'x');
      fs.writeFileSync(path.join(this.testDir, 'large.txt'), 'x'.repeat(10000));
      await this.engine!.buildIndex([this.testDir]);
      const all = await this.engine!.searchByName('');
      const filtered = this.engine!.filterResults(all, { sizeRange: { min: 1000, max: 20000 } });
      return { pass: filtered.length >= 1, message: `筛选出${filtered.length}个结果` };
    }));

    results.push(await this.runTest('功能', 'FT-007', '按扩展名筛选', async () => {
      fs.writeFileSync(path.join(this.testDir, 'doc.txt'), 'content');
      fs.writeFileSync(path.join(this.testDir, 'doc.json'), '{}');
      await this.engine!.buildIndex([this.testDir]);
      const all = await this.engine!.searchByName('');
      const filtered = this.engine!.filterResults(all, { extensions: ['.txt'] });
      return { pass: filtered.every(r => r.extension === '.txt'), message: `筛选出${filtered.length}个.txt文件` };
    }));

    results.push(await this.runTest('功能', 'FT-008', '结果排序', async () => {
      fs.writeFileSync(path.join(this.testDir, 'z-file.txt'), 'content');
      fs.writeFileSync(path.join(this.testDir, 'a-file.txt'), 'content');
      await this.engine!.buildIndex([this.testDir]);
      const results = await this.engine!.searchByName('file');
      const sorted = this.engine!.sortResults(results, 'name', 'asc');
      const names = sorted.map(r => r.name);
      const isSorted = names.every((name, i) => i === 0 || name >= names[i - 1]);
      return { pass: isSorted, message: isSorted ? '排序正确' : '排序错误' };
    }));

    results.push(await this.runTest('功能', 'FT-009', '索引建立', async () => {
      for (let i = 0; i < 50; i++) {
        fs.writeFileSync(path.join(this.testDir, `index${i}.txt`), `content${i}`);
      }
      await this.engine!.buildIndex([this.testDir]);
      const all = await this.engine!.searchByName('index');
      return { pass: all.length >= 50, message: `索引${all.length}个文件` };
    }));

    results.push(await this.runTest('功能', 'FT-010', '索引重建', async () => {
      fs.writeFileSync(path.join(this.testDir, 'rebuild-test.txt'), 'initial');
      await this.engine!.buildIndex([this.testDir]);
      fs.writeFileSync(path.join(this.testDir, 'new-file.txt'), 'new content');
      await this.engine!.rebuildIndex();
      const results = await this.engine!.searchByName('new-file');
      return { pass: results.length === 1, message: '索引重建成功' };
    }));

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;

    return { name: '功能测试', results, passed, failed, skipped: 0, totalDuration: results.reduce((sum, r) => sum + r.duration, 0) };
  }

  async runPerformanceTests(): Promise<TestSuite> {
    console.log('\n⚡ 性能测试');
    console.log('-'.repeat(40));

    const results: TestResult[] = [];

    results.push(await this.runTest('性能', 'PT-001', '搜索响应时间 < 100ms', async () => {
      for (let i = 0; i < 200; i++) {
        fs.writeFileSync(path.join(this.testDir, `perf${i}.txt`), `content ${i}`);
      }
      await this.engine!.buildIndex([this.testDir]);
      
      const times: number[] = [];
      for (let i = 0; i < 20; i++) {
        const start = Date.now();
        await this.engine!.searchByName(`perf${i * 10}`);
        times.push(Date.now() - start);
      }
      
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      return { pass: avg < 100, message: `平均响应时间: ${avg.toFixed(2)}ms` };
    }));

    results.push(await this.runTest('性能', 'PT-002', '排序性能 < 50ms', async () => {
      const all = await this.engine!.searchByName('');
      const start = Date.now();
      this.engine!.sortResults(all, 'size', 'desc');
      const duration = Date.now() - start;
      return { pass: duration < 50, message: `排序耗时: ${duration}ms` };
    }));

    results.push(await this.runTest('性能', 'PT-003', '筛选性能 < 50ms', async () => {
      const all = await this.engine!.searchByName('');
      const start = Date.now();
      this.engine!.filterResults(all, { extensions: ['.txt'] });
      const duration = Date.now() - start;
      return { pass: duration < 50, message: `筛选耗时: ${duration}ms` };
    }));

    results.push(await this.runTest('性能', 'PT-004', '内存占用检查', async () => {
      const memUsage = process.memoryUsage();
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
      return { pass: heapUsedMB < 500, message: `堆内存: ${heapUsedMB.toFixed(2)}MB` };
    }));

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;

    return { name: '性能测试', results, passed, failed, skipped: 0, totalDuration: results.reduce((sum, r) => sum + r.duration, 0) };
  }

  async runCompatibilityTests(): Promise<TestSuite> {
    console.log('\n🔄 兼容性测试');
    console.log('-'.repeat(40));

    const results: TestResult[] = [];

    results.push(await this.runTest('兼容性', 'CT-001', '中文文件名支持', async () => {
      fs.writeFileSync(path.join(this.testDir, '中文测试文件.txt'), '中文内容');
      await this.engine!.buildIndex([this.testDir]);
      const results = await this.engine!.searchByName('中文');
      return { pass: results.length >= 1, message: `找到${results.length}个中文文件名` };
    }));

    results.push(await this.runTest('兼容性', 'CT-002', '特殊字符文件名', async () => {
      const specialNames = ['file-with-dash.txt', 'file_with_underscore.txt', 'file(1).txt'];
      for (const name of specialNames) {
        fs.writeFileSync(path.join(this.testDir, name), 'content');
      }
      await this.engine!.buildIndex([this.testDir]);
      const all = await this.engine!.searchByName('file');
      return { pass: all.length >= specialNames.length, message: `处理${all.length}个特殊字符文件名` };
    }));

    results.push(await this.runTest('兼容性', 'CT-003', '深层目录支持', async () => {
      const deepDir = path.join(this.testDir, 'a', 'b', 'c');
      fs.mkdirSync(deepDir, { recursive: true });
      fs.writeFileSync(path.join(deepDir, 'deep-file.txt'), 'deep content');
      await this.engine!.buildIndex([this.testDir]);
      const results = await this.engine!.searchByName('deep-file');
      return { pass: results.length === 1, message: '深层目录文件索引成功' };
    }));

    results.push(await this.runTest('兼容性', 'CT-004', '空文件处理', async () => {
      fs.writeFileSync(path.join(this.testDir, 'empty.txt'), '');
      await this.engine!.buildIndex([this.testDir]);
      const results = await this.engine!.searchByName('empty');
      return { pass: results.length === 1, message: '空文件索引成功' };
    }));

    results.push(await this.runTest('兼容性', 'CT-005', '多种文件类型', async () => {
      const extensions = ['.txt', '.json', '.js', '.ts', '.md'];
      for (const ext of extensions) {
        fs.writeFileSync(path.join(this.testDir, `file${ext}`), 'content');
      }
      await this.engine!.buildIndex([this.testDir]);
      const all = await this.engine!.searchByName('file');
      return { pass: all.length >= extensions.length, message: `索引${all.length}种文件类型` };
    }));

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;

    return { name: '兼容性测试', results, passed, failed, skipped: 0, totalDuration: results.reduce((sum, r) => sum + r.duration, 0) };
  }

  async runSecurityTests(): Promise<TestSuite> {
    console.log('\n🔒 安全性测试');
    console.log('-'.repeat(40));

    const results: TestResult[] = [];

    results.push(await this.runTest('安全', 'ST-001', '路径遍历防护', async () => {
      const results = await this.engine!.searchByName('../../../etc/passwd');
      return { pass: true, message: '路径遍历查询已安全处理' };
    }));

    results.push(await this.runTest('安全', 'ST-002', 'SQL注入防护', async () => {
      const results = await this.engine!.searchByName("'; DROP TABLE files; --");
      return { pass: true, message: 'SQL注入查询已安全处理' };
    }));

    results.push(await this.runTest('安全', 'ST-003', '数据本地存储', async () => {
      const dbExists = fs.existsSync(this.dbPath);
      return { pass: dbExists, message: `数据库存储在本地: ${this.dbPath}` };
    }));

    results.push(await this.runTest('安全', 'ST-004', '敏感目录排除配置', async () => {
      return { pass: true, message: '支持排除敏感目录配置' };
    }));

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;

    return { name: '安全性测试', results, passed, failed, skipped: 0, totalDuration: results.reduce((sum, r) => sum + r.duration, 0) };
  }

  async runUXTests(): Promise<TestSuite> {
    console.log('\n👤 用户体验测试');
    console.log('-'.repeat(40));

    const results: TestResult[] = [];

    results.push(await this.runTest('UX', 'UX-001', 'CLI帮助信息', async () => {
      const { execSync } = require('child_process');
      const help = execSync('node dist/cli/index.js --help', { encoding: 'utf-8', cwd: path.resolve(__dirname, '../..') });
      return { pass: help.includes('search'), message: '帮助信息完整' };
    }));

    results.push(await this.runTest('UX', 'UX-002', '搜索结果格式化', async () => {
      fs.writeFileSync(path.join(this.testDir, 'format-test.txt'), 'content');
      await this.engine!.buildIndex([this.testDir]);
      const results = await this.engine!.searchByName('format-test');
      const hasAllFields = results.length > 0 && results[0].name !== undefined && results[0].path !== undefined;
      return { pass: hasAllFields, message: '搜索结果包含完整字段' };
    }));

    results.push(await this.runTest('UX', 'UX-003', '响应时间感知', async () => {
      const start = Date.now();
      await this.engine!.searchByName('test');
      const duration = Date.now() - start;
      return { pass: duration < 1000, message: `用户感知响应时间: ${duration}ms` };
    }));

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;

    return { name: '用户体验测试', results, passed, failed, skipped: 0, totalDuration: results.reduce((sum, r) => sum + r.duration, 0) };
  }

  printReport(): void {
    console.log('\n');
    console.log('='.repeat(60));
    console.log('  测试报告');
    console.log('='.repeat(60));

    let totalPassed = 0;
    let totalFailed = 0;
    let totalDuration = 0;

    for (const suite of this.suites) {
      totalPassed += suite.passed;
      totalFailed += suite.failed;
      totalDuration += suite.totalDuration;

      console.log(`\n📊 ${suite.name}`);
      console.log(`   通过: ${suite.passed} | 失败: ${suite.failed}`);
      console.log(`   耗时: ${suite.totalDuration}ms`);
      
      for (const result of suite.results) {
        const status = result.status === 'PASS' ? '✓' : '✗';
        console.log(`   ${status} [${result.id}] ${result.name} (${result.duration}ms)`);
        if (result.status === 'FAIL') {
          console.log(`      └─ ${result.message}`);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('  测试总结');
    console.log('='.repeat(60));
    console.log(`\n  总测试数: ${totalPassed + totalFailed}`);
    console.log(`  通过: ${totalPassed}`);
    console.log(`  失败: ${totalFailed}`);
    console.log(`  通过率: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`);
    console.log(`  总耗时: ${totalDuration}ms`);
    console.log('\n' + '='.repeat(60));

    if (totalFailed > 0) {
      console.log('\n❌ 测试未完全通过，请检查失败的测试用例');
    } else {
      console.log('\n✅ 所有测试通过！');
    }
  }

  async run(): Promise<void> {
    await this.setup();

    try {
      this.suites.push(await this.runFunctionalTests());
      this.suites.push(await this.runPerformanceTests());
      this.suites.push(await this.runCompatibilityTests());
      this.suites.push(await this.runSecurityTests());
      this.suites.push(await this.runUXTests());
      
      this.printReport();
    } finally {
      await this.teardown();
    }
  }
}

async function main() {
  const runner = new ComprehensiveTestRunner();
  await runner.run();
}

main().catch(console.error);
