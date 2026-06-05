import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  it('renders checkbox with label', () => {
    render(<Checkbox label="Accept terms" />);
    expect(screen.getByText('Accept terms')).toBeInTheDocument();
  });

  it('toggles checked state on change', () => {
    const handleChange = vi.fn();
    render(<Checkbox onChange={handleChange} />);
    
    fireEvent.click(screen.getByRole('checkbox'));
    
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('displays checked state correctly', () => {
    const { container } = render(<Checkbox checked readOnly />);
    expect(container.querySelector('.checkbox-checked')).toBeInTheDocument();
  });

  it('displays indeterminate state correctly', () => {
    const { container } = render(<Checkbox indeterminate checked={false} readOnly />);
    expect(container.querySelector('.checkbox-indeterminate')).toBeInTheDocument();
  });

  it('disables checkbox when disabled prop is true', () => {
    render(<Checkbox disabled />);
    expect(screen.getByRole('checkbox')).toBeDisabled();
  });

  it('displays error message', () => {
    render(<Checkbox error="This field is required" />);
    expect(screen.getByRole('alert')).toHaveTextContent('This field is required');
  });

  it('applies size classes correctly', () => {
    const { container, rerender } = render(<Checkbox size="sm" />);
    expect(container.querySelector('.checkbox-sm')).toBeInTheDocument();

    rerender(<Checkbox size="md" />);
    expect(container.querySelector('.checkbox-md')).toBeInTheDocument();

    rerender(<Checkbox size="lg" />);
    expect(container.querySelector('.checkbox-lg')).toBeInTheDocument();
  });

  it('sets aria-invalid when error is present', () => {
    render(<Checkbox error="Invalid" />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-invalid', 'true');
  });
});
