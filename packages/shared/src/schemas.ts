import { z } from 'zod';

export const PostMessageSchema = z.object({
  text: z.string().min(1).max(500), // text limited on the frontend
  latitude: z.number(),
  longitude: z.number(),
  radiusMeters: z.number().int().positive(),
  activeMinutes: z.number().int().positive(),
  userId: z.string().uuid(),
  crowdId: z.string().uuid().optional(), // Optional - NULL = global feed
});

export const QueryFeedSchema = z.object({
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  userId: z.string().uuid().optional(),
  sortBy: z.enum(['nearest', 'soonest']).optional().default('nearest'),
  crowdId: z.string().uuid().optional(), // Optional crowd filter
});

export const MessageSchema = z.object({
  id: z.string().uuid(),
  text: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  radiusMeters: z.number().int(),
  activeMinutes: z.number().int(),
  createdAt: z.date(),
  expiresAt: z.date(),
  distance: z.number().optional(), // distance from query point in meters
  ownerId: z.string().uuid().optional(),
  boostCount: z.number().int().default(0),
  isBoosted: z.boolean().optional(),
  isOwner: z.boolean().optional(),
  crowdId: z.string().uuid().optional(),
});

export const BoostMessageSchema = z.object({
  userId: z.string().uuid(),
  latitude: z.number(),
  longitude: z.number(),
});

// Crowds API Schemas
export const CreateCrowdSchema = z.object({
  name: z.string().min(1).max(50),
  isOpen: z.boolean().default(true),
  userId: z.string().uuid(),
});

export const JoinCrowdSchema = z.object({
  userId: z.string().uuid(),
});

export const LeaveCrowdSchema = z.object({
  userId: z.string().uuid(),
});

export const CrowdSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  isOpen: z.boolean(),
  isOwner: z.boolean(),
  memberCount: z.number().int(),
  createdAt: z.date(),
  expiresAt: z.date(),
  canInvite: z.boolean(), // true if open or if user is owner
});

export const QueryCrowdsSchema = z.object({
  userId: z.string().uuid(),
});

// Types
export type PostMessageDto = z.infer<typeof PostMessageSchema>;
export type QueryFeedDto = z.infer<typeof QueryFeedSchema>;
export type MessageDto = z.infer<typeof MessageSchema>;
export type BoostMessageDto = z.infer<typeof BoostMessageSchema>;
export type CreateCrowdDto = z.infer<typeof CreateCrowdSchema>;
export type JoinCrowdDto = z.infer<typeof JoinCrowdSchema>;
export type LeaveCrowdDto = z.infer<typeof LeaveCrowdSchema>;
export type CrowdDto = z.infer<typeof CrowdSchema>;
export type QueryCrowdsDto = z.infer<typeof QueryCrowdsSchema>;
