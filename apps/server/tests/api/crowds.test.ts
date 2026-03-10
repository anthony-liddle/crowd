import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../../src/app';
import { resetTestDb, getTestDb } from '../helpers/db';
import { crowds, crowdMemberships } from '../../src/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

describe('Crowds API', () => {
  const app = buildApp();
  let userId: string;

  beforeEach(async () => {
    await resetTestDb();
    userId = randomUUID();
  });

  describe('POST /crowds', () => {
    it('should create a new crowd', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/crowds',
        payload: {
          name: 'Test Crowd',
          isOpen: true,
          userId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('id');
      expect(typeof body.id).toBe('string');
    });

    it('should auto-add creator as member', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/crowds',
        payload: {
          name: 'Test Crowd',
          isOpen: true,
          userId,
        },
      });

      const body = JSON.parse(response.body);
      const crowdId = body.id;

      // Verify membership
      const db = getTestDb();
      const [membership] = await db.select()
        .from(crowdMemberships)
        .where(eq(crowdMemberships.crowdId, crowdId));

      expect(membership).toBeDefined();
      expect(membership.userId).toBe(userId);
    });

    it('should set expiration to 24 hours', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/crowds',
        payload: {
          name: 'Test Crowd',
          isOpen: true,
          userId,
        },
      });

      const body = JSON.parse(response.body);
      const crowdId = body.id;

      const db = getTestDb();
      const [crowd] = await db.select()
        .from(crowds)
        .where(eq(crowds.id, crowdId));

      expect(crowd).toBeDefined();
      const expiresAt = new Date(crowd.expiresAt);
      const createdAt = new Date(crowd.createdAt);
      const diff = expiresAt.getTime() - createdAt.getTime();
      const hours = diff / (1000 * 60 * 60);
      expect(hours).toBeCloseTo(24, 0);
    });

    it('should reject invalid payload', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/crowds',
        payload: {
          name: '', // Invalid: empty string
          isOpen: true,
          userId,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /crowds', () => {
    let crowdId: string;

    beforeEach(async () => {
      const db = getTestDb();
      const [crowd] = await db.insert(crowds).values({
        name: 'Test Crowd',
        ownerId: userId,
        isOpen: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }).returning({ id: crowds.id });
      crowdId = crowd.id;
      await db.insert(crowdMemberships).values({
        crowdId: crowd.id,
        userId,
      });
    });

    it('should return user crowds', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/crowds',
        query: {
          userId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
      expect(body[0]).toHaveProperty('id');
      expect(body[0]).toHaveProperty('name');
      expect(body[0]).toHaveProperty('memberCount');
      expect(body[0]).toHaveProperty('isOwner');
    });

    it('should not return expired crowds', async () => {
      const db = getTestDb();
      // Create expired crowd
      const [expiredCrowd] = await db.insert(crowds).values({
        name: 'Expired Crowd',
        ownerId: userId,
        isOpen: true,
        expiresAt: new Date(Date.now() - 1000), // Expired
      }).returning({ id: crowds.id });
      await db.insert(crowdMemberships).values({
        crowdId: expiredCrowd.id,
        userId,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/crowds',
        query: {
          userId,
        },
      });

      const body = JSON.parse(response.body);
      const expiredIds = body.map((c: any) => c.id);
      expect(expiredIds).not.toContain(expiredCrowd.id);
    });

    it('should return correct member count', async () => {
      const db = getTestDb();
      const otherUserId = randomUUID();
      await db.insert(crowdMemberships).values({
        crowdId,
        userId: otherUserId,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/crowds',
        query: {
          userId,
        },
      });

      const body = JSON.parse(response.body);
      const crowd = body.find((c: any) => c.id === crowdId);
      expect(crowd.memberCount).toBe(2);
    });
  });

  describe('POST /crowds/:id/join', () => {
    let crowdId: string;
    let ownerId: string;

    beforeEach(async () => {
      ownerId = randomUUID();
      const db = getTestDb();
      const [crowd] = await db.insert(crowds).values({
        name: 'Open Crowd',
        ownerId,
        isOpen: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }).returning({ id: crowds.id });
      crowdId = crowd.id;
    });

    it('should allow joining an open crowd', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/crowds/${crowdId}/join`,
        payload: {
          userId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toEqual({ status: 'ok' });

      // Verify membership
      const db = getTestDb();
      const [membership] = await db.select()
        .from(crowdMemberships)
        .where(eq(crowdMemberships.crowdId, crowdId));

      expect(membership).toBeDefined();
      expect(membership.userId).toBe(userId);
    });

    it('should reject joining closed crowd', async () => {
      const db = getTestDb();
      const [closedCrowd] = await db.insert(crowds).values({
        name: 'Closed Crowd',
        ownerId,
        isOpen: false,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }).returning({ id: crowds.id });

      const response = await app.inject({
        method: 'POST',
        url: `/crowds/${closedCrowd.id}/join`,
        payload: {
          userId,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Crowd is closed');
    });

    it('should reject joining expired crowd', async () => {
      const db = getTestDb();
      const [expiredCrowd] = await db.insert(crowds).values({
        name: 'Expired Crowd',
        ownerId,
        isOpen: true,
        expiresAt: new Date(Date.now() - 1000), // Expired
      }).returning({ id: crowds.id });

      const response = await app.inject({
        method: 'POST',
        url: `/crowds/${expiredCrowd.id}/join`,
        payload: {
          userId,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Crowd expired');
    });

    it('should reject duplicate membership', async () => {
      const db = getTestDb();
      await db.insert(crowdMemberships).values({
        crowdId,
        userId,
      });

      const response = await app.inject({
        method: 'POST',
        url: `/crowds/${crowdId}/join`,
        payload: {
          userId,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Already a member');
    });
  });

  describe('POST /crowds/:id/leave', () => {
    let crowdId: string;

    beforeEach(async () => {
      const db = getTestDb();
      const [crowd] = await db.insert(crowds).values({
        name: 'Test Crowd',
        ownerId: userId,
        isOpen: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }).returning({ id: crowds.id });
      crowdId = crowd.id;
      await db.insert(crowdMemberships).values({
        crowdId,
        userId,
      });
    });

    it('should allow leaving a crowd', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/crowds/${crowdId}/leave`,
        payload: {
          userId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toEqual({ status: 'ok' });

      // Verify membership removed
      const db = getTestDb();
      const [membership] = await db.select()
        .from(crowdMemberships)
        .where(eq(crowdMemberships.crowdId, crowdId));

      expect(membership).toBeUndefined();
    });
  });
});
