import fastify, { FastifyInstance } from 'fastify';
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
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { messages, messageBoosts, crowds, crowdMemberships } from '../../src/db/schema';
import { sql, asc, gt, and, eq, count, isNull } from 'drizzle-orm';

const CROWD_DURATION_MS = 24 * 60 * 60 * 1000;

export function createTestApp(connectionString: string): FastifyInstance {
  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  const server = fastify({ logger: false });

  server.register(cors, {
    origin: true,
    credentials: true,
  });

  // Health endpoint
  server.get('/health', async () => {
    return { status: 'ok' };
  });

  // Create crowd
  server.post('/crowds', async (request, reply) => {
    try {
      const body = CreateCrowdSchema.parse(request.body);
      const created = new Date();
      const expires = new Date(created.getTime() + CROWD_DURATION_MS);

      const [newCrowd] = await db.insert(crowds).values({
        name: body.name,
        ownerId: body.userId,
        isOpen: body.isOpen,
        createdAt: created,
        expiresAt: expires,
      }).returning({ id: crowds.id });

      await db.insert(crowdMemberships).values({
        crowdId: newCrowd.id,
        userId: body.userId,
      });

      return { id: newCrowd.id };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(500).send({ error: 'Internal Server Error', message });
    }
  });

  // Get crowds
  server.get('/crowds', async (request, reply) => {
    try {
      const query = QueryCrowdsSchema.parse(request.query);
      const userId = query.userId;

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
          sql`EXISTS (
            SELECT 1 FROM ${crowdMemberships} cm
            WHERE cm.crowd_id = ${crowds.id}
            AND cm.user_id = ${userId}
          )`
        ))
        .groupBy(crowds.id);

      return userCrowdsWithCounts.map(crowd => ({
        id: crowd.id,
        name: crowd.name,
        isOpen: crowd.isOpen,
        isOwner: crowd.ownerId === userId,
        memberCount: Number(crowd.memberCount) || 0,
        createdAt: crowd.createdAt,
        expiresAt: crowd.expiresAt,
        canInvite: crowd.isOpen || crowd.ownerId === userId,
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(500).send({ error: 'Internal Server Error', message });
    }
  });

  // Join crowd
  server.post('/crowds/:id/join', async (request, reply) => {
    try {
      const crowdId = (request.params as { id: string }).id;
      const body = JoinCrowdSchema.parse(request.body);

      const [crowd] = await db.select().from(crowds).where(eq(crowds.id, crowdId));
      if (!crowd) {
        return reply.status(404).send({ error: 'Crowd not found' });
      }
      if (crowd.expiresAt < new Date()) {
        return reply.status(400).send({ error: 'Crowd expired' });
      }
      if (!crowd.isOpen) {
        return reply.status(400).send({ error: 'Crowd is closed' });
      }

      try {
        await db.insert(crowdMemberships).values({
          crowdId,
          userId: body.userId,
        });
      } catch (insertErr: unknown) {
        // Check for unique constraint violation (PostgreSQL error code 23505)
        if (insertErr instanceof Error &&
            (insertErr.message.includes('unique_crowd_membership') ||
             (insertErr as any).code === '23505')) {
          return reply.status(400).send({ error: 'Already a member' });
        }
        throw insertErr;
      }

      return { status: 'ok' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(500).send({ error: 'Internal Server Error', message });
    }
  });

  // Leave crowd
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
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(500).send({ error: 'Internal Server Error', message });
    }
  });

  // Post message
  server.post('/messages', async (request, reply) => {
    try {
      const body = PostMessageSchema.parse(request.body);

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
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(500).send({ error: 'Internal Server Error', message });
    }
  });

  // Boost message
  server.post('/messages/:id/boost', async (request, reply) => {
    try {
      const id = (request.params as { id: string }).id;
      const body = BoostMessageSchema.parse(request.body);

      const [message] = await db.select().from(messages).where(eq(messages.id, id));
      if (!message) {
        return reply.status(404).send({ error: 'Message not found' });
      }
      if (message.expiresAt < new Date()) {
        return reply.status(400).send({ error: 'Message expired' });
      }
      if (message.ownerId === body.userId) {
        return reply.status(400).send({ error: 'Cannot boost your own message' });
      }

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
        // Check for unique constraint violation (PostgreSQL error code 23505)
        if (insertErr instanceof Error &&
            (insertErr.message.includes('unique_user_boost') ||
             (insertErr as any).code === '23505')) {
          return reply.status(400).send({ error: 'Already boosted' });
        }
        throw insertErr;
      }

      return { status: 'ok' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(500).send({ error: 'Internal Server Error', message });
    }
  });

  // Get feed
  server.get('/messages/feed', async (request, reply) => {
    try {
      const parsed = QueryFeedSchema.parse(request.query);
      const userLat = parsed.latitude;
      const userLng = parsed.longitude;
      const userId = parsed.userId;
      const crowdId = parsed.crowdId;

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

      const haversine = (latCol: any, lngCol: any) => sql`
        6371000 * 2 * asin(
          sqrt(
            power(sin(radians((${latCol}::float - ${userLat}::float) / 2)), 2) +
            cos(radians(${userLat}::float)) * cos(radians(${latCol}::float)) *
            power(sin(radians((${lngCol}::float - ${userLng}::float) / 2)), 2)
          )
        )
      `;

      const distanceToOrigin = haversine(messages.latitude, messages.longitude);
      const distanceToClosestBoost = sql`
        (SELECT MIN(${haversine(messageBoosts.latitude, messageBoosts.longitude)})
         FROM ${messageBoosts}
         WHERE ${messageBoosts.messageId} = ${messages.id})
      `;

      const MAX_DISTANCE = 100000000;
      const effectiveDistance = sql<number>`LEAST(${distanceToOrigin}, COALESCE(${distanceToClosestBoost}, ${MAX_DISTANCE}::float))`.mapWith(Number);

      const isBoostedSql = userId ? sql<boolean>`EXISTS (
        SELECT 1 FROM ${messageBoosts}
        WHERE ${eq(messageBoosts.messageId, messages.id)}
        AND ${eq(messageBoosts.userId, userId)}
      )` : sql<boolean>`false`;

      let crowdFilter;
      if (crowdId) {
        crowdFilter = eq(messages.crowdId, crowdId);
      } else {
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
        nearbyMessages = await baseQuery
          .orderBy(asc(effectiveDistance))
          .limit(parsed.limit)
          .offset(parsed.offset);
      }

      return nearbyMessages.map(msg => ({
        ...msg,
        latitude: parseFloat(msg.latitude as string),
        longitude: parseFloat(msg.longitude as string),
        distance: msg.distance,
        ownerId: msg.ownerId || undefined,
        crowdId: msg.crowdId || undefined,
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(500).send({ error: 'Internal Server Error', message });
    }
  });

  return server;
}
