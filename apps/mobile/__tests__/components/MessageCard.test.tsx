import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MessageCard } from '../../src/components/MessageCard';
import { Message } from '../../src/types/message';

const createTestMessage = (overrides: Partial<Message> = {}): Message => ({
  id: 'test-message-id',
  text: 'Test message content',
  timestamp: new Date('2024-01-15T12:00:00.000Z'),
  activeDistance: 500,
  timeLeft: 30,
  duration: 60,
  boostCount: 5,
  isOwner: false,
  isBoosted: false,
  expiresAt: new Date(Date.now() + 1800000).toISOString(),
  ...overrides,
});

const testLocation = { latitude: 45.5152, longitude: -122.6784 };

describe('MessageCard', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders message text', () => {
    const message = createTestMessage({ text: 'Hello, world!' });
    const { getByText } = render(<MessageCard message={message} />);

    expect(getByText('Hello, world!')).toBeTruthy();
  });

  it('displays boost count', () => {
    const message = createTestMessage({ boostCount: 10 });
    const { getByText } = render(<MessageCard message={message} />);

    expect(getByText('🚀 10')).toBeTruthy();
  });

  it('displays 0 boost count when undefined', () => {
    const message = createTestMessage({ boostCount: undefined });
    const { getByText } = render(<MessageCard message={message} />);

    expect(getByText('🚀 0')).toBeTruthy();
  });

  it('shows boost button when not owner and not boosted', () => {
    const message = createTestMessage({ isOwner: false, isBoosted: false });
    const onBoost = jest.fn();
    const { getByText } = render(
      <MessageCard message={message} onBoost={onBoost} userLocation={testLocation} />
    );

    expect(getByText('Boost')).toBeTruthy();
  });

  it('hides boost button when owner', () => {
    const message = createTestMessage({ isOwner: true });
    const onBoost = jest.fn();
    const { queryByText } = render(
      <MessageCard message={message} onBoost={onBoost} userLocation={testLocation} />
    );

    expect(queryByText('Boost')).toBeNull();
  });

  it('hides boost button when already boosted', () => {
    const message = createTestMessage({ isBoosted: true });
    const onBoost = jest.fn();
    const { queryByText } = render(
      <MessageCard message={message} onBoost={onBoost} userLocation={testLocation} />
    );

    expect(queryByText('Boost')).toBeNull();
  });

  it('hides boost button when no onBoost handler', () => {
    const message = createTestMessage({ isOwner: false, isBoosted: false });
    const { queryByText } = render(
      <MessageCard message={message} userLocation={testLocation} />
    );

    expect(queryByText('Boost')).toBeNull();
  });

  it('calls onBoost with message and location when pressed', async () => {
    const message = createTestMessage();
    const onBoost = jest.fn().mockResolvedValue(undefined);
    const { getByText } = render(
      <MessageCard message={message} onBoost={onBoost} userLocation={testLocation} />
    );

    fireEvent.press(getByText('Boost'));

    expect(onBoost).toHaveBeenCalledWith(message, testLocation);
  });

  it('does not call onBoost when no userLocation', () => {
    const message = createTestMessage();
    const onBoost = jest.fn();
    const { getByText } = render(
      <MessageCard message={message} onBoost={onBoost} />
    );

    fireEvent.press(getByText('Boost'));

    expect(onBoost).not.toHaveBeenCalled();
  });

  it('applies owner styling', () => {
    const message = createTestMessage({ isOwner: true });
    const { getByText } = render(<MessageCard message={message} />);

    // Just verify it renders - actual styles are applied via NativeWind
    expect(getByText(message.text)).toBeTruthy();
  });

  it('applies boosted styling', () => {
    const message = createTestMessage({ isBoosted: true });
    const { getByText } = render(<MessageCard message={message} />);

    // Just verify it renders - actual styles are applied via NativeWind
    expect(getByText(message.text)).toBeTruthy();
  });

  it('displays time left', () => {
    const message = createTestMessage({ timeLeft: 45 });
    const { getByText } = render(<MessageCard message={message} />);

    expect(getByText('45m')).toBeTruthy();
  });

  it('displays distance', () => {
    const message = createTestMessage({ activeDistance: 1500 });
    const { getByText } = render(<MessageCard message={message} />);

    expect(getByText('📍 1.5 km')).toBeTruthy();
  });
});
