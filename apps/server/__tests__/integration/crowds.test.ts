import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { setupTestDb, teardownTestDb, clearTables, getConnectionString } from '../helpers/testDb';
import { createTestApp } from '../helpers/createApp';
import { validCrowd, randomUuid } from '../helpers/fixtures';
import { Pool } from 'pg';

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

    it('should auto-add creator as member', async () => {
      const userId = randomUuid();
      const crowd = validCrowd({ userId });

      const createResponse = await app.inject({
        method: 'POST',
        url: '/crowds',
        payload: crowd,
      });

      const crowdId = createResponse.json().id;

      // Get crowds for user
      const listResponse = await app.inject({
        method: 'GET',
        url: `/crowds?userId=${userId}`,
      });

      const crowds = listResponse.json();
      expect(crowds.length).toBe(1);
      expect(crowds[0].id).toBe(crowdId);
    });

    it('should set 24h expiration', async () => {
      const beforeCreate = new Date();
      const crowd = validCrowd();

      const response = await app.inject({
        method: 'POST',
        url: '/crowds',
        payload: crowd,
      });

      // Get crowd details
      const listResponse = await app.inject({
        method: 'GET',
        url: `/crowds?userId=${crowd.userId}`,
      });

      const crowds = listResponse.json();
      const expiresAt = new Date(crowds[0].expiresAt);
      const expectedExpiry = new Date(beforeCreate.getTime() + 24 * 60 * 60 * 1000);

      // Allow 5 second tolerance
      expect(Math.abs(expiresAt.getTime() - expectedExpiry.getTime())).toBeLessThan(5000);
    });

    it('should set creator as owner (isOwner=true)', async () => {
      const userId = randomUuid();
      const crowd = validCrowd({ userId });

      await app.inject({
        method: 'POST',
        url: '/crowds',
        payload: crowd,
      });

      const listResponse = await app.inject({
        method: 'GET',
        url: `/crowds?userId=${userId}`,
      });

      const crowds = listResponse.json();
      expect(crowds[0].isOwner).toBe(true);
    });
  });

  describe('GET /crowds', () => {
    it('should return user crowds with memberCount', async () => {
      const userId = randomUuid();

      await app.inject({
        method: 'POST',
        url: '/crowds',
        payload: validCrowd({ userId, name: 'Crowd 1' }),
      });

      await app.inject({
        method: 'POST',
        url: '/crowds',
        payload: validCrowd({ userId, name: 'Crowd 2' }),
      });

      const listResponse = await app.inject({
        method: 'GET',
        url: `/crowds?userId=${userId}`,
      });

      const crowds = listResponse.json();
      expect(crowds.length).toBe(2);
      crowds.forEach((crowd: any) => {
        expect(crowd.memberCount).toBeDefined();
        expect(crowd.memberCount).toBe(1); // Only creator
      });
    });

    it('should include canInvite flag', async () => {
      const userId = randomUuid();

      // Open crowd
      await app.inject({
        method: 'POST',
        url: '/crowds',
        payload: validCrowd({ userId, name: 'Open Crowd', isOpen: true }),
      });

      // Closed crowd
      await app.inject({
        method: 'POST',
        url: '/crowds',
        payload: validCrowd({ userId, name: 'Closed Crowd', isOpen: false }),
      });

      const listResponse = await app.inject({
        method: 'GET',
        url: `/crowds?userId=${userId}`,
      });

      const crowds = listResponse.json();
      const openCrowd = crowds.find((c: any) => c.name === 'Open Crowd');
      const closedCrowd = crowds.find((c: any) => c.name === 'Closed Crowd');

      // Owner can always invite
      expect(openCrowd.canInvite).toBe(true);
      expect(closedCrowd.canInvite).toBe(true);
    });

    it('should not return crowds where user is not a member', async () => {
      const user1 = randomUuid();
      const user2 = randomUuid();

      await app.inject({
        method: 'POST',
        url: '/crowds',
        payload: validCrowd({ userId: user1, name: 'User1 Crowd' }),
      });

      const listResponse = await app.inject({
        method: 'GET',
        url: `/crowds?userId=${user2}`,
      });

      const crowds = listResponse.json();
      expect(crowds.length).toBe(0);
    });
  });

  describe('POST /crowds/:id/join', () => {
    it('should join open crowd successfully', async () => {
      const ownerId = randomUuid();
      const joinerId = randomUuid();

      const createResponse = await app.inject({
        method: 'POST',
        url: '/crowds',
        payload: validCrowd({ userId: ownerId, isOpen: true }),
      });
      const crowdId = createResponse.json().id;

      const joinResponse = await app.inject({
        method: 'POST',
        url: `/crowds/${crowdId}/join`,
        payload: { userId: joinerId },
      });

      expect(joinResponse.statusCode).toBe(200);
      expect(joinResponse.json().status).toBe('ok');

      // Verify membership
      const listResponse = await app.inject({
        method: 'GET',
        url: `/crowds?userId=${joinerId}`,
      });

      const crowds = listResponse.json();
      expect(crowds.length).toBe(1);
      expect(crowds[0].id).toBe(crowdId);
    });

    it('should reject joining closed crowd', async () => {
      const ownerId = randomUuid();
      const joinerId = randomUuid();

      const createResponse = await app.inject({
        method: 'POST',
        url: '/crowds',
        payload: validCrowd({ userId: ownerId, isOpen: false }),
      });
      const crowdId = createResponse.json().id;

      const joinResponse = await app.inject({
        method: 'POST',
        url: `/crowds/${crowdId}/join`,
        payload: { userId: joinerId },
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
        payload: validCrowd({ userId: ownerId, isOpen: true }),
      });
      const crowdId = createResponse.json().id;

      // First join
      await app.inject({
        method: 'POST',
        url: `/crowds/${crowdId}/join`,
        payload: { userId: joinerId },
      });

      // Duplicate join - should fail (400 or 500 depending on error handling)
      const duplicateResponse = await app.inject({
        method: 'POST',
        url: `/crowds/${crowdId}/join`,
        payload: { userId: joinerId },
      });

      // Verify it's not successful (either 400 if caught or 500 if not)
      expect(duplicateResponse.statusCode).toBeGreaterThanOrEqual(400);
      expect(duplicateResponse.statusCode).toBeLessThan(600);

      // Verify member count didn't change (still 2: owner + joiner)
      const listResponse = await app.inject({
        method: 'GET',
        url: `/crowds?userId=${ownerId}`,
      });
      expect(listResponse.json()[0].memberCount).toBe(2);
    });

    it('should return 404 for non-existent crowd', async () => {
      const joinResponse = await app.inject({
        method: 'POST',
        url: `/crowds/${randomUuid()}/join`,
        payload: { userId: randomUuid() },
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
        payload: validCrowd({ userId: ownerId, isOpen: true }),
      });
      const crowdId = createResponse.json().id;

      // Check initial count
      const beforeResponse = await app.inject({
        method: 'GET',
        url: `/crowds?userId=${ownerId}`,
      });
      expect(beforeResponse.json()[0].memberCount).toBe(1);

      // Join
      await app.inject({
        method: 'POST',
        url: `/crowds/${crowdId}/join`,
        payload: { userId: joinerId },
      });

      // Check updated count
      const afterResponse = await app.inject({
        method: 'GET',
        url: `/crowds?userId=${ownerId}`,
      });
      expect(afterResponse.json()[0].memberCount).toBe(2);
    });
  });

  describe('POST /crowds/:id/leave', () => {
    it('should leave crowd successfully', async () => {
      const ownerId = randomUuid();
      const memberId = randomUuid();

      const createResponse = await app.inject({
        method: 'POST',
        url: '/crowds',
        payload: validCrowd({ userId: ownerId, isOpen: true }),
      });
      const crowdId = createResponse.json().id;

      // Join
      await app.inject({
        method: 'POST',
        url: `/crowds/${crowdId}/join`,
        payload: { userId: memberId },
      });

      // Verify membership
      const beforeLeaveResponse = await app.inject({
        method: 'GET',
        url: `/crowds?userId=${memberId}`,
      });
      expect(beforeLeaveResponse.json().length).toBe(1);

      // Leave
      const leaveResponse = await app.inject({
        method: 'POST',
        url: `/crowds/${crowdId}/leave`,
        payload: { userId: memberId },
      });

      expect(leaveResponse.statusCode).toBe(200);
      expect(leaveResponse.json().status).toBe('ok');

      // Verify no longer member
      const afterLeaveResponse = await app.inject({
        method: 'GET',
        url: `/crowds?userId=${memberId}`,
      });
      expect(afterLeaveResponse.json().length).toBe(0);
    });

    it('should be idempotent for non-member', async () => {
      const ownerId = randomUuid();
      const nonMemberId = randomUuid();

      const createResponse = await app.inject({
        method: 'POST',
        url: '/crowds',
        payload: validCrowd({ userId: ownerId, isOpen: true }),
      });
      const crowdId = createResponse.json().id;

      // Leave without being a member
      const leaveResponse = await app.inject({
        method: 'POST',
        url: `/crowds/${crowdId}/leave`,
        payload: { userId: nonMemberId },
      });

      expect(leaveResponse.statusCode).toBe(200);
      expect(leaveResponse.json().status).toBe('ok');
    });

  });

  describe('Proximity tokens', () => {
    const mintToken = async (ownerId: string, isOpen = false) => {
      const create = await app.inject({
        method: 'POST',
        url: '/crowds',
        payload: validCrowd({ userId: ownerId, isOpen }),
      });
      const crowdId = create.json().id;
      const tokenRes = await app.inject({
        method: 'POST',
        url: `/crowds/${crowdId}/proximity-token`,
        payload: { userId: ownerId },
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
        payload: validCrowd({ userId: ownerId }),
      });
      const crowdId = create.json().id;
      const res = await app.inject({
        method: 'POST',
        url: `/crowds/${crowdId}/proximity-token`,
        payload: { userId: intruderId },
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

      // Lookup is idempotent — token still usable.
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
        payload: { token, userId: joinerId },
      });
      expect(joinRes.statusCode).toBe(200);
      expect(joinRes.json().crowd.id).toBe(crowdId);

      // Reusing the token must fail.
      const replay = await app.inject({
        method: 'POST',
        url: '/crowds/join-with-token',
        payload: { token, userId: randomUuid() },
      });
      expect(replay.statusCode).toBe(400);
      expect(replay.json().error).toMatch(/used/i);
    });

    it('rejects an expired token', async () => {
      const ownerId = randomUuid();
      const { response } = await mintToken(ownerId);
      const { token } = response.json();

      // Reach into the test DB to backdate the token's expiry — emulating
      // the 5-minute TTL elapsing without sleeping the suite.
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
        payload: { token, userId: randomUuid() },
      });
      expect(join.statusCode).toBe(400);
    });

    it('rejects an unknown token', async () => {
      const join = await app.inject({
        method: 'POST',
        url: '/crowds/join-with-token',
        payload: { token: 'a'.repeat(43), userId: randomUuid() },
      });
      expect(join.statusCode).toBe(404);
      expect(join.json().error).toMatch(/invalid/i);
    });

    it('rejects malformed token payloads at the schema layer', async () => {
      const join = await app.inject({
        method: 'POST',
        url: '/crowds/join-with-token',
        payload: { token: 'short', userId: randomUuid() },
      });
      expect(join.statusCode).toBe(500); // ZodError surfaced as 500 by current handler
    });
  });

  describe('POST /crowds/:id/leave (cont.)', () => {
    it('should decrement memberCount after leave', async () => {
      const ownerId = randomUuid();
      const memberId = randomUuid();

      const createResponse = await app.inject({
        method: 'POST',
        url: '/crowds',
        payload: validCrowd({ userId: ownerId, isOpen: true }),
      });
      const crowdId = createResponse.json().id;

      // Join
      await app.inject({
        method: 'POST',
        url: `/crowds/${crowdId}/join`,
        payload: { userId: memberId },
      });

      // Check count = 2
      const beforeResponse = await app.inject({
        method: 'GET',
        url: `/crowds?userId=${ownerId}`,
      });
      expect(beforeResponse.json()[0].memberCount).toBe(2);

      // Leave
      await app.inject({
        method: 'POST',
        url: `/crowds/${crowdId}/leave`,
        payload: { userId: memberId },
      });

      // Check count = 1
      const afterResponse = await app.inject({
        method: 'GET',
        url: `/crowds?userId=${ownerId}`,
      });
      expect(afterResponse.json()[0].memberCount).toBe(1);
    });
  });
});
