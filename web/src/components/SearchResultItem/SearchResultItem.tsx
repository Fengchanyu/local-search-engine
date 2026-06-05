import { FC, KeyboardEvent } from 'react';
import { SearchResult } from '@/types';
import { formatBytes, formatDate, getFileIcon, cn } from '@/utils/helpers';
import './SearchResultItem.css';

export interface SearchResultItemProps {
  result: SearchResult;
  onClick?: (result: SearchResult) => void;
  onDoubleClick?: (result: SearchResult) => void;
  selected?: boolean;
  viewMode?: 'list' | 'grid' | 'table';
}

export const SearchResultItem: FC<SearchResultItemProps> = ({
  result,
  onClick,
  onDoubleClick,
  selected = false,
  viewMode = 'list',
}) => {
  const handleClick = () => {
    onClick?.(result);
  };

  const handleDoubleClick = () => {
    onDoubleClick?.(result);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      onDoubleClick?.(result);
    } else if (e.key === ' ') {
      e.preventDefault();
      onClick?.(result);
    }
  };

  if (viewMode === 'grid') {
    return (
      <div
        className={cn('search-result-grid', selected && 'selected')}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-pressed={selected}
      >
        <div className="result-grid-icon">{getFileIcon(result.extension)}</div>
        <div className="result-grid-content">
          <span className="result-name" title={result.name}>
            {result.name}
          </span>
          <span className="result-meta">
            {formatBytes(result.size)}
          </span>
        </div>
      </div>
    );
  }

  if (viewMode === 'table') {
    return (
      <tr
        className={cn('search-result-table-row', selected && 'selected')}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="row"
        aria-selected={selected}
      >
        <td className="result-cell result-cell-icon">
          {getFileIcon(result.extension)}
        </td>
        <td className="result-cell result-cell-name" title={result.name}>
          {result.name}
        </td>
        <td className="result-cell result-cell-path" title={result.path}>
          {result.path}
        </td>
        <td className="result-cell result-cell-size">
          {formatBytes(result.size)}
        </td>
        <td className="result-cell result-cell-date">
          {formatDate(result.modifiedTime)}
        </td>
      </tr>
    );
  }

  return (
    <div
      className={cn('search-result-list', selected && 'selected')}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-pressed={selected}
    >
      <span className="result-icon">{getFileIcon(result.extension)}</span>
      <div className="result-content">
        <span className="result-name" title={result.name}>
          {result.name}
        </span>
        <span className="result-path" title={result.path}>
          {result.path}
        </span>
      </div>
      <div className="result-meta">
        <span className="result-size">{formatBytes(result.size)}</span>
        <span className="result-date">{formatDate(result.modifiedTime)}</span>
      </div>
    </div>
  );
};
