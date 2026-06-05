# Local Search Engine

一款高性能的本地文件搜索引擎，提供毫秒级搜索响应。

## 特性

- ⚡ **毫秒级搜索** - 文件名搜索响应时间 < 100ms
- 🔍 **多种搜索模式** - 支持精确匹配、模糊匹配、通配符、正则表达式
- 📄 **内容搜索** - 在文本文件中搜索指定内容
- 🎯 **高级筛选** - 按大小、时间、类型等条件筛选
- 🔄 **智能索引** - 自动检测文件变更并更新索引
- 🖥️ **跨平台** - 支持 Windows、macOS、Linux
- 📦 **命令行工具** - 完整的CLI支持

## 安装

```bash
# 克隆仓库
git clone <repository-url>
cd local-search-engine

# 安装依赖
npm install

# 编译
npm run build

# 全局安装（可选）
npm link
```

## 快速开始

### 建立索引

```bash
search index
```

### 搜索文件

```bash
# 搜索文件名
search readme

# 使用通配符
search "*.txt"

# 正则表达式搜索
search -r "file\d+\.txt"

# 内容搜索
search -c "TODO" -t .ts
```

## 命令行用法

```
search [选项] [查询]

选项:
  -t, --type <extensions>   按文件类型筛选
  -s, --size <range>        按文件大小筛选 (如: 1KB-10MB)
  -d, --date <range>        按日期筛选 (today|week|month|year)
  -p, --path <directory>    指定搜索目录
  -r, --regex               启用正则表达式
  -c, --content             搜索文件内容
  -f, --format <type>       输出格式 (text|json|csv)
  -l, --limit <n>           限制结果数量
  --case-sensitive          区分大小写
  --exact                   精确匹配模式
  --sort <field>            排序字段
  --order <direction>       排序方向 (asc|desc)
```

## API 使用

```typescript
import { LocalSearchEngine } from 'local-search-engine';

const engine = new LocalSearchEngine();

// 建立索引
await engine.buildIndex(['/home/user/documents']);

// 搜索文件
const results = engine.searchByName('readme', {
  matchMode: 'fuzzy',
  maxResults: 100
});

// 筛选和排序
const filtered = engine.filterResults(results, {
  sizeRange: { min: 1024, max: 1024 * 1024 },
  extensions: ['.txt', '.md']
});

const sorted = engine.sortResults(filtered, 'size', 'desc');

// 关闭
engine.close();
```

## 项目结构

```
local-search-engine/
├── src/
│   ├── cli/              # 命令行界面
│   ├── core/             # 核心模块
│   │   ├── index-manager.ts
│   │   ├── search-engine.ts
│   │   ├── file-watcher.ts
│   │   └── file-operations.ts
│   ├── database/         # 数据库模块
│   ├── types/            # 类型定义
│   ├── utils/            # 工具函数
│   └── index.ts          # 入口文件
├── tests/                # 测试文件
│   ├── database.test.ts
│   ├── search-engine.test.ts
│   ├── index-manager.test.ts
│   ├── integration.test.ts
│   └── performance/
├── docs/                 # 文档
│   ├── TEST_REPORT.md
│   └── USER_MANUAL.md
├── package.json
├── tsconfig.json
└── jest.config.js
```

## 性能指标

| 指标 | 目标值 | 实际值 |
|------|--------|--------|
| 文件名搜索响应 | < 100ms | ~15ms |
| 正则搜索响应 | < 500ms | ~120ms |
| 结果排序 (10000条) | < 50ms | ~8ms |
| 索引加载 | < 3s | ~500ms |
| 内存占用 (空闲) | < 50MB | ~35MB |

## 开发

```bash
# 运行测试
npm test

# 测试覆盖率
npm run test:coverage

# 性能测试
npm run test:performance

# 编译
npm run build
```

## 技术栈

- **语言**: TypeScript
- **运行时**: Node.js 18+
- **数据库**: better-sqlite3
- **文件监控**: chokidar
- **CLI框架**: commander
- **测试框架**: Jest

## 许可证

MIT
