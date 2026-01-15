import { api } from '@repo/api';
import Constants from 'expo-constants';
import { 
  Message, 
  CreateMessagePayload, 
  Location, 
  Crowd, 
  CreateCrowdPayload 
} from '@/types';
import { 
  getOrGenerateUserId, 
  updateRotationClock, 
  getOrGenerateCrowdUserId, 
  deleteCrowdUserId, 
  getAllCrowdUserIds 
} from '@/utils/identity';
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

interface FeedParams extends LocationParams {
  crowdId?: string;
}

/**
 * Get all messages from the API (global or crowd-specific)
 */
export const getMessages = async (params?: FeedParams): Promise<Message[]> => {
  try {
    const latitude = params?.latitude ?? DEFAULT_LOCATION.latitude;
    const longitude = params?.longitude ?? DEFAULT_LOCATION.longitude;
    // Use crowd-specific ID if crowdId is provided, otherwise use main user ID
    const userId = params?.crowdId 
      ? await getOrGenerateCrowdUserId(params.crowdId)
      : await getOrGenerateUserId();

    const dtos = await api.messages.feed({
      latitude,
      longitude,
      userId,
      sortBy: params?.sortBy ?? 'nearest',
      crowdId: params?.crowdId,
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

interface CreateMessageParams extends LocationParams {
  crowdId?: string;
}

/**
 * Create a new message (global or to a specific crowd)
 */
export const createMessage = async (payload: CreateMessagePayload, params?: CreateMessageParams): Promise<Message> => {
  try {
    const latitude = params?.latitude ?? DEFAULT_LOCATION.latitude;
    const longitude = params?.longitude ?? DEFAULT_LOCATION.longitude;
    // Use crowd-specific ID if crowdId is provided, otherwise use main user ID
    const userId = params?.crowdId 
      ? await getOrGenerateCrowdUserId(params.crowdId)
      : await getOrGenerateUserId();

    const response = await api.messages.post({
      text: payload.text,
      activeMinutes: payload.duration,
      radiusMeters: Math.round(payload.distance),
      latitude,
      longitude,
      userId,
      crowdId: params?.crowdId,
    });

    await addMyMessage(response.id, payload.duration);

    // Update rotation clock to the expiration of this new message (only for global messages)
    if (!params?.crowdId) {
      const expiresAt = new Date(Date.now() + payload.duration * 60000);
      await updateRotationClock(expiresAt);
    }

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

export const boostMessage = async (messageId: string, expiresAt: string, params?: LocationParams & { crowdId?: string }) => {
  try {
    const latitude = params?.latitude ?? DEFAULT_LOCATION.latitude;
    const longitude = params?.longitude ?? DEFAULT_LOCATION.longitude;
    // Use crowd-specific ID if crowdId is provided, otherwise use main user ID
    const userId = params?.crowdId 
      ? await getOrGenerateCrowdUserId(params.crowdId)
      : await getOrGenerateUserId();

    await api.messages.boost(messageId, {
      userId,
      latitude,
      longitude,
    });

    await addBoostedMessage(messageId, expiresAt);

    // Update rotation clock (only for global messages)
    if (!params?.crowdId) {
      await updateRotationClock(new Date(expiresAt));
    }
  } catch (error) {
    // TODO: Proper error handling
    console.error('Failed to boost message:', error);
    throw error;
  }
};

// ==================== CROWDS API ====================

/**
 * Create a new crowd (24 hour expiration)
 */
export const createCrowd = async (payload: CreateCrowdPayload): Promise<Crowd> => {
  try {
    // Create crowd with main user ID (this sets ownerId and creates initial membership)
    const mainUserId = await getOrGenerateUserId();
    const response = await api.crowds.create({
      name: payload.name,
      isOpen: payload.isOpen,
      userId: mainUserId,
    });

    // Generate and store crowd-specific ID for this crowd
    const crowdUserId = await getOrGenerateCrowdUserId(response.id);
    
    // Update membership to use crowd-specific ID instead of main ID
    // Note: ownerId in crowds table stays as mainUserId (historical record of creator)
    try {
      await api.crowds.leave(response.id, { userId: mainUserId });
      await api.crowds.join(response.id, { userId: crowdUserId });
    } catch (err) {
      // If update fails, still store the crowd ID locally for future operations
      console.warn('Failed to update membership with crowd-specific ID:', err);
    }

    // Return optimistic crowd object
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    return {
      id: response.id,
      name: payload.name,
      isOpen: payload.isOpen,
      isOwner: true, // User is owner (ownerId matches mainUserId, even though membership uses crowdUserId)
      memberCount: 1,
      createdAt: now,
      expiresAt,
      canInvite: true,
    };
  } catch (error) {
    console.error('Failed to create crowd:', error);
    throw error;
  }
};

/**
 * Get user's active crowds
 * Queries with main user ID and all crowd-specific IDs to find all crowds user belongs to
 */
export const getMyCrowds = async (): Promise<Crowd[]> => {
  try {
    const mainUserId = await getOrGenerateUserId();
    const crowdUserIds = await getAllCrowdUserIds();
    // Query main user ID first to get correct isOwner status
    const allUserIds = [mainUserId, ...Object.values(crowdUserIds)];

    // Query crowds for each user ID and combine results
    const allCrowds = new Map<string, Crowd>();
    
    for (const userId of allUserIds) {
      try {
        const dtos = await api.crowds.list(userId);
        for (const dto of dtos) {
          // Use crowd ID as key to avoid duplicates
          // Prefer entries with isOwner=true when there are duplicates
          const existing = allCrowds.get(dto.id);
          if (!existing || (dto.isOwner && !existing.isOwner)) {
            allCrowds.set(dto.id, {
              id: dto.id,
              name: dto.name,
              isOpen: dto.isOpen,
              isOwner: dto.isOwner,
              memberCount: dto.memberCount,
              createdAt: new Date(dto.createdAt),
              expiresAt: new Date(dto.expiresAt),
              canInvite: dto.canInvite,
            });
          }
        }
      } catch (err) {
        // Continue with other user IDs if one fails
        console.warn(`Failed to fetch crowds for user ID ${userId}:`, err);
      }
    }

    return Array.from(allCrowds.values());
  } catch (error) {
    console.error('Failed to fetch crowds:', error);
    throw error;
  }
};

/**
 * Join a crowd by ID
 */
export const joinCrowd = async (crowdId: string): Promise<void> => {
  try {
    // Generate crowd-specific ID first
    const crowdUserId = await getOrGenerateCrowdUserId(crowdId);
    
    // Join with crowd-specific ID
    await api.crowds.join(crowdId, { userId: crowdUserId });
  } catch (error) {
    console.error('Failed to join crowd:', error);
    throw error;
  }
};

/**
 * Leave a crowd
 */
export const leaveCrowd = async (crowdId: string): Promise<void> => {
  try {
    // Get crowd-specific ID for leaving
    const crowdUserId = await getOrGenerateCrowdUserId(crowdId);
    await api.crowds.leave(crowdId, { userId: crowdUserId });
    
    // Delete crowd-specific ID after successful leave
    await deleteCrowdUserId(crowdId);
  } catch (error) {
    console.error('Failed to leave crowd:', error);
    throw error;
  }
};

