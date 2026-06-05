import { forwardRef, useState, useCallback, InputHTMLAttributes, ReactNode, FocusEvent } from 'react';
import { cn } from '@/utils/helpers';
import './Input.css';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      size = 'md',
      leftIcon,
      rightIcon,
      fullWidth = false,
      className,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const inputId = id || `input-${Math.random().toString(36).substring(2, 11)}`;

    const handleFocus = useCallback((e: FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      props.onFocus?.(e);
    }, [props]);

    const handleBlur = useCallback((e: FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      props.onBlur?.(e);
    }, [props]);

    return (
      <div
        className={cn(
          'input-wrapper',
          fullWidth && 'input-full-width',
          error && 'input-has-error',
          disabled && 'input-disabled',
          className
        )}
      >
        {label && (
          <label htmlFor={inputId} className="input-label">
            {label}
          </label>
        )}
        <div
          className={cn(
            'input-container',
            `input-${size}`,
            isFocused && 'input-focused'
          )}
        >
          {leftIcon && <span className="input-icon-left">{leftIcon}</span>}
          <input
            ref={ref}
            id={inputId}
            className="input-field"
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
          />
          {rightIcon && <span className="input-icon-right">{rightIcon}</span>}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="input-error" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="input-hint">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
