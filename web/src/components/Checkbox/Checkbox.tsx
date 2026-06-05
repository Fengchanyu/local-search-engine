import { useState, useCallback, InputHTMLAttributes } from 'react';
import { cn } from '@/utils/helpers';
import './Checkbox.css';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'onChange'> {
  label?: string;
  error?: string;
  hint?: string;
  size?: 'sm' | 'md' | 'lg';
  indeterminate?: boolean;
  onChange?: (checked: boolean) => void;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  error,
  hint,
  size = 'md',
  indeterminate = false,
  checked,
  onChange,
  disabled,
  className,
  id,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const checkboxId = id || `checkbox-${Math.random().toString(36).substring(2, 11)}`;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.checked);
  }, [onChange]);

  return (
    <div
      className={cn(
        'checkbox-wrapper',
        error && 'checkbox-has-error',
        disabled && 'checkbox-disabled',
        className
      )}
    >
      <label htmlFor={checkboxId} className="checkbox-label-container">
        <span
          className={cn(
            'checkbox-box',
            `checkbox-${size}`,
            isFocused && 'checkbox-focused',
            (checked || indeterminate) && 'checkbox-checked',
            indeterminate && 'checkbox-indeterminate'
          )}
        >
          <input
            type="checkbox"
            id={checkboxId}
            className="checkbox-input"
            checked={checked}
            onChange={handleChange}
            disabled={disabled}
            ref={el => {
              if (el) el.indeterminate = indeterminate;
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            aria-invalid={!!error}
            aria-describedby={error ? `${checkboxId}-error` : hint ? `${checkboxId}-hint` : undefined}
            {...props}
          />
          <span className="checkbox-icon">
            {indeterminate ? (
              <svg viewBox="0 0 16 16" fill="none">
                <path
                  d="M3 8H13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" fill="none">
                <path
                  d="M3 8L6.5 11.5L13 5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
        </span>
        {label && <span className="checkbox-label">{label}</span>}
      </label>
      {error && (
        <p id={`${checkboxId}-error`} className="checkbox-error" role="alert">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${checkboxId}-hint`} className="checkbox-hint">
          {hint}
        </p>
      )}
    </div>
  );
};
