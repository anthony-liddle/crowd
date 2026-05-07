import * as SecureStore from 'expo-secure-store';
import { v4 as uuidv4 } from 'uuid';
import 'react-native-get-random-values';
import { clearAllRecords } from './storage';

// SecureStore keys are kept stable across the Round 4 rename — changing
// `crowd_user_id` would orphan every existing device's identity.
const USER_ID_KEY = 'crowd_user_id';
const ROTATION_CLOCK_KEY = 'crowd_rotation_clock';
const CROWD_USER_IDS_KEY = 'crowd_user_ids';

/**
 * Retrieves the rotation clock from secure storage.
 */
export const getRotationClock = async (): Promise<Date | null> => {
  try {
    const clock = await SecureStore.getItemAsync(ROTATION_CLOCK_KEY);
    return clock ? new Date(clock) : null;
  } catch {
    return null;
  }
};

/**
 * Updates the rotation clock in secure storage.
 */
export const updateRotationClock = async (expiresAt: Date) => {
  try {
    const currentClock = await getRotationClock();
    if (!currentClock || expiresAt > currentClock) {
      await SecureStore.setItemAsync(ROTATION_CLOCK_KEY, expiresAt.toISOString());
    }
  } catch (error) {
    console.error('Error updating rotation clock:', error);
  }
};

/**
 * The device's identity for the global feed. Rotates when the user's
 * content runs out, per the project's anonymity model. NEVER used for any
 * Crowds operation — Crowds endpoints take crowd-specific IDs, which are
 * managed via `getOrGenerateCrowdUserId` and friends.
 */
export const getOrGenerateGlobalUserId = async (): Promise<string> => {
  try {
    let userId = await SecureStore.getItemAsync(USER_ID_KEY);
    const rotationClock = await getRotationClock();
    const now = new Date();

    if (userId && rotationClock && now > rotationClock) {
      userId = uuidv4();
      await SecureStore.setItemAsync(USER_ID_KEY, userId);
      await SecureStore.deleteItemAsync(ROTATION_CLOCK_KEY);
      await clearAllRecords();
      console.log('User ID rotated and local records cleared.');
    } else if (!userId) {
      userId = uuidv4();
      await SecureStore.setItemAsync(USER_ID_KEY, userId);
    }
    return userId;
  } catch (error) {
    console.error('Error with user identity:', error);
    return '00000000-0000-0000-0000-000000000000';
  }
};

const readCrowdUserIdMap = async (): Promise<Record<string, string>> => {
  const stored = await SecureStore.getItemAsync(CROWD_USER_IDS_KEY);
  if (!stored) return {};
  try {
    return JSON.parse(stored);
  } catch (parseError) {
    console.error('Failed to parse crowd user IDs, resetting:', parseError);
    await SecureStore.deleteItemAsync(CROWD_USER_IDS_KEY);
    return {};
  }
};

const writeCrowdUserIdMap = async (map: Record<string, string>): Promise<void> => {
  await SecureStore.setItemAsync(CROWD_USER_IDS_KEY, JSON.stringify(map));
};

/**
 * The device's stable identity within a single crowd. Generated once per
 * crowd, persists for the duration of the user's membership, survives
 * global ID rotation. Purged when the user leaves the crowd or the crowd
 * expires (see `deleteCrowdUserId` and the expiration-purge step in
 * `getMyCrowds`).
 */
export const getOrGenerateCrowdUserId = async (crowdId: string): Promise<string> => {
  try {
    const map = await readCrowdUserIdMap();
    if (!map[crowdId]) {
      map[crowdId] = uuidv4();
      await writeCrowdUserIdMap(map);
    }
    return map[crowdId];
  } catch (error) {
    console.error('Error with crowd user identity:', error);
    return '00000000-0000-0000-0000-000000000000';
  }
};

/**
 * Stores a crowd-specific ID that was generated outside of
 * `getOrGenerateCrowdUserId`. Used by `createCrowd`, which mints the ID
 * before the create request (so the server can use it for both ownerId and
 * the membership row in a single transaction) and persists it locally only
 * after the server confirms creation.
 */
export const storeCrowdUserId = async (crowdId: string, crowdUserId: string): Promise<void> => {
  try {
    const map = await readCrowdUserIdMap();
    map[crowdId] = crowdUserId;
    await writeCrowdUserIdMap(map);
  } catch (error) {
    console.error('Error storing crowd user identity:', error);
  }
};

/**
 * Removes a crowd-specific ID from the device. Called immediately after a
 * successful leave, and lazily when `getMyCrowds` confirms a stored crowd
 * no longer exists on the server.
 */
export const deleteCrowdUserId = async (crowdId: string): Promise<void> => {
  try {
    const map = await readCrowdUserIdMap();
    if (!(crowdId in map)) return;
    delete map[crowdId];
    await writeCrowdUserIdMap(map);
  } catch (error) {
    console.error('Error deleting crowd user identity:', error);
  }
};

/**
 * Returns the full {crowdId: crowdUserId} map. Used by `getMyCrowds` to
 * send all stored crowd-specific IDs to the lookup endpoint and to
 * reconcile the local map against the server's response.
 */
export const getAllCrowdUserIds = async (): Promise<Record<string, string>> => {
  try {
    return await readCrowdUserIdMap();
  } catch (error) {
    console.error('Error retrieving crowd user identities:', error);
    return {};
  }
};
