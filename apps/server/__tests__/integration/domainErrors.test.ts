import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { Pool } from 'pg';
import { setupTestDb, teardownTestDb, clearTables, getConnectionString, getTestDb } from '../helpers/testDb';
import { buildApp } from '../../src/app';
import { validCrowd, validMessage, validBoost, portlandLocation, randomUuid } from '../helpers/fixtures';

// Every domain error reply, one row per reply site in app.ts. Each row
// asserts the status and the whole body, so changed prose, a wrong code or an
// extra key fails. The prose and codes are written out as literals and never
// read from the server's table: the codes are a contract with the iOS client,
// and a typo shared by the table and the test would pass both.

// The iOS client's `Rejection` raw values (crowd-ios, CrowdCore/API/APIError.swift).
// The client matches them case-sensitively, so they must be exact.
const CLIENT_CODES = [
  'CROWD_NOT_FOUND',
  'CROWD_EXPIRED',
  'CROWD_CLOSED',
  'ALREADY_MEMBER',
  'NOT_MEMBER',
  'NOT_OWNER',
  'POST_NOT_FOUND',
  'POST_EXPIRED',
  'OWN_POST',
  'ALREADY_RELAYED',
  'INVITE_TOKEN_NOT_FOUND',
  'INVITE_TOKEN_USED',
  'INVITE_TOKEN_EXPIRED',
];

type Reply = { statusCode: number; json: () => unknown };

type Row = {
  name: string;
  status: number;
  body: { error: string; code: string };
  request: () => Promise<Reply>;
};

describe('Domain errors', () => {
  let app: FastifyInstance;
  let pool: Pool;

  beforeAll(async () => {
    await setupTestDb();
    pool = new Pool({ connectionString: getConnectionString()! });
    app = await buildApp({
      db: getTestDb(),
      cors: { origin: true, credentials: true },
      logger: false,
    });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTables();
  });

  const createCrowd = async (ownerId: string, isOpen = true): Promise<string> => {
    const response = await app.inject({
      method: 'POST',
      url: '/crowds',
      payload: validCrowd({ crowdUserId: ownerId, isOpen }),
    });
    expect(response.statusCode).toBe(200);
    return response.json().id;
  };

  const mintToken = async (crowdId: string, ownerId: string): Promise<string> => {
    const response = await app.inject({
      method: 'POST',
      url: `/crowds/${crowdId}/proximity-token`,
      payload: { crowdUserId: ownerId },
    });
    expect(response.statusCode).toBe(200);
    return response.json().token;
  };

  // A private crowd with a fresh invite token.
  const crowdWithToken = async () => {
    const ownerId = randomUuid();
    const crowdId = await createCrowd(ownerId, false);
    const token = await mintToken(crowdId, ownerId);
    return { crowdId, token };
  };

  const postMessage = async (ownerId: string): Promise<string> => {
    const response = await app.inject({
      method: 'POST',
      url: '/messages',
      payload: validMessage({ userId: ownerId, radiusMeters: 5000 }),
    });
    expect(response.statusCode).toBe(200);
    return response.json().id;
  };

  // Expiry is reached by backdating the row, not by waiting.
  const expire = async (table: 'crowds' | 'messages', id: string) => {
    await pool.query(`UPDATE ${table} SET expires_at = NOW() - INTERVAL '1 minute' WHERE id = $1`, [id]);
  };

  const expireToken = async (token: string) => {
    await pool.query(`UPDATE proximity_tokens SET expires_at = NOW() - INTERVAL '1 minute' WHERE token = $1`, [token]);
  };

  // The token endpoints check the token, then load its crowd. A crowd's
  // tokens are deleted with it, so the crowd can only be missing if the
  // cleanup runs between those two queries. This stands in for that race:
  // the crowd row is deleted with foreign-key triggers off, so its token
  // survives. SET LOCAL keeps the setting inside this one transaction.
  const deleteCrowdKeepingItsToken = async (crowdId: string) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL session_replication_role = replica');
      await client.query('DELETE FROM crowds WHERE id = $1', [crowdId]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  };

  const join = (crowdId: string, crowdUserId: string) =>
    app.inject({ method: 'POST', url: `/crowds/${crowdId}/join`, payload: { crowdUserId } });

  const inviteCreation = (crowdId: string, crowdUserId: string) =>
    app.inject({ method: 'POST', url: `/crowds/${crowdId}/proximity-token`, payload: { crowdUserId } });

  const tokenLookup = (token: string) =>
    app.inject({ method: 'POST', url: '/crowds/lookup-token', payload: { token } });

  const tokenJoin = (token: string) =>
    app.inject({
      method: 'POST',
      url: '/crowds/join-with-token',
      payload: { token, crowdUserId: randomUuid() },
    });

  const post = (crowdId: string, userId: string) =>
    app.inject({ method: 'POST', url: '/messages', payload: validMessage({ userId, crowdId }) });

  const relay = (messageId: string, userId: string) =>
    app.inject({ method: 'POST', url: `/messages/${messageId}/boost`, payload: validBoost({ userId }) });

  const feed = (query: string) =>
    app.inject({
      method: 'GET',
      url: `/messages/feed?latitude=${portlandLocation.latitude}&longitude=${portlandLocation.longitude}${query}`,
    });

  const unknownToken = 'a'.repeat(43);

  // Two token endpoints, the same five failures in the same order.
  const tokenRows = (endpoint: string, send: (token: string) => Promise<Reply>): Row[] => [
    {
      name: `${endpoint}: no token with this value`,
      status: 404,
      body: { error: 'Invalid token', code: 'INVITE_TOKEN_NOT_FOUND' },
      request: () => send(unknownToken),
    },
    {
      name: `${endpoint}: token already used`,
      status: 400,
      body: { error: 'Token already used', code: 'INVITE_TOKEN_USED' },
      request: async () => {
        const { token } = await crowdWithToken();
        expect((await tokenJoin(token)).statusCode).toBe(200);
        return send(token);
      },
    },
    {
      name: `${endpoint}: token expired`,
      status: 400,
      body: { error: 'Token expired', code: 'INVITE_TOKEN_EXPIRED' },
      request: async () => {
        const { token } = await crowdWithToken();
        await expireToken(token);
        return send(token);
      },
    },
    {
      name: `${endpoint}: the token's crowd is gone`,
      status: 404,
      body: { error: 'Crowd not found', code: 'CROWD_NOT_FOUND' },
      request: async () => {
        const { crowdId, token } = await crowdWithToken();
        await deleteCrowdKeepingItsToken(crowdId);
        return send(token);
      },
    },
    {
      name: `${endpoint}: the token's crowd expired`,
      status: 400,
      body: { error: 'Crowd expired', code: 'CROWD_EXPIRED' },
      request: async () => {
        const { crowdId, token } = await crowdWithToken();
        await expire('crowds', crowdId);
        return send(token);
      },
    },
  ];

  const rows: Row[] = [
    // POST /crowds/:id/join
    {
      name: 'join: no such crowd',
      status: 404,
      body: { error: 'Crowd not found', code: 'CROWD_NOT_FOUND' },
      request: () => join(randomUuid(), randomUuid()),
    },
    {
      name: 'join: crowd expired',
      status: 400,
      body: { error: 'Crowd expired', code: 'CROWD_EXPIRED' },
      request: async () => {
        const crowdId = await createCrowd(randomUuid());
        await expire('crowds', crowdId);
        return join(crowdId, randomUuid());
      },
    },
    {
      name: 'join: crowd is closed',
      status: 400,
      body: { error: 'Crowd is closed', code: 'CROWD_CLOSED' },
      request: async () => join(await createCrowd(randomUuid(), false), randomUuid()),
    },
    {
      name: 'join: already a member',
      status: 400,
      body: { error: 'Already a member', code: 'ALREADY_MEMBER' },
      request: async () => {
        // The owner is a member from the start.
        const ownerId = randomUuid();
        return join(await createCrowd(ownerId), ownerId);
      },
    },

    // POST /crowds/:id/proximity-token
    {
      name: 'invite creation: no such crowd',
      status: 404,
      body: { error: 'Crowd not found', code: 'CROWD_NOT_FOUND' },
      request: () => inviteCreation(randomUuid(), randomUuid()),
    },
    {
      name: 'invite creation: crowd expired',
      status: 400,
      body: { error: 'Crowd expired', code: 'CROWD_EXPIRED' },
      request: async () => {
        const ownerId = randomUuid();
        const crowdId = await createCrowd(ownerId);
        await expire('crowds', crowdId);
        return inviteCreation(crowdId, ownerId);
      },
    },
    {
      name: 'invite creation: not the owner',
      status: 403,
      body: { error: 'Only the owner can generate join codes', code: 'NOT_OWNER' },
      request: async () => inviteCreation(await createCrowd(randomUuid()), randomUuid()),
    },

    // POST /crowds/lookup-token and POST /crowds/join-with-token
    ...tokenRows('token lookup', tokenLookup),
    ...tokenRows('token join', tokenJoin),

    // POST /messages with a crowdId
    {
      name: 'post: no such crowd',
      status: 404,
      body: { error: 'Crowd not found', code: 'CROWD_NOT_FOUND' },
      request: () => post(randomUuid(), randomUuid()),
    },
    {
      name: 'post: crowd expired',
      status: 400,
      body: { error: 'Crowd expired', code: 'CROWD_EXPIRED' },
      request: async () => {
        const ownerId = randomUuid();
        const crowdId = await createCrowd(ownerId);
        await expire('crowds', crowdId);
        return post(crowdId, ownerId);
      },
    },
    {
      name: 'post: not a member',
      status: 403,
      body: { error: 'Not a member of this crowd', code: 'NOT_MEMBER' },
      request: async () => post(await createCrowd(randomUuid()), randomUuid()),
    },

    // POST /messages/:id/boost (relay)
    {
      name: 'relay: no such post',
      status: 404,
      body: { error: 'Message not found', code: 'POST_NOT_FOUND' },
      request: () => relay(randomUuid(), randomUuid()),
    },
    {
      name: 'relay: post expired',
      status: 400,
      body: { error: 'Message expired', code: 'POST_EXPIRED' },
      request: async () => {
        const messageId = await postMessage(randomUuid());
        await expire('messages', messageId);
        return relay(messageId, randomUuid());
      },
    },
    {
      name: 'relay: own post',
      status: 400,
      body: { error: 'Cannot boost your own message', code: 'OWN_POST' },
      request: async () => {
        const ownerId = randomUuid();
        return relay(await postMessage(ownerId), ownerId);
      },
    },
    {
      name: 'relay: already relayed',
      status: 400,
      body: { error: 'Already boosted', code: 'ALREADY_RELAYED' },
      request: async () => {
        const messageId = await postMessage(randomUuid());
        const relayerId = randomUuid();
        expect((await relay(messageId, relayerId)).statusCode).toBe(200);
        return relay(messageId, relayerId);
      },
    },

    // GET /messages/feed with a crowdId
    {
      name: 'feed: no userId',
      status: 403,
      body: { error: 'Not a member of this crowd', code: 'NOT_MEMBER' },
      request: async () => feed(`&crowdId=${await createCrowd(randomUuid())}`),
    },
    {
      name: 'feed: no such crowd',
      status: 404,
      body: { error: 'Crowd not found', code: 'CROWD_NOT_FOUND' },
      request: () => feed(`&userId=${randomUuid()}&crowdId=${randomUuid()}`),
    },
    {
      name: 'feed: crowd expired',
      status: 400,
      body: { error: 'Crowd expired', code: 'CROWD_EXPIRED' },
      request: async () => {
        const ownerId = randomUuid();
        const crowdId = await createCrowd(ownerId);
        await expire('crowds', crowdId);
        return feed(`&userId=${ownerId}&crowdId=${crowdId}`);
      },
    },
    {
      name: 'feed: not a member',
      status: 403,
      body: { error: 'Not a member of this crowd', code: 'NOT_MEMBER' },
      request: async () => feed(`&userId=${randomUuid()}&crowdId=${await createCrowd(randomUuid())}`),
    },
  ];

  it.each(rows)('$name', async ({ request, status, body }) => {
    const response = await request();

    expect(response.statusCode).toBe(status);
    expect(response.json()).toEqual(body);
  });

  it('covers every reply site', () => {
    expect(rows).toHaveLength(28);
  });

  it('uses exactly the codes the iOS client knows', () => {
    const codes = new Set(rows.map((row) => row.body.code));
    expect([...codes].sort()).toEqual([...CLIENT_CODES].sort());
  });
});
