import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../../src/app';
import { resetTestDb, getTestDb } from '../helpers/db';
import { messages, crowds, crowdMemberships, messageBoosts } from '../../src/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

describe('Messages API', () => {
  const app = buildApp();
  let userId: string;
  let crowdId: string;

  beforeEach(async () => {
    await resetTestDb();
    userId = randomUUID();
    // Create a test crowd for message tests
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

  describe('POST /messages', () => {
    it('should create a global message', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/messages',
        payload: {
          text: 'Test message',
          latitude: 37.7749,
          longitude: -122.4194,
          radiusMeters: 1000,
          activeMinutes: 60,
          userId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('id');
      expect(typeof body.id).toBe('string');
    });

    it('should create a crowd message', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/messages',
        payload: {
          text: 'Crowd message',
          latitude: 37.7749,
          longitude: -122.4194,
          radiusMeters: 1000,
          activeMinutes: 60,
          userId,
          crowdId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('id');
    });

    it('should reject message for non-member', async () => {
      const otherUserId = randomUUID();
      const response = await app.inject({
        method: 'POST',
        url: '/messages',
        payload: {
          text: 'Unauthorized message',
          latitude: 37.7749,
          longitude: -122.4194,
          radiusMeters: 1000,
          activeMinutes: 60,
          userId: otherUserId,
          crowdId,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should reject invalid payload', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/messages',
        payload: {
          text: '', // Invalid: empty string
          latitude: 37.7749,
          longitude: -122.4194,
          radiusMeters: 1000,
          activeMinutes: 60,
          userId,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /messages/:id/boost', () => {
    let messageId: string;
    let otherUserId: string;

    beforeEach(async () => {
      const db = getTestDb();
      const [message] = await db.insert(messages).values({
        text: 'Test message',
        latitude: '37.7749',
        longitude: '-122.4194',
        radiusMeters: 1000,
        activeMinutes: 60,
        ownerId: userId,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        boostCount: 0,
      }).returning({ id: messages.id });
      messageId = message.id;
      otherUserId = randomUUID();
    });

    it('should boost a message', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/messages/${messageId}/boost`,
        payload: {
          userId: otherUserId,
          latitude: 37.7750,
          longitude: -122.4195,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toEqual({ status: 'ok' });

      // Verify boost count increased
      const db = getTestDb();
      const [updated] = await db.select().from(messages).where(eq(messages.id, messageId));
      expect(updated.boostCount).toBe(1);
    });

    it('should reject boosting own message', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/messages/${messageId}/boost`,
        payload: {
          userId, // Same as owner
          latitude: 37.7750,
          longitude: -122.4195,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Cannot boost your own message');
    });

    it('should reject duplicate boost', async () => {
      const db = getTestDb();
      await db.insert(messageBoosts).values({
        messageId,
        userId: otherUserId,
        latitude: '37.7750',
        longitude: '-122.4195',
      });

      const response = await app.inject({
        method: 'POST',
        url: `/messages/${messageId}/boost`,
        payload: {
          userId: otherUserId,
          latitude: 37.7750,
          longitude: -122.4195,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Already boosted');
    });

    it('should reject boosting expired message', async () => {
      const db = getTestDb();
      const [expiredMessage] = await db.insert(messages).values({
        text: 'Expired message',
        latitude: '37.7749',
        longitude: '-122.4194',
        radiusMeters: 1000,
        activeMinutes: 60,
        ownerId: userId,
        expiresAt: new Date(Date.now() - 1000), // Expired
        boostCount: 0,
      }).returning({ id: messages.id });

      const response = await app.inject({
        method: 'POST',
        url: `/messages/${expiredMessage.id}/boost`,
        payload: {
          userId: otherUserId,
          latitude: 37.7750,
          longitude: -122.4195,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Message expired');
    });
  });

  describe('GET /messages/feed', () => {
    beforeEach(async () => {
      const db = getTestDb();
      // Create messages at different locations
      await db.insert(messages).values([
        {
          text: 'Message 1',
          latitude: '37.7749',
          longitude: '-122.4194',
          radiusMeters: 5000,
          activeMinutes: 60,
          ownerId: userId,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          boostCount: 0,
        },
        {
          text: 'Message 2',
          latitude: '37.7750',
          longitude: '-122.4195',
          radiusMeters: 5000,
          activeMinutes: 60,
          ownerId: userId,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          boostCount: 0,
        },
      ]);
    });

    it('should return nearby messages', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/messages/feed',
        query: {
          latitude: '37.7749',
          longitude: '-122.4194',
          userId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
    });

    it('should filter by crowd', async () => {
      const db = getTestDb();
      // Create a crowd message
      await db.insert(messages).values({
        text: 'Crowd message',
        latitude: '37.7749',
        longitude: '-122.4194',
        radiusMeters: 5000,
        activeMinutes: 60,
        ownerId: userId,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        boostCount: 0,
        crowdId,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/messages/feed',
        query: {
          latitude: '37.7749',
          longitude: '-122.4194',
          userId,
          crowdId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(Array.isArray(body)).toBe(true);
      // All messages should belong to the crowd
      body.forEach((msg: any) => {
        expect(msg.crowdId).toBe(crowdId);
      });
    });

    it('should sort by nearest by default', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/messages/feed',
        query: {
          latitude: '37.7749',
          longitude: '-122.4194',
          userId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      if (body.length > 1) {
        expect(body[0].distance).toBeLessThanOrEqual(body[1].distance);
      }
    });

    it('should sort by soonest when requested', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/messages/feed',
        query: {
          latitude: '37.7749',
          longitude: '-122.4194',
          userId,
          sortBy: 'soonest',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      if (body.length > 1) {
        const firstExpiry = new Date(body[0].expiresAt).getTime();
        const secondExpiry = new Date(body[1].expiresAt).getTime();
        expect(firstExpiry).toBeLessThanOrEqual(secondExpiry);
      }
    });
  });
});
