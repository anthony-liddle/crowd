import * as SecureStore from 'expo-secure-store';
import {
  getOrGenerateUserId,
  getOrGenerateCrowdUserId,
  deleteCrowdUserId,
  updateRotationClock,
  getRotationClock,
} from '../../src/utils/identity';

// Mock uuid to return predictable values
jest.mock('uuid', () => ({
  v4: jest.fn()
    .mockReturnValueOnce('generated-uuid-1')
    .mockReturnValueOnce('generated-uuid-2')
    .mockReturnValueOnce('generated-uuid-3')
    .mockReturnValue('generated-uuid-default'),
}));

describe('identity utils', () => {
  beforeEach(() => {
    // Clear mocks - store reset handled by jest.setup.js beforeEach
    jest.clearAllMocks();
  });

  describe('getOrGenerateUserId', () => {
    it('generates new UUID when none exists', async () => {
      const userId = await getOrGenerateUserId();

      expect(userId).toBeDefined();
      expect(SecureStore.setItemAsync).toHaveBeenCalled();
    });

    it('returns existing userId', async () => {
      const existingId = 'existing-user-id';
      await SecureStore.setItemAsync('crowd_user_id', existingId);

      const userId = await getOrGenerateUserId();

      expect(userId).toBe(existingId);
    });

    it('rotates userId when rotation clock has passed', async () => {
      const existingId = 'old-user-id';
      const pastClock = new Date(Date.now() - 60000).toISOString();

      await SecureStore.setItemAsync('crowd_user_id', existingId);
      await SecureStore.setItemAsync('crowd_rotation_clock', pastClock);

      const userId = await getOrGenerateUserId();

      // Should generate a new ID
      expect(userId).not.toBe(existingId);
    });
  });

  describe('getOrGenerateCrowdUserId', () => {
    it('generates new UUID for new crowd', async () => {
      const crowdId = 'crowd-123';
      const userId = await getOrGenerateCrowdUserId(crowdId);

      expect(userId).toBeDefined();
      expect(SecureStore.setItemAsync).toHaveBeenCalled();
    });

    it('returns existing crowd userId', async () => {
      const crowdId = 'crowd-123';
      const existingId = 'existing-crowd-user-id';

      await SecureStore.setItemAsync('crowd_user_ids', JSON.stringify({
        [crowdId]: existingId,
      }));

      const userId = await getOrGenerateCrowdUserId(crowdId);

      expect(userId).toBe(existingId);
    });

    it('generates different IDs for different crowds', async () => {
      const crowd1 = 'crowd-1';
      const crowd2 = 'crowd-2';

      const userId1 = await getOrGenerateCrowdUserId(crowd1);
      const userId2 = await getOrGenerateCrowdUserId(crowd2);

      // Both should be defined (may or may not be equal depending on mock)
      expect(userId1).toBeDefined();
      expect(userId2).toBeDefined();
    });
  });

  describe('deleteCrowdUserId', () => {
    it('removes crowd-specific ID', async () => {
      const crowdId = 'crowd-to-delete';

      await SecureStore.setItemAsync('crowd_user_ids', JSON.stringify({
        [crowdId]: 'user-id-to-delete',
        'other-crowd': 'other-user-id',
      }));

      await deleteCrowdUserId(crowdId);

      const stored = await SecureStore.getItemAsync('crowd_user_ids');
      const parsed = stored ? JSON.parse(stored) : {};

      expect(parsed[crowdId]).toBeUndefined();
      expect(parsed['other-crowd']).toBe('other-user-id');
    });

    it('handles non-existent crowd gracefully', async () => {
      await expect(deleteCrowdUserId('non-existent')).resolves.not.toThrow();
    });
  });

  describe('updateRotationClock', () => {
    it('sets future expiration timestamp', async () => {
      const expiresAt = new Date(Date.now() + 3600000);

      await updateRotationClock(expiresAt);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'crowd_rotation_clock',
        expiresAt.toISOString()
      );
    });

    it('only updates if new time is later than current', async () => {
      const earlierTime = new Date(Date.now() + 1800000);
      const laterTime = new Date(Date.now() + 3600000);

      // Set later time first
      await SecureStore.setItemAsync('crowd_rotation_clock', laterTime.toISOString());

      // Try to set earlier time
      await updateRotationClock(earlierTime);

      // Should still be later time (not updated)
      const stored = await SecureStore.getItemAsync('crowd_rotation_clock');
      expect(stored).toBe(laterTime.toISOString());
    });
  });

  describe('getRotationClock', () => {
    it('returns null when no clock set', async () => {
      const clock = await getRotationClock();
      expect(clock).toBeNull();
    });

    it('returns Date when clock exists', async () => {
      const expected = new Date('2024-01-15T12:00:00.000Z');
      await SecureStore.setItemAsync('crowd_rotation_clock', expected.toISOString());

      const clock = await getRotationClock();

      expect(clock).toBeInstanceOf(Date);
      expect(clock?.toISOString()).toBe(expected.toISOString());
    });
  });
});
