import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageCard } from '../../src/components/MessageCard';
import type { Message } from '../../src/services/api';

const createMockMessage = (overrides: Partial<Message> = {}): Message => ({
  id: 'test-id',
  text: 'Test message content',
  timestamp: new Date('2024-01-15T12:00:00.000Z'),
  activeDistance: 0.5, // in km
  timeLeft: 30, // minutes remaining
  duration: 60,
  boostCount: 5,
  isOwner: false,
  isBoosted: false,
  expiresAt: new Date(Date.now() + 1800000).toISOString(),
  ...overrides,
});

describe('MessageCard', () => {
  it('renders message text', () => {
    const message = createMockMessage({ text: 'Hello, world!' });
    render(<MessageCard message={message} onBoost={vi.fn()} isProcessing={false} />);

    expect(screen.getByText('Hello, world!')).toBeInTheDocument();
  });

  it('shows time remaining', () => {
    const message = createMockMessage();
    render(<MessageCard message={message} onBoost={vi.fn()} isProcessing={false} />);

    // Should show some time remaining
    expect(screen.getByText(/\d+m? left|Expired/)).toBeInTheDocument();
  });

  it('shows "Expired" when timeLeft is 0', () => {
    const message = createMockMessage({
      timeLeft: 0,
    });
    render(<MessageCard message={message} onBoost={vi.fn()} isProcessing={false} />);

    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  it('shows boost button with count', () => {
    const message = createMockMessage({ boostCount: 5 });
    render(<MessageCard message={message} onBoost={vi.fn()} isProcessing={false} />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('applies boosted styling when already boosted', () => {
    const message = createMockMessage({ isBoosted: true });
    render(<MessageCard message={message} onBoost={vi.fn()} isProcessing={false} />);

    const button = screen.getByRole('button');
    expect(button.className).toContain('purple');
  });

  it('disables boost button when processing', () => {
    const message = createMockMessage({ isOwner: false, isBoosted: false });
    render(<MessageCard message={message} onBoost={vi.fn()} isProcessing={true} />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('disables boost button when expired', () => {
    const message = createMockMessage({ timeLeft: 0 });
    render(<MessageCard message={message} onBoost={vi.fn()} isProcessing={false} />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('calls onBoost when boost button clicked', () => {
    const onBoost = vi.fn();
    const message = createMockMessage({ isOwner: false, isBoosted: false });
    render(<MessageCard message={message} onBoost={onBoost} isProcessing={false} />);

    fireEvent.click(screen.getByRole('button'));

    expect(onBoost).toHaveBeenCalledWith(message);
  });

  it('shows "YOU" badge for owner messages', () => {
    const message = createMockMessage({ isOwner: true });
    render(<MessageCard message={message} onBoost={vi.fn()} isProcessing={false} />);

    expect(screen.getByText('YOU')).toBeInTheDocument();
  });

  it('displays boost count', () => {
    const message = createMockMessage({ boostCount: 10 });
    render(<MessageCard message={message} onBoost={vi.fn()} isProcessing={false} />);

    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('displays distance', () => {
    const message = createMockMessage({ activeDistance: 1.5 });
    render(<MessageCard message={message} onBoost={vi.fn()} isProcessing={false} />);

    expect(screen.getByText(/1\.5 km/)).toBeInTheDocument();
  });
});
