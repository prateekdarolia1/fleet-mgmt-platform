/**
 * Unit tests for PastDateConfirmationDialog component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PastDateConfirmationDialog, type RetroactiveEntityType } from '@/components/shared/PastDateConfirmationDialog';

describe('PastDateConfirmationDialog', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnConfirm = vi.fn();

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    onConfirm: mockOnConfirm,
    date: new Date('2024-06-15'),
    entityType: 'ledger' as RetroactiveEntityType,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render when open', () => {
    render(<PastDateConfirmationDialog {...defaultProps} />);

    expect(screen.getByText('Historical Entry Detected')).toBeInTheDocument();
    expect(screen.getByText(/June 15, 2024/)).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<PastDateConfirmationDialog {...defaultProps} open={false} />);

    expect(screen.queryByText('Historical Entry Detected')).not.toBeInTheDocument();
  });

  it('should display entity type correctly', () => {
    render(<PastDateConfirmationDialog {...defaultProps} />);

    expect(screen.getByText(/rental ledger/)).toBeInTheDocument();
  });

  it('should display confidence score', () => {
    render(<PastDateConfirmationDialog {...defaultProps} />);

    expect(screen.getByText(/70%/)).toBeInTheDocument();
  });

  it('should call onConfirm when confirm button is clicked', () => {
    render(<PastDateConfirmationDialog {...defaultProps} />);

    const confirmButton = screen.getByText('Confirm as Historical Entry');
    fireEvent.click(confirmButton);

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('should call onOpenChange when cancel is clicked', () => {
    render(<PastDateConfirmationDialog {...defaultProps} />);

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalled();
  });

  it('should display warning about verification', () => {
    render(<PastDateConfirmationDialog {...defaultProps} />);

    expect(screen.getByText(/verify this date is correct/)).toBeInTheDocument();
  });

  describe('entity type labels', () => {
    it('should display "payment entry" for payment entity', () => {
      render(<PastDateConfirmationDialog {...defaultProps} entityType="payment" />);

      expect(screen.getByText(/payment entry/)).toBeInTheDocument();
    });

    it('should display "rider record" for rider entity', () => {
      render(<PastDateConfirmationDialog {...defaultProps} entityType="rider" />);

      expect(screen.getByText(/rider record/)).toBeInTheDocument();
    });

    it('should display "vehicle record" for vehicle entity', () => {
      render(<PastDateConfirmationDialog {...defaultProps} entityType="vehicle" />);

      expect(screen.getByText(/vehicle record/)).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have accessible title', () => {
      render(<PastDateConfirmationDialog {...defaultProps} />);

      expect(screen.getByRole('heading', { name: /historical entry detected/i })).toBeInTheDocument();
    });

    it('should have accessible buttons', () => {
      render(<PastDateConfirmationDialog {...defaultProps} />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /confirm as historical entry/i })).toBeInTheDocument();
    });
  });
});
