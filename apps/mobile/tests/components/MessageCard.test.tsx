import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MessageCard } from '@/components/MessageCard';
import { Message, Location } from '@/types';

describe('MessageCard', () => {
  const mockMessage: Message = {
    id: '1',
    text: 'Test message',
    timestamp: new Date(),
    activeDistance: 500,
    timeLeft: 30,
    duration: 60,
    boostCount: 5,
    isOwner: false,
    isBoosted: false,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  };

  const mockLocation: Location = {
    latitude: 37.7749,
    longitude: -122.4194,
  };

  it('should render message text', () => {
    const { getByText } = render(
      <MessageCard message={mockMessage} userLocation={mockLocation} />
    );
    expect(getByText('Test message')).toBeTruthy();
  });

  it('should show boost button when user can boost', () => {
    const { getByText } = render(
      <MessageCard message={mockMessage} userLocation={mockLocation} />
    );
    expect(getByText('Boost')).toBeTruthy();
  });

  it('should not show boost button for own messages', () => {
    const ownMessage = { ...mockMessage, isOwner: true };
    const { queryByText } = render(
      <MessageCard message={ownMessage} userLocation={mockLocation} />
    );
    expect(queryByText('Boost')).toBeNull();
  });

  it('should not show boost button for already boosted messages', () => {
    const boostedMessage = { ...mockMessage, isBoosted: true };
    const { queryByText } = render(
      <MessageCard message={boostedMessage} userLocation={mockLocation} />
    );
    expect(queryByText('Boost')).toBeNull();
  });

  it('should call onBoost when boost button is pressed', async () => {
    const mockOnBoost = jest.fn();
    const { getByText } = render(
      <MessageCard
        message={mockMessage}
        onBoost={mockOnBoost}
        userLocation={mockLocation}
      />
    );

    const boostButton = getByText('Boost');
    fireEvent.press(boostButton);

    expect(mockOnBoost).toHaveBeenCalledWith(mockMessage, mockLocation);
  });

  it('should display boost count', () => {
    const { getByText } = render(
      <MessageCard message={mockMessage} userLocation={mockLocation} />
    );
    expect(getByText(/🚀 5/)).toBeTruthy();
  });

  it('should apply correct background color for owner messages', () => {
    const ownMessage = { ...mockMessage, isOwner: true };
    const { UNSAFE_getByType } = render(
      <MessageCard message={ownMessage} userLocation={mockLocation} />
    );
    const view = UNSAFE_getByType('View');
    expect(view.props.className).toContain('bg-blue-50');
  });

  it('should apply correct background color for boosted messages', () => {
    const boostedMessage = { ...mockMessage, isBoosted: true };
    const { UNSAFE_getByType } = render(
      <MessageCard message={boostedMessage} userLocation={mockLocation} />
    );
    const view = UNSAFE_getByType('View');
    expect(view.props.className).toContain('bg-purple-50');
  });
});
