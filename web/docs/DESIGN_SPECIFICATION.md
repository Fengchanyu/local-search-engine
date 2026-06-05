# 界面设计规范文档

## 1. 设计原则

### 1.1 核心原则

- **简洁性**: 界面简洁明了，减少视觉噪音
- **一致性**: 统一的设计语言和交互模式
- **可访问性**: 符合WCAG 2.1 AA级标准
- **响应式**: 适配多种设备和屏幕尺寸

### 1.2 设计理念

- 移动优先设计
- 内容优先展示
- 渐进增强体验

## 2. 色彩系统

### 2.1 主色调

| 名称 | 色值 | 用途 |
|------|------|------|
| Primary | #3b82f6 | 主要操作、链接、强调 |
| Primary Hover | #2563eb | 主色悬停状态 |
| Primary Light | #dbeafe | 主色背景、选中状态 |

### 2.2 功能色

| 名称 | 色值 | 用途 |
|------|------|------|
| Success | #22c55e | 成功状态 |
| Warning | #f59e0b | 警告状态 |
| Error | #ef4444 | 错误状态 |

### 2.3 中性色

| 名称 | 色值 | 用途 |
|------|------|------|
| Background | #ffffff | 页面背景 |
| Surface | #f8fafc | 卡片背景 |
| Border | #e2e8f0 | 边框、分割线 |
| Text Primary | #1e293b | 主要文本 |
| Text Secondary | #64748b | 次要文本 |
| Text Muted | #94a3b8 | 辅助文本 |

### 2.4 深色模式

| 名称 | 浅色模式 | 深色模式 |
|------|----------|----------|
| Background | #ffffff | #0f172a |
| Surface | #f8fafc | #1e293b |
| Border | #e2e8f0 | #334155 |
| Text Primary | #1e293b | #f1f5f9 |
| Text Secondary | #64748b | #94a3b8 |

## 3. 排版规范

### 3.1 字体

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
```

### 3.2 字号

| 名称 | 大小 | 用途 |
|------|------|------|
| xs | 12px | 辅助信息 |
| sm | 14px | 次要文本 |
| base | 16px | 正文 |
| lg | 18px | 小标题 |
| xl | 20px | 标题 |
| 2xl | 24px | 大标题 |

### 3.3 字重

| 名称 | 值 | 用途 |
|------|------|------|
| Normal | 400 | 正文 |
| Medium | 500 | 强调 |
| Semibold | 600 | 小标题 |
| Bold | 700 | 标题 |

## 4. 间距系统

### 4.1 基础间距

| 名称 | 值 | 用途 |
|------|------|------|
| xs | 4px | 紧凑间距 |
| sm | 8px | 小间距 |
| md | 16px | 标准间距 |
| lg | 24px | 大间距 |
| xl | 32px | 超大间距 |

### 4.2 应用规则

- 组件内部：xs - sm
- 组件之间：sm - md
- 区块之间：md - lg
- 页面边距：md - xl

## 5. 圆角规范

| 名称 | 值 | 用途 |
|------|------|------|
| sm | 4px | 小元素 |
| md | 8px | 按钮、输入框 |
| lg | 12px | 卡片 |

## 6. 阴影系统

| 名称 | 值 | 用途 |
|------|------|------|
| sm | 0 1px 2px rgba(0,0,0,0.05) | 轻微阴影 |
| md | 0 4px 6px rgba(0,0,0,0.1) | 中等阴影 |
| lg | 0 10px 15px rgba(0,0,0,0.1) | 强调阴影 |

## 7. 组件规范

### 7.1 按钮

**尺寸：**
| 大小 | 高度 | 内边距 |
|------|------|--------|
| sm | 32px | 4px 8px |
| md | 40px | 8px 16px |
| lg | 48px | 16px 24px |

**状态：**
- Default: 默认状态
- Hover: 悬停状态（颜色加深）
- Active: 激活状态（缩放0.97）
- Disabled: 禁用状态（透明度0.5）
- Loading: 加载状态（显示加载动画）

### 7.2 输入框

**尺寸：**
| 大小 | 高度 | 内边距 |
|------|------|--------|
| sm | 32px | 4px 8px |
| md | 40px | 8px 16px |
| lg | 48px | 16px 24px |

**状态：**
- Default: 默认状态
- Focus: 聚焦状态（边框高亮+阴影）
- Error: 错误状态（红色边框）
- Disabled: 禁用状态（灰色背景）

### 7.3 卡片

```css
.card {
  background-color: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
}
```

## 8. 图标规范

### 8.1 尺寸

| 用途 | 尺寸 |
|------|------|
| 按钮图标 | 20px |
| 列表图标 | 16px |
| 文件图标 | 32px - 48px |

### 8.2 颜色

- 默认：currentColor
- 禁用：var(--color-text-muted)
- 强调：var(--color-primary)

## 9. 动效规范

### 9.1 过渡时间

| 名称 | 值 | 用途 |
|------|------|------|
| fast | 150ms | 快速交互 |
| normal | 250ms | 标准过渡 |

### 9.2 缓动函数

```css
transition-timing-function: ease;
```

### 9.3 动画

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

## 10. 响应式布局

### 10.1 栅格系统

```css
.container {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 16px;
}

@media (min-width: 768px) {
  .container {
    padding: 0 24px;
  }
}

@media (min-width: 1200px) {
  .container {
    padding: 0 32px;
  }
}
```

### 10.2 网格视图

```css
.search-results.view-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
}

@media (max-width: 767px) {
  .search-results.view-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }
}
```

## 11. 可访问性清单

- [ ] 所有图片有alt属性
- [ ] 表单元素有label
- [ ] 颜色对比度≥4.5:1
- [ ] 焦点状态可见
- [ ] 键盘可导航
- [ ] 屏幕阅读器友好
- [ ] 动画可禁用

## 12. 设计交付物

- 色彩变量文件
- 组件样式文件
- 图标资源
- 设计规范文档
