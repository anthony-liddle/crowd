import { FastifyInstance } from 'fastify';
import { PostMessageSchema, QueryFeedSchema } from '@repo/shared';
import { db } from '../db';
import { messages } from '../db/schema';
import { sql, desc, gt, and } from 'drizzle-orm';

export async function messageRoutes(server: FastifyInstance) {
  server.post('/messages', async (request, _reply) => {
    const body = PostMessageSchema.parse(request.body);

    const created = new Date();
    const expires = new Date(created.getTime() + body.activeMinutes * 60000);

    // TODO: Postgres + PostGIS will be used in production.
    // Ensure DB connections are lazy-initialized in Firebase to avoid overhead.
    const [newMessage] = await db.insert(messages).values({
      text: body.text,
      latitude: body.latitude.toString(),
      longitude: body.longitude.toString(),
      radiusMeters: body.radiusMeters,
      activeMinutes: body.activeMinutes,
      createdAt: created,
      expiresAt: expires,
      // Construct PostGIS point: POINT(longitude latitude)
      location: sql`ST_SetSRID(ST_MakePoint(${body.longitude}, ${body.latitude}), 4326)`,
    }).returning({ id: messages.id });

    return { id: newMessage.id };
  });

  server.get('/messages', async (request, _reply) => {
    const query = request.query as unknown;
    const parsed = QueryFeedSchema.parse(query);

    // PostGIS query to find messages where:
    // 1. Message is not expired
    // 2. User is within the message's defined radius
    // TODO: Geo queries with PostGIS are efficient.
    // Avoid heavy geo math in-memory in Firebase Functions.

    const userLocation = sql`ST_SetSRID(ST_MakePoint(${parsed.longitude}, ${parsed.latitude}), 4326)`;

    const nearbyMessages = await db.select({
      id: messages.id,
      text: messages.text,
      latitude: messages.latitude,
      longitude: messages.longitude,
      radiusMeters: messages.radiusMeters,
      activeMinutes: messages.activeMinutes,
      createdAt: messages.createdAt,
      expiresAt: messages.expiresAt,
      // precise distance calculation
      distance: sql<number>`ST_DistanceSphere(${messages.location}, ${userLocation})`.mapWith(Number)
    })
      .from(messages)
      .where(and(
        gt(messages.expiresAt, new Date()), // Not expired
        sql`ST_DWithin(${messages.location}::geography, ${userLocation}::geography, ${messages.radiusMeters})` // Within radius
      ))
      .orderBy(desc(messages.createdAt)); // Newest first

    // Map to DTO
    return nearbyMessages.map(msg => ({
      ...msg,
      latitude: parseFloat(msg.latitude),
      longitude: parseFloat(msg.longitude),
      distance: msg.distance
    }));
  });
}
