import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ToastProvider, useToast } from './Toast';

const TestComponent = () => {
  const { success, error, warning, info } = useToast();
  
  return (
    <div>
      <button onClick={() => success('Success message')}>Success</button>
      <button onClick={() => error('Error message')}>Error</button>
      <button onClick={() => warning('Warning message')}>Warning</button>
      <button onClick={() => info('Info message')}>Info</button>
    </div>
  );
};

describe('Toast', () => {
  it('renders toast provider without errors', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );
    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  it('displays success toast', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );
    
    fireEvent.click(screen.getByText('Success'));
    
    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });
    expect(screen.getByRole('alert')).toHaveClass('toast-success');
  });

  it('displays error toast', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );
    
    fireEvent.click(screen.getByText('Error'));
    
    await waitFor(() => {
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
    expect(screen.getByRole('alert')).toHaveClass('toast-error');
  });

  it('displays warning toast', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );
    
    fireEvent.click(screen.getByText('Warning'));
    
    await waitFor(() => {
      expect(screen.getByText('Warning message')).toBeInTheDocument();
    });
    expect(screen.getByRole('alert')).toHaveClass('toast-warning');
  });

  it('displays info toast', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );
    
    fireEvent.click(screen.getByText('Info'));
    
    await waitFor(() => {
      expect(screen.getByText('Info message')).toBeInTheDocument();
    });
    expect(screen.getByRole('alert')).toHaveClass('toast-info');
  });

  it('closes toast when close button is clicked', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );
    
    fireEvent.click(screen.getByText('Success'));
    
    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByLabelText('关闭'));
    
    await waitFor(() => {
      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    });
  });

  it('throws error when useToast is used outside provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useToast must be used within a ToastProvider');
    
    consoleError.mockRestore();
  });
});
