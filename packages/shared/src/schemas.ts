import { z } from 'zod';

export const PostMessageSchema = z.object({
  text: z.string().min(1).max(500), // text limited on the frontend
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusMeters: z.number().int().positive().max(5000), // Max 5km — matches the compose slider's REACH_MAX
  activeMinutes: z.number().int().min(5).max(720), // Slider range: 5 minutes to 12 hours
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
//
// Every Crowds endpoint takes a crowd-specific user ID (`crowdUserId`).
// The device's global feed identity (rotated via `getOrGenerateGlobalUserId`)
// is never sent to any Crowds endpoint, by design — see Round 4 in
// docs/feats and PR #68. Crowd-specific IDs are stable for the lifetime of
// the user's membership in a single crowd; they survive global ID rotation.
export const CreateCrowdSchema = z.object({
  name: z.string().min(1).max(50),
  isOpen: z.boolean().default(true),
  crowdUserId: z.string().uuid(),
});

export const JoinCrowdSchema = z.object({
  crowdUserId: z.string().uuid(),
});

export const LeaveCrowdSchema = z.object({
  crowdUserId: z.string().uuid(),
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

// Lookup request: client sends every crowd-specific ID it has stored.
// Server returns crowds the device is a member of OR owns (matching either
// crowdMemberships.user_id or crowds.owner_id against the supplied list).
export const LookupCrowdsRequestSchema = z.object({
  crowdUserIds: z.array(z.string().uuid()).min(1),
});

// Proximity-token schemas. Owner generates a short-lived single-use token
// that is encoded into a QR/NFC payload; any user can present that token
// to /crowds/join-with-token to join the crowd, including private ones.
export const CreateProximityTokenSchema = z.object({
  crowdUserId: z.string().uuid(),
});

export const JoinWithTokenSchema = z.object({
  token: z.string().min(16).max(128),
  crowdUserId: z.string().uuid(),
});

export const LookupTokenSchema = z.object({
  token: z.string().min(16).max(128),
});

export const LookupTokenResponseSchema = z.object({
  crowd: z.object({
    id: z.string().uuid(),
    name: z.string(),
    isOpen: z.boolean(),
    memberCount: z.number().int(),
    expiresAt: z.coerce.date(),
  }),
});

export const ProximityTokenResponseSchema = z.object({
  token: z.string(),
  expiresAt: z.coerce.date(),
});

export const JoinWithTokenResponseSchema = z.object({
  status: z.string(),
  crowd: z.object({
    id: z.string().uuid(),
    name: z.string(),
    isOpen: z.boolean(),
    memberCount: z.number().int(),
    expiresAt: z.coerce.date(),
  }),
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
export type LookupCrowdsRequestDto = z.infer<typeof LookupCrowdsRequestSchema>;
export type MessageResponse = z.infer<typeof MessageResponseSchema>;
export type CrowdResponse = z.infer<typeof CrowdResponseSchema>;
export type IdResponse = z.infer<typeof IdResponseSchema>;
export type StatusResponse = z.infer<typeof StatusResponseSchema>;
export type CreateProximityTokenDto = z.infer<typeof CreateProximityTokenSchema>;
export type JoinWithTokenDto = z.infer<typeof JoinWithTokenSchema>;
export type LookupTokenDto = z.infer<typeof LookupTokenSchema>;
export type ProximityTokenResponse = z.infer<typeof ProximityTokenResponseSchema>;
export type JoinWithTokenResponse = z.infer<typeof JoinWithTokenResponseSchema>;
export type LookupTokenResponse = z.infer<typeof LookupTokenResponseSchema>;
