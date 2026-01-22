import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addMyMessage,
  addBoostedMessage,
  getMyMessageIds,
  getBoostedMessageIds,
  cleanupExpiredRecords,
  clearAllRecords,
} from '../../src/utils/storage';

describe('storage utils', () => {
  beforeEach(() => {
    // Clear the mock store - handled by jest.setup.js beforeEach
    jest.clearAllMocks();
  });

  describe('addMyMessage', () => {
    it('stores message with expiration', async () => {
      const id = 'test-message-1';
      const activeMinutes = 60;

      await addMyMessage(id, activeMinutes);

      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const ids = await getMyMessageIds();
      expect(ids.has(id)).toBe(true);
    });

    it('stores multiple messages', async () => {
      await addMyMessage('msg-1', 60);
      await addMyMessage('msg-2', 30);

      const ids = await getMyMessageIds();
      expect(ids.size).toBe(2);
      expect(ids.has('msg-1')).toBe(true);
      expect(ids.has('msg-2')).toBe(true);
    });
  });

  describe('addBoostedMessage', () => {
    it('stores boosted message', async () => {
      const id = 'boosted-1';
      const expiresAt = new Date(Date.now() + 60000).toISOString();

      await addBoostedMessage(id, expiresAt);

      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const ids = await getBoostedMessageIds();
      expect(ids.has(id)).toBe(true);
    });
  });

  describe('getMyMessageIds', () => {
    it('returns empty Set when no messages', async () => {
      const ids = await getMyMessageIds();
      expect(ids).toBeInstanceOf(Set);
      expect(ids.size).toBe(0);
    });

    it('returns Set of stored IDs', async () => {
      await addMyMessage('msg-1', 60);
      await addMyMessage('msg-2', 60);

      const ids = await getMyMessageIds();
      expect(ids.size).toBe(2);
    });
  });

  describe('getBoostedMessageIds', () => {
    it('returns empty Set when no messages', async () => {
      const ids = await getBoostedMessageIds();
      expect(ids).toBeInstanceOf(Set);
      expect(ids.size).toBe(0);
    });

    it('returns Set of boosted IDs', async () => {
      const expiresAt = new Date(Date.now() + 60000).toISOString();
      await addBoostedMessage('boost-1', expiresAt);
      await addBoostedMessage('boost-2', expiresAt);

      const ids = await getBoostedMessageIds();
      expect(ids.size).toBe(2);
    });
  });

  describe('cleanupExpiredRecords', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('removes expired messages', async () => {
      // Add a message that expires in the past
      const pastExpiry = new Date('2024-01-15T11:00:00.000Z').toISOString();
      const futureExpiry = new Date('2024-01-15T13:00:00.000Z').toISOString();

      // Manually set up records with past expiry
      await AsyncStorage.setItem('my_messages_v1', JSON.stringify([
        { id: 'expired', expiresAt: pastExpiry },
        { id: 'valid', expiresAt: futureExpiry },
      ]));

      await cleanupExpiredRecords();

      const ids = await getMyMessageIds();
      expect(ids.has('expired')).toBe(false);
      expect(ids.has('valid')).toBe(true);
    });

    it('keeps valid messages', async () => {
      const futureExpiry = new Date('2024-01-15T13:00:00.000Z').toISOString();

      await AsyncStorage.setItem('my_messages_v1', JSON.stringify([
        { id: 'valid-1', expiresAt: futureExpiry },
        { id: 'valid-2', expiresAt: futureExpiry },
      ]));

      await cleanupExpiredRecords();

      const ids = await getMyMessageIds();
      expect(ids.size).toBe(2);
    });
  });

  describe('clearAllRecords', () => {
    it('clears all message records', async () => {
      await addMyMessage('msg-1', 60);
      await addBoostedMessage('boost-1', new Date(Date.now() + 60000).toISOString());

      await clearAllRecords();

      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        'my_messages_v1',
        'boosted_messages_v1',
      ]);
    });
  });
});
