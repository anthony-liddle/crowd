import fastify, { FastifyInstance, FastifyServerOptions } from 'fastify';
import cors, { FastifyCorsOptions } from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { randomBytes } from 'crypto';
import { ZodError } from 'zod';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
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
import { db as defaultDb } from './db/index';
import { messages, messageBoosts, crowds, crowdMemberships, proximityTokens } from './db/schema';
import { sql, asc, gt, and, eq, or, inArray, count, isNull } from 'drizzle-orm';

// 24 hours in milliseconds for crowd expiration
const CROWD_DURATION_MS = 24 * 60 * 60 * 1000;
// Proximity tokens live for 5 minutes — long enough for a real
// "show this QR code to a friend in front of you" interaction, short
// enough that a leaked token can't be replayed later.
const PROXIMITY_TOKEN_TTL_MS = 5 * 60 * 1000;

export interface BuildAppOptions {
  // Drizzle DB instance. Defaults to the production singleton from
  // ./db/index. Tests pass a test-container-backed instance instead.
  db?: NodePgDatabase<any>;
  // @fastify/cors options. Defaults to production CORS_ORIGIN env logic.
  cors?: FastifyCorsOptions;
  // Fastify logger config. Defaults to enabled; tests pass `false`.
  logger?: FastifyServerOptions['logger'];
}

function buildProductionCorsConfig(): FastifyCorsOptions {
  const isProduction = process.env.NODE_ENV === 'production';
  const rawCorsOrigin = process.env.CORS_ORIGIN;

  if (isProduction && (!rawCorsOrigin || rawCorsOrigin === '*')) {
    throw new Error(
      'CORS_ORIGIN must be set to an explicit origin (or comma-separated ' +
      'list) when NODE_ENV=production. Wildcard is refused. Set it via ' +
      "`fly secrets set CORS_ORIGIN='https://your-frontend.example'`.",
    );
  }

  const origin: string | string[] = rawCorsOrigin
    ? rawCorsOrigin.includes(',')
      ? rawCorsOrigin.split(',').map((o) => o.trim()).filter(Boolean)
      : rawCorsOrigin
    : '*';

  return { origin };
}

export async function buildApp(opts: BuildAppOptions = {}): Promise<FastifyInstance> {
  const db = opts.db ?? defaultDb;
  const server = fastify({ logger: opts.logger ?? true });

  // POST /messages rate-limit defaults. Env-overridable so tests can
  // shrink the window and so production can re-tune without a redeploy.
  // Read inside buildApp so each app instance picks up the current env.
  const POST_RATE_LIMIT_MAX = parseInt(process.env.POST_RATE_LIMIT_MAX ?? '10', 10);
  const rawWindow = process.env.POST_RATE_LIMIT_WINDOW ?? '1 minute';
  const POST_RATE_LIMIT_WINDOW: string | number = /^\d+$/.test(rawWindow)
    ? parseInt(rawWindow, 10)
    : rawWindow;

  // CORS configuration. In production CORS_ORIGIN must be set explicitly
  // (no wildcard). Outside production we default to '*' so local dev
  // doesn't need configuration. Comma-separated values become an array.
  // Tests inject a permissive config via opts.cors.
  const corsConfig: FastifyCorsOptions = opts.cors ?? buildProductionCorsConfig();
  server.register(cors, corsConfig);

  // Rate limiting is registered globally but configured per-route — we
  // only want POST /messages limited (the bad-actor location-flooding
  // vector), not reads. `hook: 'preHandler'` is set here (it's a
  // plugin-registration-level option) so the per-route keyGenerator can
  // read the parsed request body. The in-memory store is sufficient for
  // dev and single-instance Fly; Redis is a config change away.
  //
  // Awaited so the plugin's onRoute hook is in place before routes are
  // declared — otherwise per-route `config.rateLimit` is silently ignored.
  await server.register(rateLimit, { global: false, hook: 'preHandler' });

  // Global error handler. Zod validation failures are client errors; they
  // return 400 with the issues serialized. Everything else is treated as a
  // server error and returns 500 with the existing response shape. Logging
  // level is set per branch so validation noise doesn't flood error logs.
  server.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      request.log.info({ issues: error.issues }, 'Validation failed');
      return reply.status(400).send({
        error: 'ValidationError',
        issues: error.issues,
      });
    }
    // Pass through errors that already carry a 4xx status (e.g. the
    // 429 from @fastify/rate-limit) instead of flattening them to 500.
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500) {
      return reply.status(statusCode).send(error);
    }
    request.log.error({ error }, 'Request failed');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  });

  server.get('/health', async (_request, reply) => {
    try {
      await db.execute(sql`SELECT 1`);
      return { status: 'ok' };
    } catch (error) {
      reply.code(503);
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'database unreachable',
      };
    }
  });

  // ==================== CROWDS API ====================

  // Create a new crowd
  // Create a new crowd. The client pre-generates the crowd-specific user ID
  // and sends it as `crowdUserId`; the server uses it for both `owner_id` on
  // the crowd row and `user_id` on the auto-inserted membership row. The
  // device's global feed identity never reaches this handler — see the note
  // in CreateCrowdSchema for the full design rationale.
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
    } catch (err: any) {
      if (err instanceof ZodError) throw err;
      request.log.error({ msg: 'Create Crowd Failed', error: err });
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: err.message,
      });
    }
  });

  // Look up the user's active crowds. Replaces the old GET /crowds. The
  // client sends every crowd-specific ID it has stored; the server returns
  // any non-expired crowd where one of those IDs matches either the
  // membership row or the owner row. `isOwner` is computed by checking
  // whether the crowd's owner_id appears in the supplied list.
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
    } catch (err: any) {
      if (err instanceof ZodError) throw err;
      request.log.error({ msg: 'Lookup Crowds Failed', error: err });
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: err.message,
      });
    }
  });

  // Join an open crowd by ID. Membership is keyed by the caller's
  // crowd-specific ID for this crowd.
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

      const [existing] = await db.select().from(crowdMemberships).where(and(
        eq(crowdMemberships.crowdId, crowdId),
        eq(crowdMemberships.userId, body.crowdUserId),
      ));
      if (existing) {
        return reply.status(400).send({ error: 'Already a member' });
      }

      await db.insert(crowdMemberships).values({
        crowdId,
        userId: body.crowdUserId,
      });

      return { status: 'ok' };
    } catch (err: any) {
      if (err instanceof ZodError) throw err;
      request.log.error({ msg: 'Join Crowd Failed', error: err });
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: err.message,
      });
    }
  });

  // Generate a proximity token for a crowd. Owner-only. The owner check
  // compares the supplied crowd-specific ID against `crowds.owner_id`, which
  // was set to the same crowd-specific ID at create time.
  server.post('/crowds/:id/proximity-token', async (request, reply) => {
    try {
      const crowdId = (request.params as { id: string }).id;
      const body = CreateProximityTokenSchema.parse(request.body);

      const [crowd] = await db.select().from(crowds).where(eq(crowds.id, crowdId));
      if (!crowd) {
        return reply.status(404).send({ error: 'Crowd not found' });
      }
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
    } catch (err: any) {
      if (err instanceof ZodError) throw err;
      request.log.error({ msg: 'Create Proximity Token Failed', error: err });
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: err.message,
      });
    }
  });

  // Look up a proximity token without consuming it. Used by the QR-scan
  // pre-join confirmation: the client validates the token and shows crowd
  // metadata before the user commits to joining. Read-only — repeatable.
  server.post('/crowds/lookup-token', async (request, reply) => {
    try {
      const body = LookupTokenSchema.parse(request.body);

      const [tokenRow] = await db.select().from(proximityTokens).where(eq(proximityTokens.token, body.token));
      if (!tokenRow) {
        return reply.status(404).send({ error: 'Invalid token' });
      }
      if (tokenRow.usedAt !== null) {
        return reply.status(400).send({ error: 'Token already used' });
      }
      if (tokenRow.expiresAt < new Date()) {
        return reply.status(400).send({ error: 'Token expired' });
      }

      const [crowd] = await db.select().from(crowds).where(eq(crowds.id, tokenRow.crowdId));
      if (!crowd) {
        return reply.status(404).send({ error: 'Crowd not found' });
      }
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
    } catch (err: any) {
      if (err instanceof ZodError) throw err;
      request.log.error({ msg: 'Lookup Token Failed', error: err });
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: err.message,
      });
    }
  });

  // Consume a proximity token to join a crowd. Bypasses the open/private
  // check because token possession itself proves the owner authorized this
  // join. Single-use: the token is marked consumed on success.
  server.post('/crowds/join-with-token', async (request, reply) => {
    try {
      const body = JoinWithTokenSchema.parse(request.body);

      const [tokenRow] = await db.select().from(proximityTokens).where(eq(proximityTokens.token, body.token));
      if (!tokenRow) {
        return reply.status(404).send({ error: 'Invalid token' });
      }
      if (tokenRow.usedAt !== null) {
        return reply.status(400).send({ error: 'Token already used' });
      }
      if (tokenRow.expiresAt < new Date()) {
        return reply.status(400).send({ error: 'Token expired' });
      }

      const [crowd] = await db.select().from(crowds).where(eq(crowds.id, tokenRow.crowdId));
      if (!crowd) {
        return reply.status(404).send({ error: 'Crowd not found' });
      }
      if (crowd.expiresAt < new Date()) {
        return reply.status(400).send({ error: 'Crowd expired' });
      }

      const [existing] = await db.select().from(crowdMemberships).where(and(
        eq(crowdMemberships.crowdId, tokenRow.crowdId),
        eq(crowdMemberships.userId, body.crowdUserId)
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
    } catch (err: any) {
      if (err instanceof ZodError) throw err;
      request.log.error({ msg: 'Join With Token Failed', error: err });
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: err.message,
      });
    }
  });

  // Leave a crowd. Removes the membership row keyed by the caller's
  // crowd-specific ID. Idempotent: deleting a non-existent membership
  // returns ok. owner_id is unaffected — an owner who leaves keeps their
  // crowd appearing in the lookup endpoint via the owner-match clause.
  server.post('/crowds/:id/leave', async (request, reply) => {
    try {
      const crowdId = (request.params as { id: string }).id;
      const body = LeaveCrowdSchema.parse(request.body);

      await db.delete(crowdMemberships).where(and(
        eq(crowdMemberships.crowdId, crowdId),
        eq(crowdMemberships.userId, body.crowdUserId),
      ));

      return { status: 'ok' };
    } catch (err: any) {
      if (err instanceof ZodError) throw err;
      request.log.error({ msg: 'Leave Crowd Failed', error: err });
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: err.message,
      });
    }
  });

  // ==================== MESSAGES API ====================

  server.post('/messages', {
    config: {
      rateLimit: {
        max: POST_RATE_LIMIT_MAX,
        timeWindow: POST_RATE_LIMIT_WINDOW,
        keyGenerator: (req) => {
          const body = req.body as { userId?: string } | undefined;
          return body?.userId ?? req.ip;
        },
      },
    },
  }, async (request, reply) => {
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
      if (err instanceof ZodError) throw err;
      request.log.error({
        msg: 'Create Message Failed',
        error: err,
        code: err.code,
        detail: err.detail,
      });
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: err.message,
        detail: err.detail,
        code: err.code,
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
      if (err instanceof ZodError) throw err;
      request.log.error({
        msg: 'Boost Message Failed',
        error: err,
        code: err.code,
        detail: err.detail,
      });
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: err.message,
        detail: err.detail,
        code: err.code,
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

      const orderedQuery =
        parsed.sortBy === 'soonest'
          ? baseQuery.orderBy(asc(messages.expiresAt))
          : baseQuery.orderBy(asc(effectiveDistance));

      const nearbyMessages = await orderedQuery
        .limit(parsed.limit)
        .offset(parsed.offset);

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
      if (err instanceof ZodError) throw err;
      request.log.error({
        msg: 'Feed Query Failed',
        error: err,
        code: err.code,
        detail: err.detail,
      });
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: err.message,
        detail: err.detail,
        code: err.code,
      });
    }
  });

  return server;
}
