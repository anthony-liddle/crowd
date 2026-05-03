import AsyncStorage from '@react-native-async-storage/async-storage';

const MY_MESSAGES_KEY = 'my_messages_v1';
const BOOSTED_MESSAGES_KEY = 'boosted_messages_v1';

interface StoredMessageRecord {
  id: string;
  expiresAt: string; // ISO Date string
}

/**
 * Retrieves records from AsyncStorage.
 * @param key The key to retrieve records from.
 * @returns The records as an array of StoredMessageRecord objects.
 */
const getRecords = async (key: string): Promise<StoredMessageRecord[]> => {
  try {
    const json = await AsyncStorage.getItem(key);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
};

/**
 * Saves records to AsyncStorage.
 * @param key The key to save records to.
 * @param records The records to save.
 */
const saveRecords = async (key: string, records: StoredMessageRecord[]) => {
  await AsyncStorage.setItem(key, JSON.stringify(records));
};

/**
 * Adds a new message to the local storage.
 * @param id The ID of the message.
 * @param activeMinutes The number of minutes the message is active.
 */
export const addMyMessage = async (id: string, activeMinutes: number) => {
  const records = await getRecords(MY_MESSAGES_KEY);
  const expiresAt = new Date(Date.now() + activeMinutes * 60000).toISOString();
  records.push({ id, expiresAt });
  await saveRecords(MY_MESSAGES_KEY, records);
};

/**
 * Adds a new boosted message to the local storage.
 * @param id The ID of the message.
 * @param expiresAt The expiration date of the message.
 */
export const addBoostedMessage = async (id: string, expiresAt: string) => {
  const records = await getRecords(BOOSTED_MESSAGES_KEY);
  // The expiration timestamp drives local cleanup; the server is the source of
  // truth for whether a boosted message is still active.
  records.push({ id, expiresAt });
  await saveRecords(BOOSTED_MESSAGES_KEY, records);
};

/**
 * Clears all records from AsyncStorage.
 */
export const clearAllRecords = async () => {
  await AsyncStorage.multiRemove([MY_MESSAGES_KEY, BOOSTED_MESSAGES_KEY]);
};

/**
 * Cleans up expired records from AsyncStorage.
 */
export const cleanupExpiredRecords = async () => {
  const now = new Date();

  const clean = async (key: string) => {
    const records = await getRecords(key);
    const valid = records.filter(r => new Date(r.expiresAt) > now);
    if (valid.length !== records.length) {
      await saveRecords(key, valid);
    }
  };

  await clean(MY_MESSAGES_KEY);
  await clean(BOOSTED_MESSAGES_KEY);
};

/**
 * Retrieves the IDs of all my messages from AsyncStorage.
 * @returns A set of message IDs.
 */
export const getMyMessageIds = async (): Promise<Set<string>> => {
  const records = await getRecords(MY_MESSAGES_KEY);
  return new Set(records.map(r => r.id));
};

/**
 * Retrieves the IDs of all boosted messages from AsyncStorage.
 * @returns A set of message IDs.
 */
export const getBoostedMessageIds = async (): Promise<Set<string>> => {
  const records = await getRecords(BOOSTED_MESSAGES_KEY);
  return new Set(records.map(r => r.id));
};
