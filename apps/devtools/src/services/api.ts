import { api } from '@repo/api';
import { 
  getOrGenerateUserId, 
  getOrGenerateCrowdUserId, 
  deleteCrowdUserId, 
  getAllCrowdUserIds 
} from '../utils/identity';

// Set base URL for local development
const BASE_URL = 'http://localhost:8080';
api.setBaseUrl(BASE_URL);

export { api };

export interface Message {
  id: string;
  text: string;
  timestamp: Date;
  activeDistance: number;
  timeLeft: number;
  duration: number;
  boostCount: number;
  isOwner: boolean;
  isBoosted: boolean;
  expiresAt: string;
}

export interface CreateMessagePayload {
  text: string;
  duration: number; // minutes
  distance: number; // meters
  crowdId?: string | null;
}

interface LocationParams {
  latitude: number;
  longitude: number;
  sortBy?: 'nearest' | 'soonest';
  crowdId?: string | null;
}

export const getMessages = async (params: LocationParams): Promise<Message[]> => {
  // Use crowd-specific ID if crowdId is provided, otherwise use main user ID
  const userId = params.crowdId 
    ? getOrGenerateCrowdUserId(params.crowdId)
    : getOrGenerateUserId();

  const dtos = await api.messages.feed({
    latitude: params.latitude,
    longitude: params.longitude,
    userId,
    sortBy: params.sortBy ?? 'nearest',
    crowdId: params.crowdId ?? undefined,
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
      isOwner: dto.isOwner ?? false,
      isBoosted: dto.isBoosted ?? false,
      expiresAt: new Date(dto.expiresAt).toISOString(),
    };
  });
};

export const createMessage = async (payload: CreateMessagePayload, params: LocationParams): Promise<Message> => {
  // Use crowd-specific ID if crowdId is provided, otherwise use main user ID
  const userId = payload.crowdId 
    ? getOrGenerateCrowdUserId(payload.crowdId)
    : getOrGenerateUserId();

  const response = await api.messages.post({
    text: payload.text,
    activeMinutes: payload.duration,
    radiusMeters: Math.round(payload.distance),
    latitude: params.latitude,
    longitude: params.longitude,
    userId,
    crowdId: payload.crowdId ?? undefined,
  });

  // Return optimistic message
  return {
    id: response.id,
    text: payload.text,
    timestamp: new Date(),
    activeDistance: payload.distance / 1000,
    timeLeft: payload.duration,
    duration: payload.duration,
    boostCount: 0,
    isOwner: true,
    isBoosted: false,
    expiresAt: new Date(Date.now() + payload.duration * 60000).toISOString(),
  };
};

export const boostMessage = async (messageId: string, params: LocationParams) => {
  // Use crowd-specific ID if crowdId is provided, otherwise use main user ID
  const userId = params.crowdId 
    ? getOrGenerateCrowdUserId(params.crowdId)
    : getOrGenerateUserId();

  await api.messages.boost(messageId, {
    userId,
    latitude: params.latitude,
    longitude: params.longitude,
  });
};


export interface Crowd {
  id: string;
  name: string;
  isOpen: boolean;
  isOwner: boolean;
  memberCount: number;
  createdAt: Date;
  expiresAt: Date;
  canInvite: boolean;
}

export const createCrowd = async (name: string, isOpen: boolean): Promise<Crowd> => {
  // Create crowd with main user ID (this sets ownerId and creates initial membership)
  const mainUserId = getOrGenerateUserId();
  const response = await api.crowds.create({
    name,
    isOpen,
    userId: mainUserId,
  });

  // Generate and store crowd-specific ID for this crowd
  const crowdUserId = getOrGenerateCrowdUserId(response.id);
  
  // Update membership to use crowd-specific ID instead of main ID
  try {
    await api.crowds.leave(response.id, { userId: mainUserId });
    await api.crowds.join(response.id, { userId: crowdUserId });
  } catch (err) {
    // If update fails, still store the crowd ID locally for future operations
    console.warn('Failed to update membership with crowd-specific ID:', err);
  }

  // Optimistic return
  return {
    id: response.id,
    name,
    isOpen,
    isOwner: true,
    memberCount: 1,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    canInvite: true,
  };
};

export const getCrowds = async (): Promise<Crowd[]> => {
  // Query with main user ID and all crowd-specific IDs to find all crowds user belongs to
  const mainUserId = getOrGenerateUserId();
  const crowdUserIds = getAllCrowdUserIds();
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
};

export const joinCrowd = async (crowdId: string) => {
  // Generate crowd-specific ID first
  const crowdUserId = getOrGenerateCrowdUserId(crowdId);
  
  // Join with crowd-specific ID
  await api.crowds.join(crowdId, { userId: crowdUserId });
};

export const leaveCrowd = async (crowdId: string) => {
  // Get crowd-specific ID for leaving
  const crowdUserId = getOrGenerateCrowdUserId(crowdId);
  await api.crowds.leave(crowdId, { userId: crowdUserId });
  
  // Delete crowd-specific ID after successful leave
  deleteCrowdUserId(crowdId);
};
