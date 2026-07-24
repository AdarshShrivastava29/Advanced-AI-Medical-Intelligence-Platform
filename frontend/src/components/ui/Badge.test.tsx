import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ClassBadge, RiskBadge } from '@/components/ui/Badge';

describe('RiskBadge', () => {
  it('renders the risk level label', () => {
    render(<RiskBadge level="high" />);
    expect(screen.getByText('HIGH RISK')).toBeInTheDocument();
  });
});

describe('ClassBadge', () => {
  it('renders the predicted class', () => {
    render(<ClassBadge label="PNEUMONIA" />);
    expect(screen.getByText('PNEUMONIA')).toBeInTheDocument();
  });
});
