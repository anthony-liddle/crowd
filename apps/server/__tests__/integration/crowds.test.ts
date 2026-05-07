import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { setupTestDb, teardownTestDb, clearTables, getConnectionString } from '../helpers/testDb';
import { createTestApp } from '../helpers/createApp';
import { validCrowd, randomUuid } from '../helpers/fixtures';
import { Pool } from 'pg';

// Helpers — POST /crowds/lookup is the new "list" surface. These thin
// wrappers keep the test bodies focused on assertions rather than payload
// plumbing.
const lookupFor = async (app: FastifyInstance, ids: string[]) =>
  app.inject({
    method: 'POST',
    url: '/crowds/lookup',
    payload: { crowdUserIds: ids },
  });

describe('Crowds API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    await setupTestDb();
    app = createTestApp(getConnectionString()!);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTables();
  });

  describe('POST /crowds', () => {
    it('should create crowd and return UUID', async () => {
      const crowd = validCrowd();
      const response = await app.inject({
        method: 'POST',
        url: '/crowds',
        payload: crowd,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.id).toBeDefined();
      expect(body.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('keys both ownership and membership by the supplied crowdUserId', async () => {
      const crowdUserId = randomUuid();
      const crowd = validCrowd({ crowdUserId });

      const createResponse = await app.inject({
        method: 'POST',
        url: '/crowds',
        payload: crowd,
      });
      const crowdId = createResponse.json().id;

      // The crowd is visible via the lookup endpoint when keyed on the
      // crowdUserId, with isOwner=true (owner_id matched the supplied id).
      const listResponse = await lookupFor(app, [crowdUserId]);
      const crowds = listResponse.json();
      expect(crowds.length).toBe(1);
      expect(crowds[0].id).toBe(crowdId);
      expect(crowds[0].isOwner).toBe(true);
      expect(crowds[0].memberCount).toBe(1); // creator auto-membership

      // An unrelated id sees nothing.
      const otherResponse = await lookupFor(app, [randomUuid()]);
      expect(otherResponse.json()).toEqual([]);
    });

    it('should set 24h expiration', async () => {
      const beforeCreate = new Date();
      const crowd = validCrowd();

      await app.inject({
        method: 'POST',
        url: '/crowds',
        payload: crowd,
      });

      const listResponse = await lookupFor(app, [crowd.crowdUserId]);
      const crowds = listResponse.json();
      const expiresAt = new Date(crowds[0].expiresAt);
      const expectedExpiry = new Date(beforeCreate.getTime() + 24 * 60 * 60 * 1000);

      expect(Math.abs(expiresAt.getTime() - expectedExpiry.getTime())).toBeLessThan(5000);
    });
  });

  describe('POST /crowds/lookup', () => {
    it('should return crowds with memberCount', async () => {
      const ownerId = randomUuid();

      await app.inject({
        method: 'POST',
        url: '/crowds',
        payload: validCrowd({ crowdUserId: ownerId, name: 'Crowd 1' }),
      });

      // The same id can own multiple crowds in this test harness — each
      // create starts a new crowd row keyed by the same crowdUserId. In
      // production, devices generate a fresh crowdUserId per crowd; the
      // lookup-set semantics behave the same in either case.
      await app.inject({
        method: 'POST',
        url: '/crowds',
        payload: validCrowd({ crowdUserId: ownerId, name: 'Crowd 2' }),
      });

      const listResponse = await lookupFor(app, [ownerId]);
      const crowds = listResponse.json();
      expect(crowds.length).toBe(2);
      crowds.forEach((crowd: any) => {
        expect(crowd.memberCount).toBe(1);
      });
    });

    it('returns canInvite=true for owner on closed crowd, true for members on open crowd', async () => {
      const ownerId = randomUuid();

      await app.inject({
        method: 'POST',
        url: '/crowds',
        payload: validCrowd({ crowdUserId: ownerId, name: 'Open Crowd', isOpen: true }),
      });

      await app.inject({
        method: 'POST',
        url: '/crowds',
        payload: validCrowd({ crowdUserId: ownerId, name: 'Closed Crowd', isOpen: false }),
      });

      const crowds = (await lookupFor(app, [ownerId])).json();
      const openCrowd = crowds.find((c: any) => c.name === 'Open Crowd');
      const closedCrowd = crowds.find((c: any) => c.name === 'Closed Crowd');

      expect(openCrowd.canInvite).toBe(true);
      expect(closedCrowd.canInvite).toBe(true);
    });

    it('matches by membership OR ownership', async () => {
      const ownerId = randomUuid();
      const joinerId = randomUuid();

      const create = await app.inject({
        method: 'POST',
        url: '/crowds',
        payload: validCrowd({ crowdUserId: ownerId, isOpen: true }),
      });
      const crowdId = create.json().id;

      await app.inject({
        method: 'POST',
        url: `/crowds/${crowdId}/join`,
        payload: { crowdUserId: joinerId },
      });

      // Either id surfaces the crowd; isOwner reflects which side matched.
      const ownerView = (await lookupFor(app, [ownerId])).json();
      expect(ownerView.length).toBe(1);
      expect(ownerView[0].isOwner).toBe(true);

      const joinerView = (await lookupFor(app, [joinerId])).json();
      expect(joinerView.length).toBe(1);
      expect(joinerView[0].isOwner).toBe(false);
    });

    it('owner who left their own crowd still sees it via owner-match', async () => {
      const ownerId = randomUuid();

      const create = await app.inject({
        method: 'POST',
        url: '/crowds',
        payload: validCrowd({ crowdUserId: ownerId, isOpen: true }),
      });
      const crowdId = create.json().id;

      await app.inject({
        method: 'POST',
        url: `/crowds/${crowdId}/leave`,
        payload: { crowdUserId: ownerId },
      });

      const view = (await lookupFor(app, [ownerId])).json();
      expect(view.length).toBe(1);
      expect(view[0].isOwner).toBe(true);
      expect(view[0].memberCount).toBe(0);
    });

    it('returns empty array when no ids match', async () => {
      const someoneElse = randomUuid();
      await app.inject({
        method: 'POST',
        url: '/crowds',
        payload: validCrowd({ crowdUserId: someoneElse }),
      });

      const view = (await lookupFor(app, [randomUuid()])).json();
      expect(view).toEqual([]);
    });

    it('rejects empty crowdUserIds list at the schema layer', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/crowds/lookup',
        payload: { crowdUserIds: [] },
      });
      expect(response.statusCode).toBe(500); // Zod surfaces as 500 in this handler shape
    });
  });

  describe('POST /crowds/:id/join', () => {
    it('should join open crowd successfully', async () => {
      const ownerId = randomUuid();
      const joinerId = randomUuid();

      const createResponse = await app.inject({
        method: 'POST',
        url: '/crowds',
        payload: validCrowd({ crowdUserId: ownerId, isOpen: true }),
      });
      const crowdId = createResponse.json().id;

      const joinResponse = await app.inject({
        method: 'POST',
        url: `/crowds/${crowdId}/join`,
        payload: { crowdUserId: joinerId },
      });

      expect(joinResponse.statusCode).toBe(200);
      expect(joinResponse.json().status).toBe('ok');

      const crowds = (await lookupFor(app, [joinerId])).json();
      expect(crowds.length).toBe(1);
      expect(crowds[0].id).toBe(crowdId);
      expect(crowds[0].isOwner).toBe(false);
    });

    it('should reject joining closed crowd', async () => {
      const ownerId = randomUuid();
      const joinerId = randomUuid();

      const createResponse = await app.inject({
        method: 'POST',
        url: '/crowds',
        payload: validCrowd({ crowdUserId: ownerId, isOpen: false }),
      });
      const crowdId = createResponse.json().id;

      const joinResponse = await app.inject({
        method: 'POST',
        url: `/crowds/${crowdId}/join`,
        payload: { crowdUserId: joinerId },
      });

      expect(joinResponse.statusCode).toBe(400);
      expect(joinResponse.json().error).toBe('Crowd is closed');
    });

    it('should handle duplicate join (unique constraint)', async () => {
      const ownerId = randomUuid();
      const joinerId = randomUuid();

      const createResponse = await app.inject({
        method: 'POST',
        url: '/crowds',
        payload: validCrowd({ crowdUserId: ownerId, isOpen: true }),
      });
      const crowdId = createResponse.json().id;

      await app.inject({
        method: 'POST',
        url: `/crowds/${crowdId}/join`,
        payload: { crowdUserId: joinerId },
      });

      const duplicateResponse = await app.inject({
        method: 'POST',
        url: `/crowds/${crowdId}/join`,
        payload: { crowdUserId: joinerId },
      });

      expect(duplicateResponse.statusCode).toBeGreaterThanOrEqual(400);
      expect(duplicateResponse.statusCode).toBeLessThan(600);

      const crowds = (await lookupFor(app, [ownerId])).json();
      expect(crowds[0].memberCount).toBe(2);
    });

    it('should return 404 for non-existent crowd', async () => {
      const joinResponse = await app.inject({
        method: 'POST',
        url: `/crowds/${randomUuid()}/join`,
        payload: { crowdUserId: randomUuid() },
      });

      expect(joinResponse.statusCode).toBe(404);
      expect(joinResponse.json().error).toBe('Crowd not found');
    });

    it('should increment memberCount after join', async () => {
      const ownerId = randomUuid();
      const joinerId = randomUuid();

      const createResponse = await app.inject({
        method: 'POST',
        url: '/crowds',
        payload: validCrowd({ crowdUserId: ownerId, isOpen: true }),
      });
      const crowdId = createResponse.json().id;

      const before = (await lookupFor(app, [ownerId])).json();
      expect(before[0].memberCount).toBe(1);

      await app.inject({
        method: 'POST',
        url: `/crowds/${crowdId}/join`,
        payload: { crowdUserId: joinerId },
      });

      const after = (await lookupFor(app, [ownerId])).json();
      expect(after[0].memberCount).toBe(2);
    });
  });

  describe('POST /crowds/:id/leave', () => {
    it('should leave crowd successfully', async () => {
      const ownerId = randomUuid();
      const memberId = randomUuid();

      const createResponse = await app.inject({
        method: 'POST',
        url: '/crowds',
        payload: validCrowd({ crowdUserId: ownerId, isOpen: true }),
      });
      const crowdId = createResponse.json().id;

      await app.inject({
        method: 'POST',
        url: `/crowds/${crowdId}/join`,
        payload: { crowdUserId: memberId },
      });

      expect((await lookupFor(app, [memberId])).json().length).toBe(1);

      const leaveResponse = await app.inject({
        method: 'POST',
        url: `/crowds/${crowdId}/leave`,
        payload: { crowdUserId: memberId },
      });

      expect(leaveResponse.statusCode).toBe(200);
      expect(leaveResponse.json().status).toBe('ok');

      expect((await lookupFor(app, [memberId])).json().length).toBe(0);
    });

    it('should be idempotent for non-member', async () => {
      const ownerId = randomUuid();
      const nonMemberId = randomUuid();

      const createResponse = await app.inject({
        method: 'POST',
        url: '/crowds',
        payload: validCrowd({ crowdUserId: ownerId, isOpen: true }),
      });
      const crowdId = createResponse.json().id;

      const leaveResponse = await app.inject({
        method: 'POST',
        url: `/crowds/${crowdId}/leave`,
        payload: { crowdUserId: nonMemberId },
      });

      expect(leaveResponse.statusCode).toBe(200);
      expect(leaveResponse.json().status).toBe('ok');
    });

    it('should decrement memberCount after leave', async () => {
      const ownerId = randomUuid();
      const memberId = randomUuid();

      const createResponse = await app.inject({
        method: 'POST',
        url: '/crowds',
        payload: validCrowd({ crowdUserId: ownerId, isOpen: true }),
      });
      const crowdId = createResponse.json().id;

      await app.inject({
        method: 'POST',
        url: `/crowds/${crowdId}/join`,
        payload: { crowdUserId: memberId },
      });

      expect((await lookupFor(app, [ownerId])).json()[0].memberCount).toBe(2);

      await app.inject({
        method: 'POST',
        url: `/crowds/${crowdId}/leave`,
        payload: { crowdUserId: memberId },
      });

      expect((await lookupFor(app, [ownerId])).json()[0].memberCount).toBe(1);
    });
  });

  describe('Proximity tokens', () => {
    const mintToken = async (ownerId: string, isOpen = false) => {
      const create = await app.inject({
        method: 'POST',
        url: '/crowds',
        payload: validCrowd({ crowdUserId: ownerId, isOpen }),
      });
      const crowdId = create.json().id;
      const tokenRes = await app.inject({
        method: 'POST',
        url: `/crowds/${crowdId}/proximity-token`,
        payload: { crowdUserId: ownerId },
      });
      return { crowdId, response: tokenRes };
    };

    it('owner can mint a proximity token', async () => {
      const ownerId = randomUuid();
      const { response } = await mintToken(ownerId);
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(typeof body.token).toBe('string');
      expect(body.token.length).toBeGreaterThanOrEqual(32);
      expect(new Date(body.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it('non-owner cannot mint a proximity token', async () => {
      const ownerId = randomUuid();
      const intruderId = randomUuid();
      const create = await app.inject({
        method: 'POST',
        url: '/crowds',
        payload: validCrowd({ crowdUserId: ownerId }),
      });
      const crowdId = create.json().id;
      const res = await app.inject({
        method: 'POST',
        url: `/crowds/${crowdId}/proximity-token`,
        payload: { crowdUserId: intruderId },
      });
      expect(res.statusCode).toBe(403);
    });

    it('lookup returns crowd metadata without consuming the token', async () => {
      const ownerId = randomUuid();
      const { response } = await mintToken(ownerId, false);
      const { token } = response.json();

      const first = await app.inject({
        method: 'POST',
        url: '/crowds/lookup-token',
        payload: { token },
      });
      expect(first.statusCode).toBe(200);
      expect(first.json().crowd.isOpen).toBe(false);

      const second = await app.inject({
        method: 'POST',
        url: '/crowds/lookup-token',
        payload: { token },
      });
      expect(second.statusCode).toBe(200);
    });

    it('join-with-token consumes a valid token (single-use)', async () => {
      const ownerId = randomUuid();
      const joinerId = randomUuid();
      const { crowdId, response } = await mintToken(ownerId);
      const { token } = response.json();

      const joinRes = await app.inject({
        method: 'POST',
        url: '/crowds/join-with-token',
        payload: { token, crowdUserId: joinerId },
      });
      expect(joinRes.statusCode).toBe(200);
      expect(joinRes.json().crowd.id).toBe(crowdId);

      const replay = await app.inject({
        method: 'POST',
        url: '/crowds/join-with-token',
        payload: { token, crowdUserId: randomUuid() },
      });
      expect(replay.statusCode).toBe(400);
      expect(replay.json().error).toMatch(/used/i);
    });

    it('rejects an expired token', async () => {
      const ownerId = randomUuid();
      const { response } = await mintToken(ownerId);
      const { token } = response.json();

      // Backdate the token's expiry directly in the test DB so we can
      // exercise the expiration branch without sleeping the suite.
      const pool = new Pool({ connectionString: getConnectionString()! });
      try {
        await pool.query(
          `UPDATE proximity_tokens SET expires_at = NOW() - INTERVAL '1 minute' WHERE token = $1`,
          [token],
        );
      } finally {
        await pool.end();
      }

      const lookup = await app.inject({
        method: 'POST',
        url: '/crowds/lookup-token',
        payload: { token },
      });
      expect(lookup.statusCode).toBe(400);
      expect(lookup.json().error).toMatch(/expired/i);

      const join = await app.inject({
        method: 'POST',
        url: '/crowds/join-with-token',
        payload: { token, crowdUserId: randomUuid() },
      });
      expect(join.statusCode).toBe(400);
    });

    it('rejects an unknown token', async () => {
      const join = await app.inject({
        method: 'POST',
        url: '/crowds/join-with-token',
        payload: { token: 'a'.repeat(43), crowdUserId: randomUuid() },
      });
      expect(join.statusCode).toBe(404);
      expect(join.json().error).toMatch(/invalid/i);
    });

    it('rejects malformed token payloads at the schema layer', async () => {
      const join = await app.inject({
        method: 'POST',
        url: '/crowds/join-with-token',
        payload: { token: 'short', crowdUserId: randomUuid() },
      });
      expect(join.statusCode).toBe(500);
    });
  });
});
