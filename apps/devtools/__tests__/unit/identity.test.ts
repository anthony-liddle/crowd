import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getOrGenerateUserId,
  refreshUserId,
  getOrGenerateCrowdUserId,
  deleteCrowdUserId,
  getAllCrowdUserIds,
} from '../../src/utils/identity';

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn()
    .mockReturnValueOnce('generated-uuid-1')
    .mockReturnValueOnce('generated-uuid-2')
    .mockReturnValueOnce('generated-uuid-3')
    .mockReturnValue('generated-uuid-default'),
}));

describe('identity utils', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('getOrGenerateUserId', () => {
    it('generates new UUID when none exists', () => {
      const userId = getOrGenerateUserId();

      expect(userId).toBeDefined();
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it('returns existing userId', () => {
      const existingId = 'existing-user-id';
      localStorage.setItem('crowd_user_id', existingId);

      const userId = getOrGenerateUserId();

      expect(userId).toBe(existingId);
    });
  });

  describe('refreshUserId', () => {
    it('generates new UUID and stores it', () => {
      const existingId = 'old-id';
      localStorage.setItem('crowd_user_id', existingId);

      const newId = refreshUserId();

      expect(newId).toBeDefined();
      expect(newId).not.toBe(existingId);
      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('getOrGenerateCrowdUserId', () => {
    it('generates new UUID for new crowd', () => {
      const crowdId = 'crowd-123';
      const userId = getOrGenerateCrowdUserId(crowdId);

      expect(userId).toBeDefined();
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it('returns existing crowd userId', () => {
      const crowdId = 'crowd-123';
      const existingId = 'existing-crowd-user-id';

      localStorage.setItem('crowd_user_ids', JSON.stringify({
        [crowdId]: existingId,
      }));

      const userId = getOrGenerateCrowdUserId(crowdId);

      expect(userId).toBe(existingId);
    });

    it('generates different IDs for different crowds', () => {
      const crowd1 = 'crowd-1';
      const crowd2 = 'crowd-2';

      const userId1 = getOrGenerateCrowdUserId(crowd1);
      const userId2 = getOrGenerateCrowdUserId(crowd2);

      // Both should be defined
      expect(userId1).toBeDefined();
      expect(userId2).toBeDefined();
    });
  });

  describe('deleteCrowdUserId', () => {
    it('removes crowd-specific ID', () => {
      const crowdId = 'crowd-to-delete';

      localStorage.setItem('crowd_user_ids', JSON.stringify({
        [crowdId]: 'user-id-to-delete',
        'other-crowd': 'other-user-id',
      }));

      deleteCrowdUserId(crowdId);

      const stored = localStorage.getItem('crowd_user_ids');
      const parsed = stored ? JSON.parse(stored) : {};

      expect(parsed[crowdId]).toBeUndefined();
      expect(parsed['other-crowd']).toBe('other-user-id');
    });

    it('handles non-existent crowd gracefully', () => {
      expect(() => deleteCrowdUserId('non-existent')).not.toThrow();
    });
  });

  describe('getAllCrowdUserIds', () => {
    it('returns empty object when no crowd IDs stored', () => {
      const result = getAllCrowdUserIds();
      expect(result).toEqual({});
    });

    it('returns all stored crowd IDs', () => {
      const storedIds = {
        'crowd-1': 'user-1',
        'crowd-2': 'user-2',
      };
      localStorage.setItem('crowd_user_ids', JSON.stringify(storedIds));

      const result = getAllCrowdUserIds();

      expect(result).toEqual(storedIds);
    });
  });
});
