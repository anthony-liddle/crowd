import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'crowd_user_id';
const CROWD_USER_IDS_KEY = 'crowd_user_ids';

/**
 * The devtools' identity for the global feed. Mirrors the mobile app's
 * `getOrGenerateGlobalUserId`. Never used for any Crowds operation.
 */
export const getOrGenerateGlobalUserId = (): string => {
  const existingId = localStorage.getItem(STORAGE_KEY);
  if (existingId) {
    return existingId;
  }

  const newId = uuidv4();
  localStorage.setItem(STORAGE_KEY, newId);
  return newId;
};

/** Forces a new global user ID. Dev-only — used to simulate rotation. */
export const refreshGlobalUserId = (): string => {
  const newId = uuidv4();
  localStorage.setItem(STORAGE_KEY, newId);
  return newId;
};

const readMap = (): Record<string, string> => {
  const stored = localStorage.getItem(CROWD_USER_IDS_KEY);
  return stored ? JSON.parse(stored) : {};
};

const writeMap = (map: Record<string, string>): void => {
  localStorage.setItem(CROWD_USER_IDS_KEY, JSON.stringify(map));
};

/**
 * The device's stable identity within a single crowd.
 */
export const getOrGenerateCrowdUserId = (crowdId: string): string => {
  const map = readMap();
  if (!map[crowdId]) {
    map[crowdId] = uuidv4();
    writeMap(map);
  }
  return map[crowdId];
};

/** Persists a pre-generated crowd-specific ID. Used by createCrowd. */
export const storeCrowdUserId = (crowdId: string, crowdUserId: string): void => {
  const map = readMap();
  map[crowdId] = crowdUserId;
  writeMap(map);
};

export const deleteCrowdUserId = (crowdId: string): void => {
  const map = readMap();
  if (!(crowdId in map)) return;
  delete map[crowdId];
  writeMap(map);
};

export const getAllCrowdUserIds = (): Record<string, string> => readMap();
