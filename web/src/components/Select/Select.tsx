import { useState, useCallback, useRef, useEffect, SelectHTMLAttributes } from 'react';
import { cn } from '@/utils/helpers';
import './Select.css';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size' | 'onChange'> {
  options: SelectOption[];
  label?: string;
  error?: string;
  hint?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  placeholder?: string;
  onChange?: (value: string) => void;
}

export const Select: React.FC<SelectProps> = ({
  options,
  label,
  error,
  hint,
  size = 'md',
  fullWidth = false,
  placeholder = '请选择...',
  value,
  onChange,
  disabled,
  className,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectId = id || `select-${Math.random().toString(36).substring(2, 11)}`;

  const selectedOption = options.find(opt => opt.value === value);

  const handleToggle = useCallback(() => {
    if (!disabled) {
      setIsOpen(prev => !prev);
    }
  }, [disabled]);

  const handleSelect = useCallback((optionValue: string) => {
    onChange?.(optionValue);
    setIsOpen(false);
  }, [onChange]);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setIsOpen(false);
      setIsFocused(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }, [handleToggle]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'select-wrapper',
        fullWidth && 'select-full-width',
        error && 'select-has-error',
        disabled && 'select-disabled',
        className
      )}
    >
      {label && (
        <label htmlFor={selectId} className="select-label">
          {label}
        </label>
      )}
      <div
        className={cn(
          'select-container',
          `select-${size}`,
          isFocused && 'select-focused',
          isOpen && 'select-open'
        )}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-disabled={disabled}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      >
        <span className={cn('select-value', !selectedOption && 'select-placeholder')}>
          {selectedOption?.label || placeholder}
        </span>
        <span className="select-arrow">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M3 4.5L6 7.5L9 4.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
      {isOpen && (
        <ul className="select-dropdown" role="listbox">
          {options.map(option => (
            <li
              key={option.value}
              className={cn(
                'select-option',
                option.value === value && 'select-option-selected',
                option.disabled && 'select-option-disabled'
              )}
              role="option"
              aria-selected={option.value === value}
              onClick={(e) => {
                e.stopPropagation();
                if (!option.disabled) {
                  handleSelect(option.value);
                }
              }}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p className="select-error" role="alert">
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="select-hint">
          {hint}
        </p>
      )}
    </div>
  );
};
