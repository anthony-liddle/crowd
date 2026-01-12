import * as SecureStore from 'expo-secure-store';
import { v4 as uuidv4 } from 'uuid';
import 'react-native-get-random-values';
import { clearAllRecords } from './storage';

const USER_ID_KEY = 'crowd_user_id';
const ROTATION_CLOCK_KEY = 'crowd_rotation_clock';

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
