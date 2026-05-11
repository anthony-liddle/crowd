import { api } from '@repo/api';
import { v4 as uuidv4 } from 'uuid';
import 'react-native-get-random-values';
import {
  Message,
  CreateMessagePayload,
  Location,
  Crowd,
  CreateCrowdPayload,
} from '@/types';
import {
  getOrGenerateGlobalUserId,
  updateRotationClock,
  getOrGenerateCrowdUserId,
  getAllCrowdUserIds,
  storeCrowdUserId,
  deleteCrowdUserId,
} from '@/utils/identity';
import { addMyMessage, addBoostedMessage } from '@/utils/storage';

// API base URL is build-time baked from EXPO_PUBLIC_API_URL. Missing or
// protocol-less values throw at module load rather than silently falling back
// to localhost (which is the phone itself, and produces a flood of opaque
// "Network request failed" errors).
const baseUrl = process.env.EXPO_PUBLIC_API_URL;
if (!baseUrl || !baseUrl.startsWith('http')) {
  throw new Error(
    'EXPO_PUBLIC_API_URL is not set or is missing a protocol. Set it in apps/mobile/.env ' +
      '(e.g. https://crowd-dev.fly.dev for the dev backend, or http://<your-mac-LAN-IP>:8080 ' +
      'for a local server) and rebuild — EXPO_PUBLIC_* values are baked in at build time.',
  );
}

api.setBaseUrl(baseUrl);
console.log('API Base URL set to:', baseUrl);

// TODO: Get actual user location. Hardcoded to Aloha, OR (matches the seed
// script's CENTER in apps/server/src/scripts/seed.ts) so the simulator's
// default feed surfaces seeded messages.
const DEFAULT_LOCATION = {
  latitude: 45.46948,
  longitude: -122.863,
};

interface LocationParams extends Location {
  sortBy?: 'nearest' | 'soonest';
}

interface FeedParams extends LocationParams {
  crowdId?: string;
}

/**
 * Get all messages from the API (global or crowd-specific).
 *
 * Within a crowd, the message poster is identified by their crowd-specific
 * ID; on the global feed, by their global ID. This split is what makes
 * cross-crowd message authorship unlinkable.
 */
export const getMessages = async (params?: FeedParams): Promise<Message[]> => {
  try {
    const latitude = params?.latitude ?? DEFAULT_LOCATION.latitude;
    const longitude = params?.longitude ?? DEFAULT_LOCATION.longitude;
    const userId = params?.crowdId
      ? await getOrGenerateCrowdUserId(params.crowdId)
      : await getOrGenerateGlobalUserId();

    const dtos = await api.messages.feed({
      latitude,
      longitude,
      userId,
      sortBy: params?.sortBy ?? 'nearest',
      crowdId: params?.crowdId,
      limit: 50,
      offset: 0,
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
    console.error('Failed to fetch messages:', error);
    throw error;
  }
};

interface CreateMessageParams extends LocationParams {
  crowdId?: string;
}

/**
 * Create a new message (global or to a specific crowd).
 */
export const createMessage = async (payload: CreateMessagePayload, params?: CreateMessageParams): Promise<Message> => {
  try {
    const latitude = params?.latitude ?? DEFAULT_LOCATION.latitude;
    const longitude = params?.longitude ?? DEFAULT_LOCATION.longitude;
    const userId = params?.crowdId
      ? await getOrGenerateCrowdUserId(params.crowdId)
      : await getOrGenerateGlobalUserId();

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

    // Update rotation clock to the expiration of this new message — only
    // for global messages. Posts within a crowd don't extend the global
    // identity's lifetime; that identity only tracks global-feed activity.
    if (!params?.crowdId) {
      const expiresAt = new Date(Date.now() + payload.duration * 60000);
      await updateRotationClock(expiresAt);
    }

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
    console.error('Failed to create message:', error);
    throw error;
  }
};

export const boostMessage = async (messageId: string, expiresAt: string, params?: LocationParams & { crowdId?: string }) => {
  try {
    const latitude = params?.latitude ?? DEFAULT_LOCATION.latitude;
    const longitude = params?.longitude ?? DEFAULT_LOCATION.longitude;
    const userId = params?.crowdId
      ? await getOrGenerateCrowdUserId(params.crowdId)
      : await getOrGenerateGlobalUserId();

    await api.messages.boost(messageId, {
      userId,
      latitude,
      longitude,
    });

    await addBoostedMessage(messageId, expiresAt);

    if (!params?.crowdId) {
      await updateRotationClock(new Date(expiresAt));
    }
  } catch (error) {
    console.error('Failed to boost message:', error);
    throw error;
  }
};

// ==================== CROWDS API ====================
//
// Every Crowds operation is keyed by a crowd-specific user ID. The global
// identity from `getOrGenerateGlobalUserId` is never sent to any Crowds
// endpoint — see Round 4 in PR #68 and the comment on `CreateCrowdSchema`
// for the full design rationale.

/**
 * Create a new crowd (24 hour expiration).
 *
 * The crowd-specific ID is minted client-side so the server can use it for
 * both `owner_id` on the crowd row and `user_id` on the auto-inserted
 * membership row in a single transaction. The ID is persisted locally
 * only after the create response succeeds.
 */
export const createCrowd = async (payload: CreateCrowdPayload): Promise<Crowd> => {
  try {
    const crowdUserId = uuidv4();
    const response = await api.crowds.create({
      name: payload.name,
      isOpen: payload.isOpen,
      crowdUserId,
    });

    await storeCrowdUserId(response.id, crowdUserId);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    return {
      id: response.id,
      name: payload.name,
      isOpen: payload.isOpen,
      isOwner: true,
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
 * Get the user's active crowds and reconcile the local crowd-ID map.
 *
 * Sends every stored crowd-specific ID in one POST. After a successful
 * response, purges any local entry whose crowd is no longer returned —
 * those crowds have either expired server-side or been deleted by the
 * cleanup job. Network failures do not purge anything (the device retries
 * on the next refresh). An empty local map skips the request entirely.
 */
export const getMyCrowds = async (): Promise<Crowd[]> => {
  try {
    const map = await getAllCrowdUserIds();
    const crowdIds = Object.keys(map);
    if (crowdIds.length === 0) return [];

    const dtos = await api.crowds.lookup({ crowdUserIds: Object.values(map) });

    const liveCrowdIds = new Set(dtos.map((dto) => dto.id));
    for (const crowdId of crowdIds) {
      if (!liveCrowdIds.has(crowdId)) {
        await deleteCrowdUserId(crowdId);
      }
    }

    return dtos.map((dto) => ({
      id: dto.id,
      name: dto.name,
      isOpen: dto.isOpen,
      isOwner: dto.isOwner,
      memberCount: dto.memberCount,
      createdAt: new Date(dto.createdAt),
      expiresAt: new Date(dto.expiresAt),
      canInvite: dto.canInvite,
    }));
  } catch (error) {
    console.error('Failed to fetch crowds:', error);
    throw error;
  }
};

/**
 * Join an open crowd by ID. Mints a crowd-specific ID for the crowd if
 * none exists locally, sends it to the server, and persists it.
 */
export const joinCrowd = async (crowdId: string): Promise<void> => {
  try {
    const crowdUserId = await getOrGenerateCrowdUserId(crowdId);
    await api.crowds.join(crowdId, { crowdUserId });
  } catch (error) {
    console.error('Failed to join crowd:', error);
    throw error;
  }
};

/**
 * Generate a single-use proximity token for a crowd. Owner-only on the
 * server. Authorization is by the owner's crowd-specific ID, which was
 * stored locally at create time.
 */
export const createProximityToken = async (
  crowdId: string,
): Promise<{ token: string; expiresAt: Date }> => {
  const crowdUserId = await getOrGenerateCrowdUserId(crowdId);
  const response = await api.crowds.proximityToken(crowdId, { crowdUserId });
  return { token: response.token, expiresAt: new Date(response.expiresAt) };
};

interface JoinedCrowdSummary {
  id: string;
  name: string;
  isOpen: boolean;
  memberCount: number;
  expiresAt: Date;
}

/**
 * Look up a proximity token without consuming it. Read-only; safe to
 * repeat. Used by the QR-scan pre-join confirmation.
 */
export const lookupCrowdToken = async (token: string): Promise<JoinedCrowdSummary> => {
  const response = await api.crowds.lookupToken({ token });
  return {
    id: response.crowd.id,
    name: response.crowd.name,
    isOpen: response.crowd.isOpen,
    memberCount: response.crowd.memberCount,
    expiresAt: new Date(response.crowd.expiresAt),
  };
};

/**
 * Join a crowd by consuming a proximity token. Mints (or fetches) a
 * crowd-specific ID for the target crowd and registers it as the
 * membership identity.
 */
export const joinCrowdWithToken = async (
  token: string,
  crowdId: string,
): Promise<JoinedCrowdSummary> => {
  const crowdUserId = await getOrGenerateCrowdUserId(crowdId);
  const response = await api.crowds.joinWithToken({ token, crowdUserId });
  return {
    id: response.crowd.id,
    name: response.crowd.name,
    isOpen: response.crowd.isOpen,
    memberCount: response.crowd.memberCount,
    expiresAt: new Date(response.crowd.expiresAt),
  };
};

/**
 * Leave a crowd. Removes the membership row server-side, then purges the
 * crowd-specific ID locally. A future re-join produces a fresh identity —
 * continuity-across-rejoin is not a property the design preserves.
 */
export const leaveCrowd = async (crowdId: string): Promise<void> => {
  try {
    const crowdUserId = await getOrGenerateCrowdUserId(crowdId);
    await api.crowds.leave(crowdId, { crowdUserId });
    await deleteCrowdUserId(crowdId);
  } catch (error) {
    console.error('Failed to leave crowd:', error);
    throw error;
  }
};
