import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Select, SelectOption } from './Select';

const mockOptions: SelectOption[] = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3', disabled: true },
];

describe('Select', () => {
  it('renders with placeholder', () => {
    render(<Select options={mockOptions} placeholder="Select an option" />);
    expect(screen.getByText('Select an option')).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(<Select options={mockOptions} label="Choose" />);
    expect(screen.getByText('Choose')).toBeInTheDocument();
  });

  it('opens dropdown on click', () => {
    render(<Select options={mockOptions} />);
    
    fireEvent.click(screen.getByRole('combobox'));
    
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('Option 1')).toBeInTheDocument();
  });

  it('selects option on click', () => {
    const handleChange = vi.fn();
    render(<Select options={mockOptions} onChange={handleChange} />);
    
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('Option 1'));
    
    expect(handleChange).toHaveBeenCalledWith('option1');
  });

  it('displays selected option', () => {
    render(<Select options={mockOptions} value="option1" />);
    expect(screen.getByText('Option 1')).toBeInTheDocument();
  });

  it('disables select when disabled prop is true', () => {
    render(<Select options={mockOptions} disabled />);
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-disabled', 'true');
  });

  it('displays error message', () => {
    render(<Select options={mockOptions} error="Required field" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Required field');
  });

  it('applies size classes correctly', () => {
    const { rerender } = render(<Select options={mockOptions} size="sm" />);
    expect(screen.getByRole('combobox')).toHaveClass('select-sm');

    rerender(<Select options={mockOptions} size="md" />);
    expect(screen.getByRole('combobox')).toHaveClass('select-md');

    rerender(<Select options={mockOptions} size="lg" />);
    expect(screen.getByRole('combobox')).toHaveClass('select-lg');
  });

  it('closes dropdown on escape key', () => {
    render(<Select options={mockOptions} />);
    
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('does not select disabled options', () => {
    const handleChange = vi.fn();
    render(<Select options={mockOptions} onChange={handleChange} />);
    
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('Option 3'));
    
    expect(handleChange).not.toHaveBeenCalled();
  });
});
