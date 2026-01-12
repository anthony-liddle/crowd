import fastify from 'fastify';
import cors from '@fastify/cors';
import { PostMessageSchema, QueryFeedSchema, BoostMessageSchema } from '@repo/shared';
import { db } from './db/index';
import { messages, messageBoosts } from './db/schema';
import { sql, asc, gt, and, eq } from 'drizzle-orm';

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
    ownerId: body.userId,
    boostCount: 0,
  }).returning({ id: messages.id });

  return { id: newMessage.id };
});

const getIds = (req: any) => {
  const { id } = req.params as { id: string };
  return id;
};

server.post('/messages/:id/boost', async (request, reply) => {
  const id = getIds(request);
  const body = BoostMessageSchema.parse(request.body);

  // 1. Fetch message to check ownership and existence
  const [message] = await db.select().from(messages).where(eq(messages.id, id));
  if (!message) {
    return reply.status(404).send({ error: 'Message not found' });
  }

  // 2. Check rules
  if (message.expiresAt < new Date()) {
    return reply.status(400).send({ error: 'Message expired' });
  }
  if (message.ownerId === body.userId) {
    return reply.status(400).send({ error: 'Cannot boost your own message' });
  }

  // 3. Check if already boosted
  const [existingBoost] = await db.select()
    .from(messageBoosts)
    .where(and(
      eq(messageBoosts.messageId, id),
      eq(messageBoosts.userId, body.userId)
    ));

  if (existingBoost) {
    return reply.status(400).send({ error: 'Already boosted' });
  }

  // 4. Boost
  await db.transaction(async (tx) => {
    await tx.insert(messageBoosts).values({
      messageId: id,
      userId: body.userId,
      latitude: body.latitude.toString(),
      longitude: body.longitude.toString(),
    });

    await tx.update(messages)
      .set({ boostCount: sql`${messages.boostCount} + 1` })
      .where(eq(messages.id, id));
  });

  return { status: 'ok' };
});

server.get('/messages/feed', async (request, _reply) => {
  const query = request.query as unknown;
  const parsed = QueryFeedSchema.parse(query);

  const userLat = parsed.latitude;
  const userLng = parsed.longitude;
  const userId = parsed.userId;

  // Haversine snippet generator
  const haversine = (latCol: any, lngCol: any) => sql`
    6371000 * 2 * asin(
      sqrt(
        power(sin(radians((${latCol}::numeric - ${userLat}) / 2)), 2) +
        cos(radians(${userLat})) * cos(radians(${latCol}::numeric)) *
        power(sin(radians((${lngCol}::numeric - ${userLng}) / 2)), 2)
      )
    )
  `;

  // Distance to original message location
  const distanceToOrigin = haversine(messages.latitude, messages.longitude);

  // Distance to closest boost (Min dist of all boosts for this message)
  // We use a subquery to find the minimum distance from user to any boost of this message
  // Note: Drizzle SQL templating
  const distanceToClosestBoost = sql`
    (SELECT MIN(${haversine(messageBoosts.latitude, messageBoosts.longitude)})
     FROM ${messageBoosts}
     WHERE ${messageBoosts.messageId} = ${messages.id})
  `;

  // Effective distance: LEAST(origin, COALESCE(closest_boost, Infinity))
  const effectiveDistance = sql<number>`LEAST(${distanceToOrigin}, COALESCE(${distanceToClosestBoost}, 'Infinity'::float))`.mapWith(Number);

  // isBoosted check
  const isBoostedSql = userId ? sql<boolean>`EXISTS (
    SELECT 1 FROM ${messageBoosts}
    WHERE ${messageBoosts.messageId} = ${messages.id}
    AND ${messageBoosts.userId} = ${userId}
  )` : sql<boolean>`false`;

  // Query
  // We need to filter where effectiveDistance <= radiusMeters
  // And expiresAt > Now

  const whereClause = and(
    gt(messages.expiresAt, new Date()),
    sql`${effectiveDistance} <= ${messages.radiusMeters}`
  );

  const baseQuery = db.select({
    id: messages.id,
    text: messages.text,
    latitude: messages.latitude,
    longitude: messages.longitude,
    radiusMeters: messages.radiusMeters,
    activeMinutes: messages.activeMinutes,
    createdAt: messages.createdAt,
    expiresAt: messages.expiresAt,
    ownerId: messages.ownerId,
    boostCount: messages.boostCount,
    distance: effectiveDistance,
    isBoosted: isBoostedSql,
    isOwner: userId ? sql<boolean>`${messages.ownerId} = ${userId}` : sql<boolean>`false`,
  })
    .from(messages)
    .where(whereClause);

  let nearbyMessages;
  if (parsed.sortBy === 'soonest') {
    nearbyMessages = await baseQuery.orderBy(asc(messages.expiresAt));
  } else {
    // defaults to nearest
    nearbyMessages = await baseQuery.orderBy(asc(effectiveDistance));
  }

  // Map to DTO
  return nearbyMessages.map(msg => ({
    ...msg,
    latitude: parseFloat(msg.latitude),
    longitude: parseFloat(msg.longitude),
    distance: msg.distance,
    ownerId: msg.ownerId || undefined, // handle null
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
