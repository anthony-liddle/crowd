import { v4 as uuidv4 } from 'uuid';
import type { PostMessageDto, CreateCrowdDto, BoostMessageDto } from '@repo/shared';

// Test locations
export const portlandLocation = { latitude: 45.5152, longitude: -122.6784 };
export const seattleLocation = { latitude: 47.6062, longitude: -122.3321 };
export const newYorkLocation = { latitude: 40.7128, longitude: -74.0060 };

// Distance between Portland and Seattle is approximately 233 km

/**
 * Generate a valid message payload with random userId
 */
export function validMessage(overrides: Partial<PostMessageDto> = {}): PostMessageDto {
  return {
    text: 'Test message',
    latitude: portlandLocation.latitude,
    longitude: portlandLocation.longitude,
    radiusMeters: 1000,
    activeMinutes: 60,
    userId: uuidv4(),
    ...overrides,
  };
}

/**
 * Generate a valid crowd payload with random userId
 */
export function validCrowd(overrides: Partial<CreateCrowdDto> = {}): CreateCrowdDto {
  return {
    name: 'Test Crowd',
    userId: uuidv4(),
    isOpen: true,
    ...overrides,
  };
}

/**
 * Generate a valid boost payload with random userId
 */
export function validBoost(overrides: Partial<BoostMessageDto> = {}): BoostMessageDto {
  return {
    userId: uuidv4(),
    latitude: portlandLocation.latitude,
    longitude: portlandLocation.longitude,
    ...overrides,
  };
}

/**
 * Generate a random UUID
 */
export function randomUuid(): string {
  return uuidv4();
}

/**
 * Create a future date (for non-expired entities)
 */
export function futureDate(hoursFromNow = 1): Date {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
}

/**
 * Create a past date (for expired entities)
 */
export function pastDate(hoursAgo = 1): Date {
  return new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
}
