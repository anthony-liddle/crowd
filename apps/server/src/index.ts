import fastify from 'fastify';
import cors from '@fastify/cors';
import {
  PostMessageSchema,
  QueryFeedSchema,
  BoostMessageSchema,
  CreateCrowdSchema,
  JoinCrowdSchema,
  LeaveCrowdSchema,
  QueryCrowdsSchema,
} from '@repo/shared';
import { db } from './db/index';
import { messages, messageBoosts, crowds, crowdMemberships } from './db/schema';
import { sql, asc, gt, and, eq, count, isNull } from 'drizzle-orm';

const server = fastify({ logger: true });

// CORS configuration from environment variable
// Default to localhost origins for development security
const corsOrigin = process.env.CORS_ORIGIN;
if (!corsOrigin) {
  console.warn('CORS_ORIGIN not set, defaulting to localhost origins only');
}
server.register(cors, {
  origin: corsOrigin || ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8081'],
  credentials: true,
});

// 24 hours in milliseconds for crowd expiration
const CROWD_DURATION_MS = 24 * 60 * 60 * 1000;

server.get('/health', async () => {
  return { status: 'ok' };
});

// ==================== CROWDS API ====================

// Create a new crowd
server.post('/crowds', async (request, reply) => {
  try {
    const body = CreateCrowdSchema.parse(request.body);

    const created = new Date();
    const expires = new Date(created.getTime() + CROWD_DURATION_MS);

    // Create the crowd
    const [newCrowd] = await db.insert(crowds).values({
      name: body.name,
      ownerId: body.userId,
      isOpen: body.isOpen,
      createdAt: created,
      expiresAt: expires,
    }).returning({ id: crowds.id });

    // Auto-add creator as member
    await db.insert(crowdMemberships).values({
      crowdId: newCrowd.id,
      userId: body.userId,
    });

    return { id: newCrowd.id };
  } catch (err: unknown) {
    request.log.error({ msg: 'Create Crowd Failed', error: err });
    const message = err instanceof Error ? err.message : 'Unknown error';
    return reply.status(500).send({
      error: 'Internal Server Error',
      message,
    });
  }
});

// Get user's active crowds
server.get('/crowds', async (request, reply) => {
  try {
    const query = QueryCrowdsSchema.parse(request.query);
    const userId = query.userId;

    // Get crowds with member counts in a single query to avoid N+1
    const userCrowdsWithCounts = await db
      .select({
        id: crowds.id,
        name: crowds.name,
        isOpen: crowds.isOpen,
        ownerId: crowds.ownerId,
        createdAt: crowds.createdAt,
        expiresAt: crowds.expiresAt,
        memberCount: count(crowdMemberships.id),
      })
      .from(crowds)
      .innerJoin(crowdMemberships, eq(crowds.id, crowdMemberships.crowdId))
      .where(and(
        gt(crowds.expiresAt, new Date()),
        // Subquery to check if user is a member
        sql`EXISTS (
          SELECT 1 FROM ${crowdMemberships} cm
          WHERE cm.crowd_id = ${crowds.id}
          AND cm.user_id = ${userId}
        )`
      ))
      .groupBy(crowds.id);

    const result = userCrowdsWithCounts.map(crowd => ({
      id: crowd.id,
      name: crowd.name,
      isOpen: crowd.isOpen,
      isOwner: crowd.ownerId === userId,
      memberCount: Number(crowd.memberCount) || 0,
      createdAt: crowd.createdAt,
      expiresAt: crowd.expiresAt,
      canInvite: crowd.isOpen || crowd.ownerId === userId,
    }));

    return result;
  } catch (err: unknown) {
    request.log.error({ msg: 'Get Crowds Failed', error: err });
    const message = err instanceof Error ? err.message : 'Unknown error';
    return reply.status(500).send({
      error: 'Internal Server Error',
      message,
    });
  }
});

// Join a crowd
server.post('/crowds/:id/join', async (request, reply) => {
  try {
    const crowdId = (request.params as { id: string }).id;
    const body = JoinCrowdSchema.parse(request.body);

    // 1. Check crowd exists and not expired
    const [crowd] = await db.select().from(crowds).where(eq(crowds.id, crowdId));
    if (!crowd) {
      return reply.status(404).send({ error: 'Crowd not found' });
    }
    if (crowd.expiresAt < new Date()) {
      return reply.status(400).send({ error: 'Crowd expired' });
    }

    // 2. Check if crowd is open (closed crowds can only be joined via owner invite, not implemented yet)
    if (!crowd.isOpen) {
      return reply.status(400).send({ error: 'Crowd is closed' });
    }

    // 3. Add membership - rely on unique constraint to handle race conditions
    try {
      await db.insert(crowdMemberships).values({
        crowdId,
        userId: body.userId,
      });
    } catch (insertErr: unknown) {
      // Check if it's a unique constraint violation
      if (insertErr instanceof Error && insertErr.message.includes('unique_crowd_membership')) {
        return reply.status(400).send({ error: 'Already a member' });
      }
      throw insertErr;
    }

    return { status: 'ok' };
  } catch (err: unknown) {
    request.log.error({ msg: 'Join Crowd Failed', error: err });
    const message = err instanceof Error ? err.message : 'Unknown error';
    return reply.status(500).send({
      error: 'Internal Server Error',
      message,
    });
  }
});

// Leave a crowd
server.post('/crowds/:id/leave', async (request, reply) => {
  try {
    const crowdId = (request.params as { id: string }).id;
    const body = LeaveCrowdSchema.parse(request.body);

    await db.delete(crowdMemberships).where(and(
      eq(crowdMemberships.crowdId, crowdId),
      eq(crowdMemberships.userId, body.userId)
    ));

    return { status: 'ok' };
  } catch (err: unknown) {
    request.log.error({ msg: 'Leave Crowd Failed', error: err });
    const message = err instanceof Error ? err.message : 'Unknown error';
    return reply.status(500).send({
      error: 'Internal Server Error',
      message,
    });
  }
});

// ==================== MESSAGES API ====================

server.post('/messages', async (request, reply) => {
  try {
    const body = PostMessageSchema.parse(request.body);

    // If crowdId is provided, verify membership
    if (body.crowdId) {
      const [crowd] = await db.select().from(crowds).where(eq(crowds.id, body.crowdId));
      if (!crowd) {
        return reply.status(404).send({ error: 'Crowd not found' });
      }
      if (crowd.expiresAt < new Date()) {
        return reply.status(400).send({ error: 'Crowd expired' });
      }

      const [membership] = await db.select().from(crowdMemberships).where(and(
        eq(crowdMemberships.crowdId, body.crowdId),
        eq(crowdMemberships.userId, body.userId)
      ));
      if (!membership) {
        return reply.status(403).send({ error: 'Not a member of this crowd' });
      }
    }

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
      crowdId: body.crowdId || null,
    }).returning({ id: messages.id });

    return { id: newMessage.id };
  } catch (err: unknown) {
    request.log.error({
      msg: 'Create Message Failed',
      error: err,
    });
    const message = err instanceof Error ? err.message : 'Unknown error';
    return reply.status(500).send({
      error: 'Internal Server Error',
      message,
    });
  }
});

const getIds = (req: any) => {
  const { id } = req.params as { id: string };
  return id;
};

server.post('/messages/:id/boost', async (request, reply) => {
  try {
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

    // 3. Boost - rely on unique constraint to handle race conditions
    try {
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
    } catch (insertErr: unknown) {
      // Check if it's a unique constraint violation
      if (insertErr instanceof Error && insertErr.message.includes('unique_user_boost')) {
        return reply.status(400).send({ error: 'Already boosted' });
      }
      throw insertErr;
    }

    return { status: 'ok' };
  } catch (err: unknown) {
    request.log.error({
      msg: 'Boost Message Failed',
      error: err,
    });
    const message = err instanceof Error ? err.message : 'Unknown error';
    return reply.status(500).send({
      error: 'Internal Server Error',
      message,
    });
  }
});

server.get('/messages/feed', async (request, reply) => {
  try {
    const query = request.query as unknown;
    const parsed = QueryFeedSchema.parse(query);

    const userLat = parsed.latitude;
    const userLng = parsed.longitude;
    const userId = parsed.userId;
    const crowdId = parsed.crowdId;

    // If crowdId is specified, verify membership
    if (crowdId && userId) {
      const [crowd] = await db.select().from(crowds).where(eq(crowds.id, crowdId));
      if (!crowd) {
        return reply.status(404).send({ error: 'Crowd not found' });
      }
      if (crowd.expiresAt < new Date()) {
        return reply.status(400).send({ error: 'Crowd expired' });
      }

      const [membership] = await db.select().from(crowdMemberships).where(and(
        eq(crowdMemberships.crowdId, crowdId),
        eq(crowdMemberships.userId, userId)
      ));
      if (!membership) {
        return reply.status(403).send({ error: 'Not a member of this crowd' });
      }
    }

    // Haversine snippet generator
    const haversine = (latCol: any, lngCol: any) => sql`
    6371000 * 2 * asin(
      sqrt(
        power(sin(radians((${latCol}::float - ${userLat}::float) / 2)), 2) +
        cos(radians(${userLat}::float)) * cos(radians(${latCol}::float)) *
        power(sin(radians((${lngCol}::float - ${userLng}::float) / 2)), 2)
      )
    )
  `;

    // Distance to original message location
    const distanceToOrigin = haversine(messages.latitude, messages.longitude);

    // Distance to closest boost (Min dist of all boosts for this message)
    const distanceToClosestBoost = sql`
    (SELECT MIN(${haversine(messageBoosts.latitude, messageBoosts.longitude)})
     FROM ${messageBoosts}
     WHERE ${messageBoosts.messageId} = ${messages.id})
  `;

    const MAX_DISTANCE = 100000000; // 100,000 km
    const effectiveDistance = sql<number>`LEAST(${distanceToOrigin}, COALESCE(${distanceToClosestBoost}, ${MAX_DISTANCE}::float))`.mapWith(Number);

    // isBoosted check
    const isBoostedSql = userId ? sql<boolean>`EXISTS (
      SELECT 1 FROM ${messageBoosts}
      WHERE ${eq(messageBoosts.messageId, messages.id)}
      AND ${eq(messageBoosts.userId, userId)}
    )` : sql<boolean>`false`;

    // Build where clause based on crowdId
    let crowdFilter;
    if (crowdId) {
      // Filter to specific crowd
      crowdFilter = eq(messages.crowdId, crowdId);
    } else {
      // Global feed - only messages without a crowd
      crowdFilter = isNull(messages.crowdId);
    }

    const whereClause = and(
      gt(messages.expiresAt, new Date()),
      sql`${effectiveDistance} <= ${messages.radiusMeters}`,
      crowdFilter
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
      crowdId: messages.crowdId,
      distance: effectiveDistance,
      isBoosted: isBoostedSql,
      isOwner: userId ? sql<boolean>`${messages.ownerId} = ${userId}` : sql<boolean>`false`,
    })
      .from(messages)
      .where(whereClause);

    let nearbyMessages;
    if (parsed.sortBy === 'soonest') {
      nearbyMessages = await baseQuery
        .orderBy(asc(messages.expiresAt))
        .limit(parsed.limit)
        .offset(parsed.offset);
    } else {
      // defaults to nearest
      nearbyMessages = await baseQuery
        .orderBy(asc(effectiveDistance))
        .limit(parsed.limit)
        .offset(parsed.offset);
    }

    // Map to DTO
    return nearbyMessages.map(msg => ({
      ...msg,
      latitude: parseFloat(msg.latitude),
      longitude: parseFloat(msg.longitude),
      distance: msg.distance,
      ownerId: msg.ownerId || undefined, // handle null
      crowdId: msg.crowdId || undefined,
    }));
  } catch (err: unknown) {
    request.log.error({
      msg: 'Feed Query Failed',
      error: err,
    });
    const message = err instanceof Error ? err.message : 'Unknown error';
    return reply.status(500).send({
      error: 'Internal Server Error',
      message,
    });
  }
});

// Graceful shutdown handler
const shutdown = async (signal: string) => {
  console.log(`Received ${signal}, shutting down gracefully...`);
  try {
    await server.close();
    console.log('Server closed');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

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
