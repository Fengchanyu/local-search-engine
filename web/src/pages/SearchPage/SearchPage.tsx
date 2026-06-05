import { useState, useCallback, useEffect, FC, ChangeEvent } from 'react';
import { SearchResult, SearchOptions, ViewMode, SortOption, SortOrder } from '@/types';
import { api } from '@/utils/api';
import { debounce, cn } from '@/utils/helpers';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { SearchResultItem } from '@/components/SearchResultItem';
import './SearchPage.css';

interface SortOptions {
  field: SortOption;
  order: SortOrder;
}

const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

const ListViewIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const GridViewIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

const TableViewIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="15" x2="21" y2="15" />
    <line x1="9" y1="3" x2="9" y2="21" />
  </svg>
);

export const SearchPage: FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  
  const [searchOptions, setSearchOptions] = useState<Partial<SearchOptions>>({
    matchMode: 'fuzzy',
    caseSensitive: false,
    maxResults: 100,
  });

  const [sortOptions, setSortOptions] = useState<SortOptions>({
    field: 'name',
    order: 'asc',
  });

  const performSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const searchResults = await api.searchByName(searchQuery, searchOptions);
        setResults(searchResults);
      } catch (err) {
        setError(err instanceof Error ? err.message : '搜索失败');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [searchOptions]
  );

  useEffect(() => {
    performSearch(query);
  }, [query, performSearch]);

  const handleQueryChange = (e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleItemClick = useCallback((result: SearchResult) => {
    setSelectedItems((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(result.path)) {
        next.delete(result.path);
      } else {
        next.add(result.path);
      }
      return next;
    });
  }, []);

  const handleItemDoubleClick = useCallback((result: SearchResult) => {
    api.openFile(result.path);
  }, []);

  const handleSort = (field: SortOption) => {
    setSortOptions((prev: SortOptions) => ({
      field,
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleClearSelection = () => {
    setSelectedItems(new Set());
  };

  const handleOpenSelected = () => {
    selectedItems.forEach((path: string) => api.openFile(path));
  };

  const sortedResults = [...results].sort((a, b) => {
    const { field, order } = sortOptions;
    let comparison = 0;

    switch (field) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'path':
        comparison = a.path.localeCompare(b.path);
        break;
      case 'size':
        comparison = a.size - b.size;
        break;
      case 'modifiedTime':
        comparison = new Date(a.modifiedTime).getTime() - new Date(b.modifiedTime).getTime();
        break;
      case 'createdTime':
        comparison = new Date(a.createdTime).getTime() - new Date(b.createdTime).getTime();
        break;
    }

    return order === 'asc' ? comparison : -comparison;
  });

  return (
    <div className="search-page">
      <header className="search-header">
        <h1 className="search-title">本地文件搜索引擎</h1>
        <p className="search-subtitle">快速搜索本地文件，毫秒级响应</p>
      </header>

      <div className="search-controls">
        <div className="search-input-wrapper">
          <Input
            value={query}
            onChange={handleQueryChange}
            placeholder="输入文件名进行搜索..."
            leftIcon={<SearchIcon />}
            fullWidth
            size="lg"
            aria-label="搜索文件"
          />
        </div>

        <div className="search-options">
          <div className="search-mode">
            <label className="radio-label">
              <input
                type="radio"
                name="matchMode"
                checked={searchOptions.matchMode === 'fuzzy'}
                onChange={() => setSearchOptions((prev: Partial<SearchOptions>) => ({ ...prev, matchMode: 'fuzzy' }))}
              />
              模糊匹配
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="matchMode"
                checked={searchOptions.matchMode === 'exact'}
                onChange={() => setSearchOptions((prev: Partial<SearchOptions>) => ({ ...prev, matchMode: 'exact' }))}
              />
              精确匹配
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={searchOptions.caseSensitive}
                onChange={(e) => setSearchOptions((prev: Partial<SearchOptions>) => ({ ...prev, caseSensitive: e.target.checked }))}
              />
              区分大小写
            </label>
          </div>

          <div className="view-mode-toggle">
            <button
              className={cn('view-mode-btn', viewMode === 'list' && 'active')}
              onClick={() => setViewMode('list')}
              aria-label="列表视图"
            >
              <ListViewIcon />
            </button>
            <button
              className={cn('view-mode-btn', viewMode === 'grid' && 'active')}
              onClick={() => setViewMode('grid')}
              aria-label="网格视图"
            >
              <GridViewIcon />
            </button>
            <button
              className={cn('view-mode-btn', viewMode === 'table' && 'active')}
              onClick={() => setViewMode('table')}
              aria-label="表格视图"
            >
              <TableViewIcon />
            </button>
          </div>
        </div>
      </div>

      {selectedItems.size > 0 && (
        <div className="selection-bar">
          <span>已选择 {selectedItems.size} 个文件</span>
          <div className="selection-actions">
            <Button size="sm" onClick={handleOpenSelected}>
              打开选中
            </Button>
            <Button size="sm" variant="ghost" onClick={handleClearSelection}>
              取消选择
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      <div className="search-results-header">
        <span className="results-count">
          {isLoading ? '搜索中...' : `找到 ${results.length} 个结果`}
        </span>
        {results.length > 0 && (
          <div className="sort-controls">
            <span>排序：</span>
            <select
              value={sortOptions.field}
              onChange={(e) => handleSort(e.target.value as SortOption)}
              className="sort-select"
            >
              <option value="name">名称</option>
              <option value="path">路径</option>
              <option value="size">大小</option>
              <option value="modifiedTime">修改时间</option>
            </select>
            <button
              className="sort-order-btn"
              onClick={() => setSortOptions((prev: SortOptions) => ({ ...prev, order: prev.order === 'asc' ? 'desc' : 'asc' }))}
              aria-label={sortOptions.order === 'asc' ? '升序' : '降序'}
            >
              {sortOptions.order === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="loading-indicator">
          <div className="loading-spinner" />
          <span>正在搜索...</span>
        </div>
      )}

      {!isLoading && results.length === 0 && query && (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>未找到匹配的文件</h3>
          <p>尝试使用不同的关键词或搜索模式</p>
        </div>
      )}

      {!isLoading && results.length === 0 && !query && (
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <h3>开始搜索</h3>
          <p>输入文件名或关键词开始搜索</p>
        </div>
      )}

      {results.length > 0 && (
        <div className={cn('search-results', `view-${viewMode}`)}>
          {viewMode === 'table' ? (
            <table className="results-table">
              <thead>
                <tr>
                  <th className="result-header-icon"></th>
                  <th>名称</th>
                  <th className="hide-mobile">路径</th>
                  <th>大小</th>
                  <th className="hide-mobile">修改时间</th>
                </tr>
              </thead>
              <tbody>
                {sortedResults.map((result) => (
                  <SearchResultItem
                    key={result.path}
                    result={result}
                    onClick={handleItemClick}
                    onDoubleClick={handleItemDoubleClick}
                    selected={selectedItems.has(result.path)}
                    viewMode="table"
                  />
                ))}
              </tbody>
            </table>
          ) : (
            sortedResults.map((result) => (
              <SearchResultItem
                key={result.path}
                result={result}
                onClick={handleItemClick}
                onDoubleClick={handleItemDoubleClick}
                selected={selectedItems.has(result.path)}
                viewMode={viewMode}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};
