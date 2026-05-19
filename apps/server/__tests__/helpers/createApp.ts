import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { randomBytes } from 'crypto';
import { ZodError } from 'zod';
import {
  PostMessageSchema,
  QueryFeedSchema,
  BoostMessageSchema,
  CreateCrowdSchema,
  JoinCrowdSchema,
  LeaveCrowdSchema,
  LookupCrowdsRequestSchema,
  CreateProximityTokenSchema,
  JoinWithTokenSchema,
  LookupTokenSchema,
} from '@repo/shared';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { messages, messageBoosts, crowds, crowdMemberships, proximityTokens } from '../../src/db/schema';
import { sql, asc, gt, and, eq, or, inArray, count, isNull } from 'drizzle-orm';

const CROWD_DURATION_MS = 24 * 60 * 60 * 1000;
const PROXIMITY_TOKEN_TTL_MS = 5 * 60 * 1000;

export function createTestApp(connectionString: string): FastifyInstance {
  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  const server = fastify({ logger: false });

  server.register(cors, {
    origin: true,
    credentials: true,
  });

  // Mirror production's global error handler: Zod validation failures
  // return 400; everything else stays at the existing 500 shape.
  server.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: 'ValidationError',
        issues: error.issues,
      });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    return reply.status(500).send({ error: 'Internal Server Error', message });
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
        ownerId: body.crowdUserId,
        isOpen: body.isOpen,
        createdAt: created,
        expiresAt: expires,
      }).returning({ id: crowds.id });

      await db.insert(crowdMemberships).values({
        crowdId: newCrowd.id,
        userId: body.crowdUserId,
      });

      return { id: newCrowd.id };
    } catch (err: unknown) {
      if (err instanceof ZodError) throw err;
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(500).send({ error: 'Internal Server Error', message });
    }
  });

  // Lookup crowds
  server.post('/crowds/lookup', async (request, reply) => {
    try {
      const body = LookupCrowdsRequestSchema.parse(request.body);
      const ids = body.crowdUserIds;
      const idSet = new Set(ids);

      const matched = await db
        .selectDistinct({
          id: crowds.id,
          name: crowds.name,
          isOpen: crowds.isOpen,
          ownerId: crowds.ownerId,
          createdAt: crowds.createdAt,
          expiresAt: crowds.expiresAt,
        })
        .from(crowds)
        .leftJoin(crowdMemberships, eq(crowds.id, crowdMemberships.crowdId))
        .where(and(
          gt(crowds.expiresAt, new Date()),
          or(
            inArray(crowds.ownerId, ids),
            inArray(crowdMemberships.userId, ids),
          ),
        ));

      const result = await Promise.all(matched.map(async (crowd) => {
        const [memberCountResult] = await db
          .select({ count: count() })
          .from(crowdMemberships)
          .where(eq(crowdMemberships.crowdId, crowd.id));

        const isOwner = idSet.has(crowd.ownerId);
        return {
          id: crowd.id,
          name: crowd.name,
          isOpen: crowd.isOpen,
          isOwner,
          memberCount: memberCountResult?.count || 0,
          createdAt: crowd.createdAt,
          expiresAt: crowd.expiresAt,
          canInvite: crowd.isOpen || isOwner,
        };
      }));

      return result;
    } catch (err: unknown) {
      if (err instanceof ZodError) throw err;
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
          userId: body.crowdUserId,
        });
      } catch (insertErr: unknown) {
        if (insertErr instanceof Error &&
            (insertErr.message.includes('unique_crowd_membership') ||
             (insertErr as any).code === '23505')) {
          return reply.status(400).send({ error: 'Already a member' });
        }
        throw insertErr;
      }

      return { status: 'ok' };
    } catch (err: unknown) {
      if (err instanceof ZodError) throw err;
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(500).send({ error: 'Internal Server Error', message });
    }
  });

  server.post('/crowds/:id/proximity-token', async (request, reply) => {
    try {
      const crowdId = (request.params as { id: string }).id;
      const body = CreateProximityTokenSchema.parse(request.body);

      const [crowd] = await db.select().from(crowds).where(eq(crowds.id, crowdId));
      if (!crowd) return reply.status(404).send({ error: 'Crowd not found' });
      if (crowd.expiresAt < new Date()) {
        return reply.status(400).send({ error: 'Crowd expired' });
      }
      if (crowd.ownerId !== body.crowdUserId) {
        return reply.status(403).send({ error: 'Only the owner can generate join codes' });
      }

      const token = randomBytes(32).toString('base64url');
      const now = new Date();
      const expiresAt = new Date(now.getTime() + PROXIMITY_TOKEN_TTL_MS);

      await db.insert(proximityTokens).values({
        crowdId,
        token,
        createdAt: now,
        expiresAt,
      });

      return { token, expiresAt };
    } catch (err: unknown) {
      if (err instanceof ZodError) throw err;
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(500).send({ error: 'Internal Server Error', message });
    }
  });

  server.post('/crowds/lookup-token', async (request, reply) => {
    try {
      const body = LookupTokenSchema.parse(request.body);

      const [tokenRow] = await db.select().from(proximityTokens).where(eq(proximityTokens.token, body.token));
      if (!tokenRow) return reply.status(404).send({ error: 'Invalid token' });
      if (tokenRow.usedAt !== null) {
        return reply.status(400).send({ error: 'Token already used' });
      }
      if (tokenRow.expiresAt < new Date()) {
        return reply.status(400).send({ error: 'Token expired' });
      }

      const [crowd] = await db.select().from(crowds).where(eq(crowds.id, tokenRow.crowdId));
      if (!crowd) return reply.status(404).send({ error: 'Crowd not found' });
      if (crowd.expiresAt < new Date()) {
        return reply.status(400).send({ error: 'Crowd expired' });
      }

      const [memberCountResult] = await db
        .select({ count: count() })
        .from(crowdMemberships)
        .where(eq(crowdMemberships.crowdId, tokenRow.crowdId));

      return {
        crowd: {
          id: crowd.id,
          name: crowd.name,
          isOpen: crowd.isOpen,
          memberCount: memberCountResult?.count || 0,
          expiresAt: crowd.expiresAt,
        },
      };
    } catch (err: unknown) {
      if (err instanceof ZodError) throw err;
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(500).send({ error: 'Internal Server Error', message });
    }
  });

  server.post('/crowds/join-with-token', async (request, reply) => {
    try {
      const body = JoinWithTokenSchema.parse(request.body);

      const [tokenRow] = await db.select().from(proximityTokens).where(eq(proximityTokens.token, body.token));
      if (!tokenRow) return reply.status(404).send({ error: 'Invalid token' });
      if (tokenRow.usedAt !== null) {
        return reply.status(400).send({ error: 'Token already used' });
      }
      if (tokenRow.expiresAt < new Date()) {
        return reply.status(400).send({ error: 'Token expired' });
      }

      const [crowd] = await db.select().from(crowds).where(eq(crowds.id, tokenRow.crowdId));
      if (!crowd) return reply.status(404).send({ error: 'Crowd not found' });
      if (crowd.expiresAt < new Date()) {
        return reply.status(400).send({ error: 'Crowd expired' });
      }

      const [existing] = await db.select().from(crowdMemberships).where(and(
        eq(crowdMemberships.crowdId, tokenRow.crowdId),
        eq(crowdMemberships.userId, body.crowdUserId),
      ));
      if (!existing) {
        await db.insert(crowdMemberships).values({
          crowdId: tokenRow.crowdId,
          userId: body.crowdUserId,
        });
      }

      await db.update(proximityTokens)
        .set({ usedAt: new Date() })
        .where(eq(proximityTokens.id, tokenRow.id));

      const [memberCountResult] = await db
        .select({ count: count() })
        .from(crowdMemberships)
        .where(eq(crowdMemberships.crowdId, tokenRow.crowdId));

      return {
        status: 'ok',
        crowd: {
          id: crowd.id,
          name: crowd.name,
          isOpen: crowd.isOpen,
          memberCount: memberCountResult?.count || 0,
          expiresAt: crowd.expiresAt,
        },
      };
    } catch (err: unknown) {
      if (err instanceof ZodError) throw err;
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
        eq(crowdMemberships.userId, body.crowdUserId),
      ));

      return { status: 'ok' };
    } catch (err: unknown) {
      if (err instanceof ZodError) throw err;
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
      if (err instanceof ZodError) throw err;
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
      if (err instanceof ZodError) throw err;
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
      if (err instanceof ZodError) throw err;
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(500).send({ error: 'Internal Server Error', message });
    }
  });

  return server;
}
