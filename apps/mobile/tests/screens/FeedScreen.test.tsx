import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { FeedScreen } from '@/screens/FeedScreen';
import * as api from '@/services/api';

// Mock the API
jest.mock('@/services/api', () => ({
  getMessages: jest.fn(),
  boostMessage: jest.fn(),
  getMyCrowds: jest.fn(),
}));

// Mock useLocation hook
jest.mock('@/hooks/useLocation', () => ({
  useLocation: () => ({
    location: { latitude: 37.7749, longitude: -122.4194 },
    errorMsg: null,
    loading: false,
    refreshLocation: jest.fn(),
  }),
}));

// Mock storage
jest.mock('@/utils/storage', () => ({
  cleanupExpiredRecords: jest.fn(() => Promise.resolve()),
}));

describe('FeedScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.getMessages as jest.Mock).mockResolvedValue([]);
    (api.getMyCrowds as jest.Mock).mockResolvedValue([]);
  });

  it('should render feed screen', async () => {
    const { getByText } = render(<FeedScreen />);
    
    await waitFor(() => {
      expect(api.getMessages).toHaveBeenCalled();
    });
  });

  it('should load messages on mount', async () => {
    const mockMessages = [
      {
        id: '1',
        text: 'Test message',
        timestamp: new Date(),
        activeDistance: 500,
        timeLeft: 30,
        duration: 60,
        boostCount: 0,
        isOwner: false,
        isBoosted: false,
        expiresAt: new Date().toISOString(),
      },
    ];

    (api.getMessages as jest.Mock).mockResolvedValue(mockMessages);

    render(<FeedScreen />);

    await waitFor(() => {
      expect(api.getMessages).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: 37.7749,
          longitude: -122.4194,
        })
      );
    });
  });

  it('should load crowds on mount', async () => {
    const mockCrowds = [
      {
        id: 'crowd-1',
        name: 'Test Crowd',
        isOpen: true,
        isOwner: true,
        memberCount: 5,
        createdAt: new Date(),
        expiresAt: new Date(),
        canInvite: true,
      },
    ];

    (api.getMyCrowds as jest.Mock).mockResolvedValue(mockCrowds);

    render(<FeedScreen />);

    await waitFor(() => {
      expect(api.getMyCrowds).toHaveBeenCalled();
    });
  });
});
