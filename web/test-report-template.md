# 测试报告

**项目**: Local Search Engine - Frontend  
**生成时间**: {timestamp}  
**测试框架**: Vitest + React Testing Library

---

## 测试概览

| 指标 | 数值 |
|------|------|
| 测试文件数 | {testFiles} |
| 测试用例总数 | {totalTests} |
| 通过用例 | {passedTests} |
| 失败用例 | {failedTests} |
| 跳过用例 | {skippedTests} |
| 测试耗时 | {duration} |
| 通过率 | {passRate}% |

---

## 测试覆盖率

| 类型 | 覆盖率 | 详情 |
|------|--------|------|
| 语句覆盖率 | {statements}% | {statementsCovered}/{statementsTotal} |
| 分支覆盖率 | {branches}% | {branchesCovered}/{branchesTotal} |
| 函数覆盖率 | {functions}% | {functionsCovered}/{functionsTotal} |
| 行覆盖率 | {lines}% | {linesCovered}/{linesTotal} |

---

## 测试模块详情

### 组件测试

#### Button 组件
- ✅ 正确渲染子元素
- ✅ 应用变体样式类
- ✅ 应用尺寸样式类
- ✅ 处理点击事件
- ✅ 禁用状态处理
- ✅ 加载状态处理
- ✅ 渲染左右图标
- ✅ 全宽样式应用
- ✅ 自定义类名应用

#### Input 组件
- ✅ 渲染输入元素
- ✅ 渲染标签
- ✅ 显示错误消息
- ✅ 显示提示信息
- ✅ 错误时隐藏提示
- ✅ 应用尺寸样式类
- ✅ 处理值变化
- ✅ 禁用状态处理
- ✅ 渲染左右图标
- ✅ 全宽样式应用
- ✅ aria-invalid 属性设置

#### Select 组件
- ✅ 渲染占位符
- ✅ 渲染标签
- ✅ 点击打开下拉菜单
- ✅ 选择选项
- ✅ 显示已选选项
- ✅ 禁用状态处理
- ✅ 显示错误消息
- ✅ 应用尺寸样式类
- ✅ ESC键关闭下拉菜单
- ✅ 禁用选项不可选择

#### Checkbox 组件
- ✅ 渲染带标签的复选框
- ✅ 切换选中状态
- ✅ 显示选中状态
- ✅ 显示不确定状态
- ✅ 禁用状态处理
- ✅ 显示错误消息
- ✅ 应用尺寸样式类
- ✅ aria-invalid 属性设置

#### Modal 组件
- ✅ isOpen为false时不渲染
- ✅ isOpen为true时渲染
- ✅ 渲染标题
- ✅ 点击关闭按钮调用onClose
- ✅ 点击遮罩层调用onClose
- ✅ closeOnOverlayClick为false时不关闭
- ✅ ESC键调用onClose
- ✅ 渲染footer
- ✅ 应用尺寸样式类
- ✅ aria-modal和role属性设置

#### Toast 组件
- ✅ ToastProvider无错误渲染
- ✅ 显示成功提示
- ✅ 显示错误提示
- ✅ 显示警告提示
- ✅ 显示信息提示
- ✅ 点击关闭按钮关闭提示
- ✅ 在Provider外使用useToast抛出错误

### Hooks 测试

#### useDebounce
- ✅ 立即返回初始值
- ✅ 防抖值变化
- ✅ 新值时取消待处理更新

#### useDebouncedCallback
- ✅ 防抖回调执行
- ✅ 新调用时取消前一次调用

#### useLocalStorage
- ✅ localStorage为空时返回初始值
- ✅ 从localStorage返回存储值
- ✅ 值变化时更新localStorage
- ✅ 支持函数更新
- ✅ 从localStorage移除值
- ✅ 处理自定义序列化器/反序列化器

#### useAsync
- ✅ 返回初始状态
- ✅ 执行异步函数并返回数据
- ✅ 处理错误
- ✅ 调用onSuccess回调
- ✅ 调用onError回调
- ✅ 手动设置数据
- ✅ 重置状态

#### useAsyncEffect
- ✅ 挂载时执行异步函数
- ✅ 依赖变化时重新执行

---

## 质量标准验证

| 标准 | 要求 | 实际 | 状态 |
|------|------|------|------|
| 测试通过率 | ≥ 95% | {passRate}% | {passStatus} |
| 语句覆盖率 | ≥ 80% | {statements}% | {statementsStatus} |
| 分支覆盖率 | ≥ 70% | {branches}% | {branchesStatus} |
| 函数覆盖率 | ≥ 80% | {functions}% | {functionsStatus} |
| 行覆盖率 | ≥ 80% | {lines}% | {linesStatus} |

---

## 失败用例详情

{failedTestsDetails}

---

## 建议

1. **覆盖率提升**: 建议为以下文件添加更多测试：
   - useTheme.ts
   - useSearch.ts
   - useMediaQuery.ts

2. **集成测试**: 建议添加页面级集成测试：
   - SearchPage 完整搜索流程
   - SettingsPage 设置保存流程

3. **E2E测试**: 建议使用 Playwright 或 Cypress 添加端到端测试

---

*报告由 Vitest 自动生成*
