import { z } from 'zod';

export const PostMessageSchema = z.object({
  text: z.string().min(1).max(500), // text limited on the frontend
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusMeters: z.number().int().positive().max(100000), // Max 100km
  activeMinutes: z.number().int().positive().max(10080), // Max 7 days
  userId: z.string().uuid(),
  crowdId: z.string().uuid().optional(), // Optional - NULL = global feed
});

export const QueryFeedSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  userId: z.string().uuid().optional(),
  sortBy: z.enum(['nearest', 'soonest']).optional().default('nearest'),
  crowdId: z.string().uuid().optional(), // Optional crowd filter
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
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
  isBoosted: z.boolean().default(false),
  isOwner: z.boolean().default(false),
  crowdId: z.string().uuid().optional(),
});

export const BoostMessageSchema = z.object({
  userId: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
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

// Schema for rotating membership from one user ID to another
export const RotateMembershipSchema = z.object({
  crowdId: z.string().uuid(),
  oldUserId: z.string().uuid(),
  newUserId: z.string().uuid(),
});

// Response Schemas (for API client validation)
// These handle JSON date strings being coerced to Date objects
export const MessageResponseSchema = z.object({
  id: z.string().uuid(),
  text: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  radiusMeters: z.number().int(),
  activeMinutes: z.number().int(),
  createdAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
  distance: z.number().optional(),
  ownerId: z.string().uuid().optional(),
  boostCount: z.number().int().default(0),
  isBoosted: z.boolean().default(false),
  isOwner: z.boolean().default(false),
  crowdId: z.string().uuid().nullable().optional(),
});

export const CrowdResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  isOpen: z.boolean(),
  isOwner: z.boolean(),
  memberCount: z.number().int(),
  createdAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
  canInvite: z.boolean(),
});

export const IdResponseSchema = z.object({
  id: z.string().uuid(),
});

export const StatusResponseSchema = z.object({
  status: z.string(),
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
export type RotateMembershipDto = z.infer<typeof RotateMembershipSchema>;
export type MessageResponse = z.infer<typeof MessageResponseSchema>;
export type CrowdResponse = z.infer<typeof CrowdResponseSchema>;
export type IdResponse = z.infer<typeof IdResponseSchema>;
export type StatusResponse = z.infer<typeof StatusResponseSchema>;
