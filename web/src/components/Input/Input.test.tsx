import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from './Input';

describe('Input', () => {
  it('renders input element', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(<Input label="Username" />);
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
  });

  it('displays error message', () => {
    render(<Input error="This field is required" />);
    expect(screen.getByRole('alert')).toHaveTextContent('This field is required');
  });

  it('displays hint message when no error', () => {
    render(<Input hint="Enter your username" />);
    expect(screen.getByText('Enter your username')).toBeInTheDocument();
  });

  it('hides hint when error is present', () => {
    render(<Input hint="Enter your username" error="Required" />);
    expect(screen.queryByText('Enter your username')).not.toBeInTheDocument();
  });

  it('applies size classes correctly', () => {
    const { rerender } = render(<Input size="sm" />);
    expect(screen.getByRole('textbox').parentElement).toHaveClass('input-sm');

    rerender(<Input size="md" />);
    expect(screen.getByRole('textbox').parentElement).toHaveClass('input-md');

    rerender(<Input size="lg" />);
    expect(screen.getByRole('textbox').parentElement).toHaveClass('input-lg');
  });

  it('handles value changes', () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });
    
    expect(handleChange).toHaveBeenCalled();
  });

  it('disables input when disabled prop is true', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('renders left and right icons', () => {
    render(
      <Input 
        leftIcon={<span data-testid="left-icon">🔍</span>}
        rightIcon={<span data-testid="right-icon">✓</span>}
      />
    );
    
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });

  it('applies full width class when fullWidth is true', () => {
    const { container } = render(<Input fullWidth />);
    expect(container.firstChild).toHaveClass('input-full-width');
  });

  it('sets aria-invalid when error is present', () => {
    render(<Input error="Invalid" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });
});
