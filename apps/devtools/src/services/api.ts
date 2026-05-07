import { api } from '@repo/api';
import { v4 as uuidv4 } from 'uuid';
import {
  getOrGenerateGlobalUserId,
  getOrGenerateCrowdUserId,
  storeCrowdUserId,
  deleteCrowdUserId,
  getAllCrowdUserIds,
} from '../utils/identity';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
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
  duration: number;
  distance: number;
  crowdId?: string | null;
}

interface LocationParams {
  latitude: number;
  longitude: number;
  sortBy?: 'nearest' | 'soonest';
  crowdId?: string | null;
}

export const getMessages = async (params: LocationParams): Promise<Message[]> => {
  const userId = params.crowdId
    ? getOrGenerateCrowdUserId(params.crowdId)
    : getOrGenerateGlobalUserId();

  const dtos = await api.messages.feed({
    latitude: params.latitude,
    longitude: params.longitude,
    userId,
    sortBy: params.sortBy ?? 'nearest',
    crowdId: params.crowdId ?? undefined,
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
      isOwner: dto.isOwner ?? false,
      isBoosted: dto.isBoosted ?? false,
      expiresAt: new Date(dto.expiresAt).toISOString(),
    };
  });
};

export const createMessage = async (payload: CreateMessagePayload, params: LocationParams): Promise<Message> => {
  const userId = payload.crowdId
    ? getOrGenerateCrowdUserId(payload.crowdId)
    : getOrGenerateGlobalUserId();

  const response = await api.messages.post({
    text: payload.text,
    activeMinutes: payload.duration,
    radiusMeters: Math.round(payload.distance),
    latitude: params.latitude,
    longitude: params.longitude,
    userId,
    crowdId: payload.crowdId ?? undefined,
  });

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
  const userId = params.crowdId
    ? getOrGenerateCrowdUserId(params.crowdId)
    : getOrGenerateGlobalUserId();

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
  const crowdUserId = uuidv4();
  const response = await api.crowds.create({ name, isOpen, crowdUserId });
  storeCrowdUserId(response.id, crowdUserId);

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
  const map = getAllCrowdUserIds();
  const crowdIds = Object.keys(map);
  if (crowdIds.length === 0) return [];

  const dtos = await api.crowds.lookup({ crowdUserIds: Object.values(map) });

  const liveIds = new Set(dtos.map((d) => d.id));
  for (const crowdId of crowdIds) {
    if (!liveIds.has(crowdId)) {
      deleteCrowdUserId(crowdId);
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
};

export const joinCrowd = async (crowdId: string) => {
  const crowdUserId = getOrGenerateCrowdUserId(crowdId);
  await api.crowds.join(crowdId, { crowdUserId });
};

export const leaveCrowd = async (crowdId: string) => {
  const crowdUserId = getOrGenerateCrowdUserId(crowdId);
  await api.crowds.leave(crowdId, { crowdUserId });
  deleteCrowdUserId(crowdId);
};
