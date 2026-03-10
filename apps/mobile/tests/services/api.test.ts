import { api } from '@repo/api';
import * as identity from '@/utils/identity';
import { getMessages, boostMessage, getMyCrowds } from '@/services/api';

// Mock the API client
jest.mock('@repo/api', () => ({
  api: {
    messages: {
      feed: jest.fn(),
      boost: jest.fn(),
    },
    crowds: {
      list: jest.fn(),
    },
  },
}));

// Mock identity utilities
jest.mock('@/utils/identity', () => ({
  getOrGenerateUserId: jest.fn(() => Promise.resolve('user-id')),
  getOrGenerateCrowdUserId: jest.fn(() => Promise.resolve('crowd-user-id')),
}));

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMessages', () => {
    it('should fetch messages with default location', async () => {
      const mockMessages = [
        {
          id: '1',
          text: 'Test',
          latitude: 37.7749,
          longitude: -122.4194,
          radiusMeters: 1000,
          activeMinutes: 60,
          createdAt: new Date(),
          expiresAt: new Date(),
          boostCount: 0,
        },
      ];

      (api.messages.feed as jest.Mock).mockResolvedValue(mockMessages);

      const result = await getMessages();

      expect(api.messages.feed).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should fetch messages with custom location', async () => {
      const mockMessages: any[] = [];
      (api.messages.feed as jest.Mock).mockResolvedValue(mockMessages);

      await getMessages({
        latitude: 40.7128,
        longitude: -74.0060,
        sortBy: 'soonest',
      });

      expect(api.messages.feed).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: 40.7128,
          longitude: -74.0060,
          sortBy: 'soonest',
        })
      );
    });

    it('should handle errors', async () => {
      (api.messages.feed as jest.Mock).mockRejectedValue(new Error('API Error'));

      await expect(getMessages()).rejects.toThrow();
    });
  });

  describe('boostMessage', () => {
    it('should boost a message', async () => {
      (api.messages.boost as jest.Mock).mockResolvedValue({ status: 'ok' });

      await boostMessage('message-id', {
        latitude: 37.7749,
        longitude: -122.4194,
      });

      expect(api.messages.boost).toHaveBeenCalledWith(
        'message-id',
        expect.objectContaining({
          latitude: 37.7749,
          longitude: -122.4194,
        })
      );
    });
  });

  describe('getMyCrowds', () => {
    it('should fetch user crowds', async () => {
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

      (api.crowds.list as jest.Mock).mockResolvedValue(mockCrowds);

      const result = await getMyCrowds();

      expect(api.crowds.list).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
