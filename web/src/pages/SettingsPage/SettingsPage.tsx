import { useState, useCallback, FC } from 'react';
import { Theme } from '@/types';
import { useTheme, useLocalStorage } from '@/hooks';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import { Checkbox } from '@/components/Checkbox';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import './SettingsPage.css';

interface Settings {
  theme: Theme;
  defaultMatchMode: 'exact' | 'fuzzy' | 'wildcard';
  caseSensitive: boolean;
  maxResults: number;
  autoIndex: boolean;
  indexPaths: string[];
  watchFiles: boolean;
  showHiddenFiles: boolean;
  excludePatterns: string[];
}

const defaultSettings: Settings = {
  theme: 'system',
  defaultMatchMode: 'fuzzy',
  caseSensitive: false,
  maxResults: 100,
  autoIndex: false,
  indexPaths: [],
  watchFiles: true,
  showHiddenFiles: false,
  excludePatterns: ['node_modules', '.git', 'dist', 'build'],
};

const themeOptions = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
  { value: 'system', label: '跟随系统' },
];

const matchModeOptions = [
  { value: 'exact', label: '精确匹配' },
  { value: 'fuzzy', label: '模糊匹配' },
  { value: 'wildcard', label: '通配符匹配' },
];

const maxResultsOptions = [
  { value: '50', label: '50 条' },
  { value: '100', label: '100 条' },
  { value: '200', label: '200 条' },
  { value: '500', label: '500 条' },
];

export const SettingsPage: FC = () => {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useLocalStorage<Settings>('app-settings', defaultSettings);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [newExcludePattern, setNewExcludePattern] = useState('');
  const { success, error } = useToast();

  const handleThemeChange = useCallback((value: string) => {
    setTheme(value as Theme);
    setSettings(prev => ({ ...prev, theme: value as Theme }));
  }, [setTheme, setSettings]);

  const handleMatchModeChange = useCallback((value: string) => {
    setSettings(prev => ({ ...prev, defaultMatchMode: value as Settings['defaultMatchMode'] }));
  }, [setSettings]);

  const handleMaxResultsChange = useCallback((value: string) => {
    setSettings(prev => ({ ...prev, maxResults: parseInt(value, 10) }));
  }, [setSettings]);

  const handleCheckboxChange = useCallback((key: keyof Settings) => (checked: boolean) => {
    setSettings(prev => ({ ...prev, [key]: checked }));
  }, [setSettings]);

  const handleAddExcludePattern = useCallback(() => {
    if (!newExcludePattern.trim()) return;
    if (settings.excludePatterns.includes(newExcludePattern.trim())) {
      error('该排除模式已存在');
      return;
    }
    setSettings(prev => ({
      ...prev,
      excludePatterns: [...prev.excludePatterns, newExcludePattern.trim()],
    }));
    setNewExcludePattern('');
    success('排除模式已添加');
  }, [newExcludePattern, settings.excludePatterns, setSettings, success, error]);

  const handleRemoveExcludePattern = useCallback((pattern: string) => {
    setSettings(prev => ({
      ...prev,
      excludePatterns: prev.excludePatterns.filter(p => p !== pattern),
    }));
    success('排除模式已移除');
  }, [setSettings, success]);

  const handleReset = useCallback(() => {
    setSettings(defaultSettings);
    setTheme(defaultSettings.theme);
    setIsResetModalOpen(false);
    success('设置已重置');
  }, [setSettings, setTheme, success]);

  const handleExportSettings = useCallback(() => {
    const dataStr = JSON.stringify(settings, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'search-engine-settings.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    success('设置已导出');
  }, [settings, success]);

  const handleImportSettings = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        setSettings({ ...defaultSettings, ...imported });
        if (imported.theme) {
          setTheme(imported.theme);
        }
        success('设置已导入');
      } catch {
        error('导入失败：无效的设置文件');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }, [setSettings, setTheme, success, error]);

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1 className="settings-title">设置</h1>
        <p className="settings-description">管理应用程序的首选项和配置</p>
      </div>

      <div className="settings-content">
        <section className="settings-section">
          <h2 className="section-title">外观</h2>
          <div className="settings-group">
            <div className="settings-item">
              <div className="settings-item-label">
                <span className="label-text">主题</span>
                <span className="label-hint">选择应用程序的显示主题</span>
              </div>
              <div className="settings-item-control">
                <Select
                  options={themeOptions}
                  value={theme}
                  onChange={handleThemeChange}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h2 className="section-title">搜索</h2>
          <div className="settings-group">
            <div className="settings-item">
              <div className="settings-item-label">
                <span className="label-text">默认匹配模式</span>
                <span className="label-hint">设置搜索时的默认匹配方式</span>
              </div>
              <div className="settings-item-control">
                <Select
                  options={matchModeOptions}
                  value={settings.defaultMatchMode}
                  onChange={handleMatchModeChange}
                />
              </div>
            </div>

            <div className="settings-item">
              <div className="settings-item-label">
                <span className="label-text">最大结果数</span>
                <span className="label-hint">单次搜索返回的最大结果数量</span>
              </div>
              <div className="settings-item-control">
                <Select
                  options={maxResultsOptions}
                  value={settings.maxResults.toString()}
                  onChange={handleMaxResultsChange}
                />
              </div>
            </div>

            <div className="settings-item">
              <div className="settings-item-label">
                <span className="label-text">区分大小写</span>
                <span className="label-hint">搜索时是否区分字母大小写</span>
              </div>
              <div className="settings-item-control">
                <Checkbox
                  checked={settings.caseSensitive}
                  onChange={handleCheckboxChange('caseSensitive')}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h2 className="section-title">索引</h2>
          <div className="settings-group">
            <div className="settings-item">
              <div className="settings-item-label">
                <span className="label-text">自动索引</span>
                <span className="label-hint">启动应用时自动建立索引</span>
              </div>
              <div className="settings-item-control">
                <Checkbox
                  checked={settings.autoIndex}
                  onChange={handleCheckboxChange('autoIndex')}
                />
              </div>
            </div>

            <div className="settings-item">
              <div className="settings-item-label">
                <span className="label-text">监控文件变化</span>
                <span className="label-hint">实时监控文件系统变化并更新索引</span>
              </div>
              <div className="settings-item-control">
                <Checkbox
                  checked={settings.watchFiles}
                  onChange={handleCheckboxChange('watchFiles')}
                />
              </div>
            </div>

            <div className="settings-item">
              <div className="settings-item-label">
                <span className="label-text">显示隐藏文件</span>
                <span className="label-hint">在搜索结果中显示隐藏文件</span>
              </div>
              <div className="settings-item-control">
                <Checkbox
                  checked={settings.showHiddenFiles}
                  onChange={handleCheckboxChange('showHiddenFiles')}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h2 className="section-title">排除模式</h2>
          <p className="section-hint">设置不需要索引的目录或文件模式</p>
          <div className="exclude-patterns">
            <div className="exclude-patterns-list">
              {settings.excludePatterns.map(pattern => (
                <div key={pattern} className="exclude-pattern-item">
                  <span className="pattern-text">{pattern}</span>
                  <button
                    className="pattern-remove"
                    onClick={() => handleRemoveExcludePattern(pattern)}
                    aria-label={`移除 ${pattern}`}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M4 4L12 12M4 12L12 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="exclude-patterns-input">
              <Input
                placeholder="输入排除模式（如：.cache）"
                value={newExcludePattern}
                onChange={(e) => setNewExcludePattern(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddExcludePattern()}
                fullWidth
              />
              <Button onClick={handleAddExcludePattern}>添加</Button>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h2 className="section-title">数据管理</h2>
          <div className="settings-actions">
            <Button variant="outline" onClick={handleExportSettings}>
              导出设置
            </Button>
            <label className="btn btn-secondary">
              导入设置
              <input
                type="file"
                accept=".json"
                onChange={handleImportSettings}
                style={{ display: 'none' }}
              />
            </label>
            <Button variant="danger" onClick={() => setIsResetModalOpen(true)}>
              重置设置
            </Button>
          </div>
        </section>
      </div>

      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="确认重置"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsResetModalOpen(false)}>
              取消
            </Button>
            <Button variant="danger" onClick={handleReset}>
              确认重置
            </Button>
          </>
        }
      >
        <p>确定要重置所有设置吗？此操作无法撤销。</p>
      </Modal>
    </div>
  );
};
