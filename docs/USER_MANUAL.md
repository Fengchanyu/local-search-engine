# 本地搜索引擎用户手册

**软件名称**: Local Search Engine  
**版本**: 1.0.0  
**发布日期**: 2026-05-22

---

## 目录

1. [软件简介](#1-软件简介)
2. [系统要求](#2-系统要求)
3. [安装指南](#3-安装指南)
4. [快速入门](#4-快速入门)
5. [命令行使用](#5-命令行使用)
6. [API使用指南](#6-api使用指南)
7. [配置说明](#7-配置说明)
8. [常见问题](#8-常见问题)
9. [技术支持](#9-技术支持)

---

## 1. 软件简介

### 1.1 产品概述

Local Search Engine 是一款高性能的本地文件搜索引擎，提供毫秒级的文件搜索响应。类似于Everything，但具有跨平台支持、内容搜索、正则表达式搜索等高级功能。

### 1.2 主要功能

- **快速文件名搜索**: 毫秒级响应，支持精确匹配、模糊匹配、通配符匹配
- **文件内容搜索**: 在文本文件中搜索指定内容
- **正则表达式搜索**: 使用正则表达式进行高级模式匹配
- **高级筛选**: 按文件大小、修改时间、文件类型等条件筛选
- **智能索引**: 自动建立和更新文件索引
- **跨平台支持**: 支持 Windows、macOS、Linux

### 1.3 适用场景

- 快速定位项目文件
- 搜索代码文件中的特定内容
- 查找特定大小或时间的文件
- 批量文件管理

---

## 2. 系统要求

### 2.1 操作系统要求

| 操作系统 | 最低版本 | 推荐版本 |
|----------|----------|----------|
| Windows | Windows 10 | Windows 11 |
| macOS | macOS 11.0 | macOS 13.0+ |
| Linux | Ubuntu 20.04 | Ubuntu 22.04+ |

### 2.2 硬件要求

| 配置项 | 最低要求 | 推荐配置 |
|--------|----------|----------|
| CPU | 双核 1.5GHz | 四核 2.0GHz+ |
| 内存 | 2GB | 4GB+ |
| 磁盘空间 | 100MB | 500MB+ |

### 2.3 软件依赖

- Node.js 18.0.0 或更高版本
- npm 9.0.0 或更高版本

---

## 3. 安装指南

### 3.1 从源码安装

```bash
# 克隆仓库
git clone <repository-url>
cd local-search-engine

# 安装依赖
npm install

# 编译项目
npm run build

# 全局安装（可选）
npm link
```

### 3.2 验证安装

```bash
# 检查版本
search --version

# 显示帮助
search --help
```

---

## 4. 快速入门

### 4.1 建立索引

首次使用需要建立文件索引：

```bash
# 建立默认索引
search index

# 指定目录索引
search index -p /home/user/documents,/home/user/projects

# 重建索引
search index --rebuild
```

### 4.2 基本搜索

```bash
# 搜索文件名包含"readme"的文件
search readme

# 搜索特定扩展名的文件
search "*.txt"

# 限制结果数量
search "project" -l 20
```

### 4.3 高级搜索

```bash
# 使用正则表达式搜索
search -r "file\d+\.txt"

# 搜索文件内容
search -c "TODO" -t .ts,.js

# 按大小筛选
search "video" -s 100MB-1GB

# 按日期筛选
search "report" -d month
```

---

## 5. 命令行使用

### 5.1 命令格式

```
search [选项] [查询]
```

### 5.2 全局选项

| 选项 | 简写 | 描述 |
|------|------|------|
| --version | -V | 显示版本号 |
| --help | -h | 显示帮助信息 |

### 5.3 搜索选项

| 选项 | 简写 | 描述 | 示例 |
|------|------|------|------|
| --type | -t | 按文件类型筛选 | `-t .txt,.md` |
| --size | -s | 按文件大小筛选 | `-s 1KB-10MB` |
| --date | -d | 按日期筛选 | `-d week` |
| --path | -p | 指定搜索目录 | `-p /home/user` |
| --regex | -r | 启用正则表达式 | `-r` |
| --content | -c | 搜索文件内容 | `-c` |
| --format | -f | 输出格式 | `-f json` |
| --limit | -l | 限制结果数量 | `-l 100` |
| --case-sensitive | | 区分大小写 | `--case-sensitive` |
| --exact | | 精确匹配模式 | `--exact` |
| --sort | | 排序字段 | `--sort size` |
| --order | | 排序方向 | `--order desc` |

### 5.4 日期筛选选项

| 值 | 描述 |
|------|------|
| today | 今天修改的文件 |
| yesterday | 昨天修改的文件 |
| week | 最近一周修改的文件 |
| month | 最近一个月修改的文件 |
| year | 最近一年修改的文件 |
| YYYY-MM-DD-YYYY-MM-DD | 自定义日期范围 |

### 5.5 输出格式

| 格式 | 描述 |
|------|------|
| text | 纯文本格式（默认） |
| json | JSON格式 |
| csv | CSV格式 |

### 5.6 子命令

#### index 子命令

建立或更新索引：

```bash
search index [选项]

选项:
  -p, --path <directories>  指定索引目录
  --rebuild                 重建索引
  --index-path <path>       指定索引数据库路径
```

#### status 子命令

查看索引状态：

```bash
search status [选项]

选项:
  --index-path <path>  指定索引数据库路径
```

### 5.7 使用示例

```bash
# 示例1: 搜索所有Markdown文件
search "*.md"

# 示例2: 搜索最近一周修改的文档
search "report" -d week -t .doc,.pdf

# 示例3: 搜索大于10MB的视频文件
search "" -s 10MB- -t .mp4,.mkv,.avi

# 示例4: 在TypeScript文件中搜索"interface"
search -c "interface" -t .ts

# 示例5: 使用正则表达式搜索日期格式
search -r "\d{4}-\d{2}-\d{2}"

# 示例6: 输出JSON格式并按大小降序排序
search "backup" -f json --sort size --order desc

# 示例7: 在特定目录中搜索
search "config" -p /etc -f json
```

---

## 6. API使用指南

### 6.1 基本用法

```typescript
import { LocalSearchEngine } from 'local-search-engine';

// 创建实例
const engine = new LocalSearchEngine({
  dbPath: './index.db',
  logLevel: 'info'
});

// 建立索引
await engine.buildIndex(['/home/user/documents']);

// 搜索文件
const results = engine.searchByName('readme', {
  matchMode: 'fuzzy',
  maxResults: 100
});

// 输出结果
results.forEach(result => {
  console.log(result.path);
});

// 关闭引擎
engine.close();
```

### 6.2 搜索选项

```typescript
// 文件名搜索
const results = engine.searchByName('query', {
  caseSensitive: false,      // 是否区分大小写
  matchMode: 'fuzzy',        // 匹配模式: 'exact' | 'fuzzy' | 'wildcard'
  maxResults: 100            // 最大结果数
});

// 内容搜索
const contentResults = engine.searchByContent('TODO', {
  fileExtensions: ['.ts', '.js'],  // 文件扩展名
  contextLines: 2,                  // 上下文行数
  encoding: 'auto',                 // 编码: 'auto' | 'utf-8' | 'gbk'
  maxResults: 50
});

// 正则表达式搜索
const regexResults = engine.searchByRegex('file\\d+\\.txt', {
  flags: 'i',                // 正则标志
  maxResults: 100
});
```

### 6.3 筛选和排序

```typescript
// 筛选结果
const filtered = engine.filterResults(results, {
  sizeRange: { min: 1024, max: 1024 * 1024 },  // 1KB - 1MB
  dateRange: { 
    start: new Date('2024-01-01'), 
    end: new Date() 
  },
  extensions: ['.txt', '.md'],
  directory: '/home/user/documents'
});

// 排序结果
const sorted = engine.sortResults(filtered, 'size', 'desc');
// 排序选项: 'relevance' | 'name' | 'path' | 'size' | 'modifiedTime' | 'createdTime'
```

### 6.4 文件操作

```typescript
// 打开文件
await engine.openFile('/path/to/file.txt');

// 在文件管理器中显示
await engine.openInExplorer('/path/to/file.txt');

// 复制路径到剪贴板
await engine.copyPath('/path/to/file.txt');

// 复制文件
await engine.copyFile('/source/file.txt', '/dest/file.txt');

// 删除文件（移至回收站）
await engine.deleteFiles(['/path/to/file1.txt', '/path/to/file2.txt']);
```

### 6.5 索引管理

```typescript
// 获取索引状态
const status = engine.getIndexStatus();
console.log(`Total files: ${status.totalFiles}`);
console.log(`Last update: ${status.lastUpdateTime}`);

// 暂停/恢复索引
engine.pauseIndexing();
engine.resumeIndexing();

// 重建索引
await engine.rebuildIndex();

// 优化数据库
engine.optimizeDatabase();
```

### 6.6 事件监听

```typescript
engine.on('indexing-started', (data) => {
  console.log('Indexing started:', data.paths);
});

engine.on('indexing-progress', (data) => {
  console.log(`Indexed ${data.indexedFiles} files...`);
});

engine.on('indexing-completed', (data) => {
  console.log(`Indexing completed: ${data.totalFiles} files`);
});

engine.on('indexing-error', (error) => {
  console.error('Indexing error:', error);
});
```

---

## 7. 配置说明

### 7.1 索引配置

```typescript
const engine = new LocalSearchEngine({
  dbPath: './index.db',
  logLevel: 'info',
  indexConfig: {
    includePaths: ['/home/user/documents', '/home/user/projects'],
    excludePaths: ['/home/user/projects/node_modules'],
    excludePatterns: ['*.tmp', '*.log', '.git'],
    maxFileSize: 10 * 1024 * 1024,  // 10MB
    indexContent: false
  }
});
```

### 7.2 配置项说明

| 配置项 | 类型 | 描述 | 默认值 |
|--------|------|------|--------|
| dbPath | string | 索引数据库路径 | 系统默认位置 |
| logLevel | string | 日志级别 | 'info' |
| includePaths | string[] | 包含的目录 | 所有本地磁盘 |
| excludePaths | string[] | 排除的目录 | 系统目录 |
| excludePatterns | string[] | 排除的文件模式 | 临时文件 |
| maxFileSize | number | 最大索引文件大小 | 10MB |
| indexContent | boolean | 是否索引文件内容 | false |

### 7.3 默认排除目录

- Windows: `C:\Windows\System32\config`, `C:\$Recycle.Bin`
- macOS: `/.Trash`, `/.Spotlight`
- 通用: `/node_modules`, `/.git`, `/.svn`

---

## 8. 常见问题

### Q1: 搜索速度慢怎么办？

**A**: 
1. 确保索引已建立完成
2. 使用更精确的搜索条件
3. 限制结果数量
4. 检查磁盘性能

### Q2: 找不到某些文件？

**A**: 
1. 检查文件是否在排除目录中
2. 检查文件权限
3. 重建索引: `search index --rebuild`

### Q3: 如何搜索中文文件名？

**A**: 直接输入中文即可，软件完全支持Unicode。

### Q4: 内容搜索支持哪些文件类型？

**A**: 支持常见的文本文件类型：
- 文档: .txt, .md, .json, .xml, .html
- 代码: .js, .ts, .py, .java, .c, .cpp
- 配置: .yaml, .toml, .ini, .env
- 脚本: .sh, .bat, .ps1

### Q5: 如何在不同电脑间同步索引？

**A**: 索引数据库位于：
- Windows: `%APPDATA%\local-search-engine\index.db`
- macOS: `~/Library/Application Support/local-search-engine/index.db`
- Linux: `~/.local/share/local-search-engine/index.db`

可以复制此文件到其他电脑。

### Q6: 内存占用过高怎么办？

**A**: 
1. 减少索引的文件数量
2. 关闭内容索引
3. 定期优化数据库

---

## 9. 技术支持

### 9.1 获取帮助

- 查看帮助: `search --help`
- 查看子命令帮助: `search index --help`

### 9.2 报告问题

如遇到问题，请提供以下信息：
1. 操作系统版本
2. Node.js版本
3. 错误信息
4. 复现步骤

### 9.3 许可证

MIT License

---

**文档版本**: 1.0  
**最后更新**: 2026-05-22
