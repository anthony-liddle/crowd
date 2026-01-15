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
const corsOrigin = process.env.CORS_ORIGIN || '*';
server.register(cors, {
  origin: corsOrigin,
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
  } catch (err: any) {
    request.log.error({ msg: 'Create Crowd Failed', error: err });
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: err.message,
    });
  }
});

// Get user's active crowds
server.get('/crowds', async (request, reply) => {
  try {
    const query = QueryCrowdsSchema.parse(request.query);
    const userId = query.userId;

    // Get crowds where user is member and crowd is not expired
    const userCrowds = await db
      .select({
        id: crowds.id,
        name: crowds.name,
        isOpen: crowds.isOpen,
        ownerId: crowds.ownerId,
        createdAt: crowds.createdAt,
        expiresAt: crowds.expiresAt,
      })
      .from(crowds)
      .innerJoin(crowdMemberships, eq(crowds.id, crowdMemberships.crowdId))
      .where(and(
        eq(crowdMemberships.userId, userId),
        gt(crowds.expiresAt, new Date())
      ));

    // Get member counts for each crowd
    const result = await Promise.all(userCrowds.map(async (crowd) => {
      const [memberCountResult] = await db
        .select({ count: count() })
        .from(crowdMemberships)
        .where(eq(crowdMemberships.crowdId, crowd.id));

      return {
        id: crowd.id,
        name: crowd.name,
        isOpen: crowd.isOpen,
        isOwner: crowd.ownerId === userId,
        memberCount: memberCountResult?.count || 0,
        createdAt: crowd.createdAt,
        expiresAt: crowd.expiresAt,
        canInvite: crowd.isOpen || crowd.ownerId === userId,
      };
    }));

    return result;
  } catch (err: any) {
    request.log.error({ msg: 'Get Crowds Failed', error: err });
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: err.message,
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

    // 3. Check if already a member
    const [existing] = await db.select().from(crowdMemberships).where(and(
      eq(crowdMemberships.crowdId, crowdId),
      eq(crowdMemberships.userId, body.userId)
    ));
    if (existing) {
      return reply.status(400).send({ error: 'Already a member' });
    }

    // 4. Add membership
    await db.insert(crowdMemberships).values({
      crowdId,
      userId: body.userId,
    });

    return { status: 'ok' };
  } catch (err: any) {
    request.log.error({ msg: 'Join Crowd Failed', error: err });
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: err.message,
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
  } catch (err: any) {
    request.log.error({ msg: 'Leave Crowd Failed', error: err });
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: err.message,
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
  } catch (err: any) {
    request.log.error({
      msg: 'Create Message Failed',
      error: err,
      code: err.code,
      detail: err.detail,
    });
    return {
      error: 'Internal Server Error',
      message: err.message,
      detail: err.detail,
      code: err.code,
    };
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
  } catch (err: any) {
    request.log.error({
      msg: 'Boost Message Failed',
      error: err,
      code: err.code,
      detail: err.detail,
    });
    return {
      error: 'Internal Server Error',
      message: err.message,
      detail: err.detail,
      code: err.code,
    };
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
      crowdId: msg.crowdId || undefined,
    }));
  } catch (err: any) {
    request.log.error({
      msg: 'Feed Query Failed',
      error: err,
      code: err.code,
      detail: err.detail,
    });
    // Send detailed error to client for debugging
    return {
      error: 'Internal Server Error',
      message: err.message,
      detail: err.detail, // Postgres error detail
      code: err.code, // Postgres error code
    };
  }
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
