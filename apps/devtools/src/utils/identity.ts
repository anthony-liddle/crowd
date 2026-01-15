import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'crowd_user_id';
const CROWD_USER_IDS_KEY = 'crowd_user_ids';

export const getOrGenerateUserId = (): string => {
  const existingId = localStorage.getItem(STORAGE_KEY);
  if (existingId) {
    return existingId;
  }

  const newId = uuidv4();
  localStorage.setItem(STORAGE_KEY, newId);
  return newId;
};

export const refreshUserId = (): string => {
  const newId = uuidv4();
  localStorage.setItem(STORAGE_KEY, newId);
  return newId;
};

/**
 * Retrieves or generates a crowd-specific user ID for a given crowd.
 * @param crowdId The ID of the crowd.
 * @returns The crowd-specific user ID as a string.
 */
export const getOrGenerateCrowdUserId = (crowdId: string): string => {
  const stored = localStorage.getItem(CROWD_USER_IDS_KEY);
  let crowdUserIds: Record<string, string> = stored ? JSON.parse(stored) : {};

  if (!crowdUserIds[crowdId]) {
    crowdUserIds[crowdId] = uuidv4();
    localStorage.setItem(CROWD_USER_IDS_KEY, JSON.stringify(crowdUserIds));
  }

  return crowdUserIds[crowdId];
};

/**
 * Deletes a crowd-specific user ID from localStorage.
 * @param crowdId The ID of the crowd.
 */
export const deleteCrowdUserId = (crowdId: string): void => {
  const stored = localStorage.getItem(CROWD_USER_IDS_KEY);
  if (!stored) return;

  const crowdUserIds: Record<string, string> = JSON.parse(stored);
  delete crowdUserIds[crowdId];
  localStorage.setItem(CROWD_USER_IDS_KEY, JSON.stringify(crowdUserIds));
};

/**
 * Retrieves all crowd-specific user IDs.
 * @returns A record mapping crowd IDs to user IDs.
 */
export const getAllCrowdUserIds = (): Record<string, string> => {
  const stored = localStorage.getItem(CROWD_USER_IDS_KEY);
  return stored ? JSON.parse(stored) : {};
};
