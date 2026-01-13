import { api } from '@repo/api';
import Constants from 'expo-constants';
import { Message, CreateMessagePayload, Location } from '@/types';
import { getOrGenerateUserId, updateRotationClock } from '@/utils/identity';
import { addMyMessage, addBoostedMessage } from '@/utils/storage';

// API base URL configuration
// Priority: EXPO_PUBLIC_API_URL env var > dynamic localhost detection
// For production backend, set EXPO_PUBLIC_API_URL in .env file
// For local development, leave EXPO_PUBLIC_API_URL unset to use localhost

const getBaseUrl = (): string => {
  // If EXPO_PUBLIC_API_URL is set, use it 
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Otherwise, use dynamic localhost detection for local development
  // This works with both simulator and physical devices
  const origin = Constants.expoConfig?.hostUri?.split(':')[0];
  return origin ? `http://${origin}:8080` : 'http://localhost:8080';
};

const baseUrl = getBaseUrl();

api.setBaseUrl(baseUrl);
console.log('API Base URL set to:', baseUrl);

// TODO: Get actual user location. Hardcoded to Portland, OR for now.
const DEFAULT_LOCATION = {
  latitude: 45.5152,
  longitude: -122.6784,
};

interface LocationParams extends Location {
  sortBy?: 'nearest' | 'soonest';
}

/**
 * Get all messages from the API
 */
export const getMessages = async (params?: LocationParams): Promise<Message[]> => {
  try {
    const latitude = params?.latitude ?? DEFAULT_LOCATION.latitude;
    const longitude = params?.longitude ?? DEFAULT_LOCATION.longitude;
    const userId = await getOrGenerateUserId();

    const dtos = await api.messages.feed({
      latitude,
      longitude,
      userId,
      sortBy: params?.sortBy ?? 'nearest',
    });

    return dtos.map((dto) => {
      const expiresAtDate = new Date(dto.expiresAt);
      const timeLeftMinutes = Math.max(0, Math.round((expiresAtDate.getTime() - Date.now()) / 60000));

      return {
        id: dto.id,
        text: dto.text,
        timestamp: new Date(dto.createdAt),
        activeDistance: dto.distance ? parseFloat(dto.distance.toFixed(1)) : 0,
        timeLeft: timeLeftMinutes,
        duration: dto.activeMinutes,
        boostCount: dto.boostCount,
        isOwner: dto.isOwner,
        isBoosted: dto.isBoosted,
        expiresAt: new Date(dto.expiresAt).toISOString(),
      };
    });
  } catch (error) {
    // TODO: Proper error handling
    console.error('Failed to fetch messages:', error);
    throw error;
  }
};

/**
 * Create a new message
 */
export const createMessage = async (payload: CreateMessagePayload, params?: LocationParams): Promise<Message> => {
  try {
    const latitude = params?.latitude ?? DEFAULT_LOCATION.latitude;
    const longitude = params?.longitude ?? DEFAULT_LOCATION.longitude;
    const userId = await getOrGenerateUserId();

    const response = await api.messages.post({
      text: payload.text,
      activeMinutes: payload.duration,
      radiusMeters: Math.round(payload.distance),
      latitude,
      longitude,
      userId,
    });

    await addMyMessage(response.id, payload.duration);

    // Update rotation clock to the expiration of this new message
    const expiresAt = new Date(Date.now() + payload.duration * 60000);
    await updateRotationClock(expiresAt);

    // Return an optimistic message object to satisfy the interface
    // Note: The UI currently re-fetches the feed, so this return value is mostly unused
    return {
      id: response.id,
      text: payload.text,
      timestamp: new Date(),
      activeDistance: payload.distance,
      timeLeft: payload.duration,
      duration: payload.duration,
      boostCount: 0,
      isOwner: true,
      isBoosted: false,
      expiresAt: new Date(Date.now() + payload.duration * 60000).toISOString(),
    };
  } catch (error) {
    // TODO: Proper error handling
    console.error('Failed to create message:', error);
    throw error;
  }
};

export const boostMessage = async (messageId: string, expiresAt: string, params?: LocationParams) => {
  try {
    const latitude = params?.latitude ?? DEFAULT_LOCATION.latitude;
    const longitude = params?.longitude ?? DEFAULT_LOCATION.longitude;
    const userId = await getOrGenerateUserId();

    await api.messages.boost(messageId, {
      userId,
      latitude,
      longitude,
    });

    await addBoostedMessage(messageId, expiresAt);

    // Update rotation clock
    await updateRotationClock(new Date(expiresAt));
  } catch (error) {
    // TODO: Proper error handling
    console.error('Failed to boost message:', error);
    throw error;
  }
};


