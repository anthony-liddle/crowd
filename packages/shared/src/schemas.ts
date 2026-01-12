import { z } from 'zod';

export const PostMessageSchema = z.object({
  text: z.string().min(1).max(500), // text limited on the frontend
  latitude: z.number(),
  longitude: z.number(),
  radiusMeters: z.number().int().positive(),
  activeMinutes: z.number().int().positive(),
  userId: z.string().uuid(),
});

export const QueryFeedSchema = z.object({
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  userId: z.string().uuid().optional(),
  sortBy: z.enum(['nearest', 'soonest']).optional().default('nearest'),
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
});

export const BoostMessageSchema = z.object({
  userId: z.string().uuid(),
  latitude: z.number(),
  longitude: z.number(),
});

export type PostMessageDto = z.infer<typeof PostMessageSchema>;
export type QueryFeedDto = z.infer<typeof QueryFeedSchema>;
export type MessageDto = z.infer<typeof MessageSchema>;
export type BoostMessageDto = z.infer<typeof BoostMessageSchema>;
