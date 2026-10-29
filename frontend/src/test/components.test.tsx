import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';

describe('UI Components Test Suite', () => {
  it('renders Badge with default and status variants', () => {
    const { rerender } = render(<Badge variant="success">Verified Mandate</Badge>);
    expect(screen.getByText('Verified Mandate')).toBeInTheDocument();

    rerender(<Badge variant="danger">Overdue</Badge>);
    expect(screen.getByText('Overdue')).toBeInTheDocument();

    rerender(<Badge variant="neutral">General Notice</Badge>);
    expect(screen.getByText('General Notice')).toBeInTheDocument();
  });

  it('renders Button with variants and responds to click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Submit Report</Button>);

    const button = screen.getByRole('button', { name: /Submit Report/i });
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders disabled Button and does not trigger clicks', () => {
    const handleClick = vi.fn();
    render(
      <Button disabled onClick={handleClick}>
        Disabled Action
      </Button>
    );

    const button = screen.getByRole('button', { name: /Disabled Action/i });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders Card with header and content sections', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>OSHA General Industry Standard</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Requires written hazard communication programs.</p>
        </CardContent>
      </Card>
    );

    expect(screen.getByText('OSHA General Industry Standard')).toBeInTheDocument();
    expect(screen.getByText('Requires written hazard communication programs.')).toBeInTheDocument();
  });

  it('renders EmptyState with action node', () => {
    render(
      <EmptyState
        title="No documents uploaded"
        description="Upload your operating permits to get started."
        action={<button>Upload Now</button>}
      />
    );

    expect(screen.getByText('No documents uploaded')).toBeInTheDocument();
    expect(screen.getByText('Upload your operating permits to get started.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload Now/i })).toBeInTheDocument();
  });
});
