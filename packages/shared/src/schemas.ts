import { z } from 'zod';

export const PostMessageSchema = z.object({
  text: z.string().min(1).max(500), // text limited on the frontend
  latitude: z.number(),
  longitude: z.number(),
  radiusMeters: z.number().int().positive(),
  activeMinutes: z.number().int().positive(),
});

export const QueryFeedSchema = z.object({
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
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
});

export type PostMessageDto = z.infer<typeof PostMessageSchema>;
export type QueryFeedDto = z.infer<typeof QueryFeedSchema>;
export type MessageDto = z.infer<typeof MessageSchema>;
