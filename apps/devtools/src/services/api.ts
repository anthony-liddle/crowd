import { api } from '@repo/api';
import { getOrGenerateUserId } from '../utils/identity';

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
}

interface LocationParams {
  latitude: number;
  longitude: number;
  sortBy?: 'nearest' | 'soonest';
}

export const getMessages = async (params: LocationParams): Promise<Message[]> => {
  const userId = getOrGenerateUserId();

  const dtos = await api.messages.feed({
    latitude: params.latitude,
    longitude: params.longitude,
    userId,
    sortBy: params.sortBy ?? 'nearest',
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
  const userId = getOrGenerateUserId();

  const response = await api.messages.post({
    text: payload.text,
    activeMinutes: payload.duration,
    radiusMeters: Math.round(payload.distance),
    latitude: params.latitude,
    longitude: params.longitude,
    userId,
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
  const userId = getOrGenerateUserId();

  await api.messages.boost(messageId, {
    userId,
    latitude: params.latitude,
    longitude: params.longitude,
  });
};
