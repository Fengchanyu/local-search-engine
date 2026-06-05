# Web前端技术文档

## 1. 项目架构

### 1.1 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.2.0 | UI框架 |
| TypeScript | 5.3.3 | 类型安全 |
| Vite | 5.1.0 | 构建工具 |
| React Router | 6.22.0 | 路由管理 |
| Axios | 1.6.0 | HTTP客户端 |
| date-fns | 3.3.0 | 日期处理 |
| clsx | 2.1.0 | 类名合并 |

### 1.2 目录结构

```
web/
├── src/
│   ├── components/          # 可复用组件
│   │   ├── Button/         # 按钮组件
│   │   ├── Input/          # 输入框组件
│   │   └── SearchResultItem/ # 搜索结果项组件
│   ├── pages/              # 页面组件
│   │   └── SearchPage/     # 搜索页面
│   ├── hooks/              # 自定义Hooks
│   ├── utils/              # 工具函数
│   │   ├── api.ts          # API服务
│   │   └── helpers.ts      # 辅助函数
│   ├── styles/             # 全局样式
│   │   └── globals.css     # 全局CSS
│   ├── types/              # 类型定义
│   │   └── index.ts        # 接口定义
│   ├── App.tsx             # 应用入口
│   └── main.tsx            # 渲染入口
├── public/                 # 静态资源
├── index.html              # HTML模板
├── vite.config.ts          # Vite配置
├── tsconfig.json           # TypeScript配置
└── package.json            # 项目配置
```

## 2. 组件设计

### 2.1 Button组件

```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}
```

**使用示例：**
```tsx
<Button variant="primary" size="md" onClick={handleClick}>
  搜索
</Button>
```

### 2.2 Input组件

```tsx
interface InputProps {
  label?: string;
  error?: string;
  hint?: string;
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}
```

**使用示例：**
```tsx
<Input
  label="搜索文件"
  placeholder="输入文件名..."
  leftIcon={<SearchIcon />}
  fullWidth
/>
```

### 2.3 SearchResultItem组件

```tsx
interface SearchResultItemProps {
  result: SearchResult;
  onClick?: (result: SearchResult) => void;
  onDoubleClick?: (result: SearchResult) => void;
  selected?: boolean;
  viewMode?: 'list' | 'grid' | 'table';
}
```

## 3. API接口

### 3.1 搜索接口

**GET /api/search**
```typescript
// 请求参数
interface SearchParams {
  query: string;
  matchMode?: 'exact' | 'fuzzy' | 'wildcard';
  caseSensitive?: boolean;
  maxResults?: number;
}

// 响应
interface SearchResponse {
  success: boolean;
  data: SearchResult[];
}
```

### 3.2 索引接口

**POST /api/index/build**
```typescript
// 请求体
{
  paths: string[]
}

// 响应
{
  success: boolean;
  message: string;
}
```

**GET /api/index/status**
```typescript
// 响应
{
  success: boolean;
  data: {
    totalFiles: number;
    indexedFiles: number;
    progress: number;
    isIndexing: boolean;
    isPaused: boolean;
    lastUpdateTime: string;
  }
}
```

## 4. 状态管理

使用React Hooks进行状态管理：

```tsx
const [query, setQuery] = useState('');
const [results, setResults] = useState<SearchResult[]>([]);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [viewMode, setViewMode] = useState<ViewMode>('list');
const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
```

## 5. 性能优化

### 5.1 代码分割

```typescript
// vite.config.ts
rollupOptions: {
  output: {
    manualChunks: {
      vendor: ['react', 'react-dom', 'react-router-dom'],
      utils: ['axios', 'date-fns', 'clsx'],
    },
  },
}
```

### 5.2 防抖处理

```typescript
const performSearch = useCallback(
  debounce(async (searchQuery: string) => {
    // 搜索逻辑
  }, 300),
  [searchOptions]
);
```

### 5.3 虚拟滚动

对于大量搜索结果，建议使用虚拟滚动：
```bash
npm install react-window
```

## 6. 响应式设计

### 6.1 断点定义

| 断点 | 宽度 | 设备 |
|------|------|------|
| 移动端 | < 768px | 手机 |
| 平板 | 768px - 1199px | 平板 |
| 桌面 | ≥ 1200px | 电脑 |

### 6.2 CSS媒体查询

```css
@media (max-width: 767px) {
  /* 移动端样式 */
}

@media (min-width: 768px) and (max-width: 1199px) {
  /* 平板样式 */
}

@media (min-width: 1200px) {
  /* 桌面样式 */
}
```

## 7. 可访问性

### 7.1 ARIA属性

```tsx
<button aria-label="搜索" aria-busy={isLoading}>
  {isLoading ? '搜索中...' : '搜索'}
</button>
```

### 7.2 键盘导航

- Tab: 焦点移动
- Enter: 确认/打开
- Space: 选择
- Escape: 取消

## 8. 测试

### 8.1 单元测试

```bash
npm run test
```

### 8.2 测试覆盖率

```bash
npm run test:coverage
```

目标覆盖率：80%+

## 9. 构建部署

### 9.1 开发环境

```bash
npm run dev
```

### 9.2 生产构建

```bash
npm run build
```

### 9.3 预览构建

```bash
npm run preview
```

## 10. 浏览器兼容性

| 浏览器 | 最低版本 |
|--------|----------|
| Chrome | 最新版 |
| Firefox | 最新版 |
| Safari | 最新版 |
| Edge | 最新版 |
