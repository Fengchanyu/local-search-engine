import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from './Modal';

describe('Modal', () => {
  it('does not render when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={() => {}}>
        <p>Modal content</p>
      </Modal>
    );
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
  });

  it('renders when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <p>Modal content</p>
      </Modal>
    );
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Modal Title">
        <p>Content</p>
      </Modal>
    );
    expect(screen.getByText('Modal Title')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} showCloseButton>
        <p>Content</p>
      </Modal>
    );
    
    fireEvent.click(screen.getByLabelText('关闭'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay is clicked', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} closeOnOverlayClick>
        <p>Content</p>
      </Modal>
    );
    
    fireEvent.click(screen.getByRole('dialog'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not close on overlay click when closeOnOverlayClick is false', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} closeOnOverlayClick={false}>
        <p>Content</p>
      </Modal>
    );
    
    fireEvent.click(screen.getByRole('dialog'));
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('calls onClose on escape key press', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} closeOnEscape>
        <p>Content</p>
      </Modal>
    );
    
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders footer when provided', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} footer={<button>Save</button>}>
        <p>Content</p>
      </Modal>
    );
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('applies size classes correctly', () => {
    const { unmount } = render(
      <Modal isOpen={true} onClose={() => {}} size="sm">
        <p>Content</p>
      </Modal>
    );
    expect(document.querySelector('.modal-sm')).toBeInTheDocument();
    unmount();

    render(
      <Modal isOpen={true} onClose={() => {}} size="lg">
        <p>Content</p>
      </Modal>
    );
    expect(document.querySelector('.modal-lg')).toBeInTheDocument();
  });

  it('sets aria-modal and role correctly', () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <p>Content</p>
      </Modal>
    );
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });
});
