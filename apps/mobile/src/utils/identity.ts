import * as SecureStore from 'expo-secure-store';
import { v4 as uuidv4 } from 'uuid';
import 'react-native-get-random-values';
import { clearAllRecords } from './storage';

const USER_ID_KEY = 'crowd_user_id';
const ROTATION_CLOCK_KEY = 'crowd_rotation_clock';
const CROWD_USER_IDS_KEY = 'crowd_user_ids';

/**
 * Retrieves the rotation clock from secure storage.
 * @returns The rotation clock as a Date object, or null if not found.
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
 * @param expiresAt The new rotation clock as a Date object.
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
 * Retrieves or generates a user ID from secure storage.
 * @returns The user ID as a string.
 */
export const getOrGenerateUserId = async (): Promise<string> => {
  try {
    let userId = await SecureStore.getItemAsync(USER_ID_KEY);
    const rotationClock = await getRotationClock();
    const now = new Date();

    if (userId && rotationClock && now > rotationClock) {
      // Rotate userId
      userId = uuidv4();
      await SecureStore.setItemAsync(USER_ID_KEY, userId);
      // Reset rotation clock
      await SecureStore.deleteItemAsync(ROTATION_CLOCK_KEY);
      // Clear local storage records
      await clearAllRecords();
      console.log('User ID rotated and local records cleared.');
    } else if (!userId) {
      userId = uuidv4();
      await SecureStore.setItemAsync(USER_ID_KEY, userId);
    }
    return userId;
  } catch (error) {
    console.error('Error with user identity:', error);
    // Fallback if SecureStore fails (e.g. dev environment issues)
    return '00000000-0000-0000-0000-000000000000';
  }
};

/**
 * Retrieves or generates a crowd-specific user ID for a given crowd.
 * @param crowdId The ID of the crowd.
 * @returns The crowd-specific user ID as a string.
 */
export const getOrGenerateCrowdUserId = async (crowdId: string): Promise<string> => {
  try {
    const stored = await SecureStore.getItemAsync(CROWD_USER_IDS_KEY);
    let crowdUserIds: Record<string, string> = {};

    if (stored) {
      try {
        crowdUserIds = JSON.parse(stored);
      } catch (parseError) {
        console.error('Failed to parse crowd user IDs, resetting:', parseError);
        await SecureStore.deleteItemAsync(CROWD_USER_IDS_KEY);
      }
    }

    if (!crowdUserIds[crowdId]) {
      crowdUserIds[crowdId] = uuidv4();
      await SecureStore.setItemAsync(CROWD_USER_IDS_KEY, JSON.stringify(crowdUserIds));
    }

    return crowdUserIds[crowdId];
  } catch (error) {
    console.error('Error with crowd user identity:', error);
    // Fallback if SecureStore fails
    return '00000000-0000-0000-0000-000000000000';
  }
};

/**
 * Deletes a crowd-specific user ID from secure storage.
 * @param crowdId The ID of the crowd.
 */
export const deleteCrowdUserId = async (crowdId: string): Promise<void> => {
  try {
    const stored = await SecureStore.getItemAsync(CROWD_USER_IDS_KEY);
    if (!stored) return;

    let crowdUserIds: Record<string, string>;
    try {
      crowdUserIds = JSON.parse(stored);
    } catch (parseError) {
      console.error('Failed to parse crowd user IDs during delete, resetting:', parseError);
      await SecureStore.deleteItemAsync(CROWD_USER_IDS_KEY);
      return;
    }

    delete crowdUserIds[crowdId];
    await SecureStore.setItemAsync(CROWD_USER_IDS_KEY, JSON.stringify(crowdUserIds));
  } catch (error) {
    console.error('Error deleting crowd user identity:', error);
  }
};

/**
 * Retrieves all crowd-specific user IDs.
 * @returns A record mapping crowd IDs to user IDs.
 */
export const getAllCrowdUserIds = async (): Promise<Record<string, string>> => {
  try {
    const stored = await SecureStore.getItemAsync(CROWD_USER_IDS_KEY);
    if (!stored) return {};

    try {
      return JSON.parse(stored);
    } catch (parseError) {
      console.error('Failed to parse crowd user IDs, resetting:', parseError);
      await SecureStore.deleteItemAsync(CROWD_USER_IDS_KEY);
      return {};
    }
  } catch (error) {
    console.error('Error retrieving crowd user identities:', error);
    return {};
  }
};
