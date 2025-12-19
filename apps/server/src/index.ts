import fastify from 'fastify';
import cors from '@fastify/cors';
import { PostMessageSchema, QueryFeedSchema } from '@repo/shared';
import { db } from './db/index';
import { messages } from './db/schema';
import { sql, desc, gt, and } from 'drizzle-orm';

const server = fastify({ logger: true });

// CORS configuration from environment variable
const corsOrigin = process.env.CORS_ORIGIN || '*';
server.register(cors, {
  origin: corsOrigin,
});

server.get('/health', async () => {
  return { status: 'ok' };
});

server.post('/messages', async (request, _reply) => {
  const body = PostMessageSchema.parse(request.body);

  const created = new Date();
  const expires = new Date(created.getTime() + body.activeMinutes * 60000);

  const [newMessage] = await db.insert(messages).values({
    text: body.text,
    latitude: body.latitude.toString(),
    longitude: body.longitude.toString(),
    radiusMeters: body.radiusMeters,
    activeMinutes: body.activeMinutes,
    createdAt: created,
    expiresAt: expires,
  }).returning({ id: messages.id });

  return { id: newMessage.id };
});

server.get('/messages/feed', async (request, _reply) => {
  const query = request.query as unknown;
  const parsed = QueryFeedSchema.parse(query);

  // Haversine formula to find messages where:
  // 1. Message is not expired
  // 2. User is within the message's defined radius
  // Haversine formula calculates great-circle distance between two points
  // R = 6371000 meters (Earth's radius)
  // distance = 2 * R * asin(sqrt(sin²(Δlat/2) + cos(lat1) * cos(lat2) * sin²(Δlon/2)))

  const userLat = parsed.latitude;
  const userLng = parsed.longitude;

  // Calculate distance using Haversine formula (result in meters)
  const haversineDistance = sql<number>`
    6371000 * 2 * asin(
      sqrt(
        power(sin(radians((${messages.latitude}::numeric - ${userLat}) / 2)), 2) +
        cos(radians(${userLat})) * cos(radians(${messages.latitude}::numeric)) *
        power(sin(radians((${messages.longitude}::numeric - ${userLng}) / 2)), 2)
      )
    )
  `.mapWith(Number);

  const nearbyMessages = await db.select({
    id: messages.id,
    text: messages.text,
    latitude: messages.latitude,
    longitude: messages.longitude,
    radiusMeters: messages.radiusMeters,
    activeMinutes: messages.activeMinutes,
    createdAt: messages.createdAt,
    expiresAt: messages.expiresAt,
    distance: haversineDistance,
  })
    .from(messages)
    .where(and(
      gt(messages.expiresAt, new Date()), // Not expired
      // Filter by distance using Haversine formula
      sql`6371000 * 2 * asin(
        sqrt(
          power(sin(radians((${messages.latitude}::numeric - ${userLat}) / 2)), 2) +
          cos(radians(${userLat})) * cos(radians(${messages.latitude}::numeric)) *
          power(sin(radians((${messages.longitude}::numeric - ${userLng}) / 2)), 2)
        )
      ) <= ${messages.radiusMeters}`
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

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '8080', 10);
    const host = process.env.HOST || '0.0.0.0';

    await server.listen({ port, host });
    console.log(`Server started at http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
