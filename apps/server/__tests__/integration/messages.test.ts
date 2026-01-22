import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { setupTestDb, teardownTestDb, clearTables, getConnectionString } from '../helpers/testDb';
import { createTestApp } from '../helpers/createApp';
import { validMessage, validBoost, portlandLocation, seattleLocation, randomUuid } from '../helpers/fixtures';

describe('Messages API', () => {
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

  describe('POST /messages', () => {
    it('should create message and return UUID', async () => {
      const message = validMessage();
      const response = await app.inject({
        method: 'POST',
        url: '/messages',
        payload: message,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.id).toBeDefined();
      expect(body.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('should reject empty text', async () => {
      const message = validMessage({ text: '' });
      const response = await app.inject({
        method: 'POST',
        url: '/messages',
        payload: message,
      });

      expect(response.statusCode).toBe(500); // Zod validation error
    });

    it('should reject invalid coordinates - latitude out of range', async () => {
      const message = validMessage({ latitude: 91 });
      const response = await app.inject({
        method: 'POST',
        url: '/messages',
        payload: message,
      });

      expect(response.statusCode).toBe(500);
    });

    it('should reject invalid coordinates - longitude out of range', async () => {
      const message = validMessage({ longitude: 181 });
      const response = await app.inject({
        method: 'POST',
        url: '/messages',
        payload: message,
      });

      expect(response.statusCode).toBe(500);
    });

    it('should set correct expiresAt based on activeMinutes', async () => {
      const message = validMessage({ activeMinutes: 60 });
      const beforeCreate = new Date();

      const response = await app.inject({
        method: 'POST',
        url: '/messages',
        payload: message,
      });

      expect(response.statusCode).toBe(200);

      // Verify by fetching the feed
      const feedResponse = await app.inject({
        method: 'GET',
        url: `/messages/feed?latitude=${message.latitude}&longitude=${message.longitude}&userId=${message.userId}`,
      });

      const feed = feedResponse.json();
      expect(feed.length).toBe(1);

      const expiresAt = new Date(feed[0].expiresAt);
      const expectedExpiry = new Date(beforeCreate.getTime() + 60 * 60000);

      // Allow 5 second tolerance
      expect(Math.abs(expiresAt.getTime() - expectedExpiry.getTime())).toBeLessThan(5000);
    });

    describe('with crowdId', () => {
      it('should create message with crowdId when user is member', async () => {
        const userId = randomUuid();

        // Create a crowd first
        const crowdResponse = await app.inject({
          method: 'POST',
          url: '/crowds',
          payload: { name: 'Test Crowd', userId, isOpen: true },
        });
        const crowdId = crowdResponse.json().id;

        // Create message in crowd
        const message = validMessage({ userId, crowdId });
        const response = await app.inject({
          method: 'POST',
          url: '/messages',
          payload: message,
        });

        expect(response.statusCode).toBe(200);
        expect(response.json().id).toBeDefined();
      });

      it('should reject message with crowdId when user is not member', async () => {
        const ownerId = randomUuid();
        const otherUserId = randomUuid();

        // Create a crowd
        const crowdResponse = await app.inject({
          method: 'POST',
          url: '/crowds',
          payload: { name: 'Test Crowd', userId: ownerId, isOpen: true },
        });
        const crowdId = crowdResponse.json().id;

        // Try to create message as non-member
        const message = validMessage({ userId: otherUserId, crowdId });
        const response = await app.inject({
          method: 'POST',
          url: '/messages',
          payload: message,
        });

        expect(response.statusCode).toBe(403);
        expect(response.json().error).toBe('Not a member of this crowd');
      });
    });
  });

  describe('GET /messages/feed', () => {
    it('should return messages within radius', async () => {
      const userId = randomUuid();
      const message = validMessage({
        userId,
        radiusMeters: 10000, // 10km radius
        ...portlandLocation,
      });

      // Create message
      await app.inject({
        method: 'POST',
        url: '/messages',
        payload: message,
      });

      // Fetch feed from same location
      const feedResponse = await app.inject({
        method: 'GET',
        url: `/messages/feed?latitude=${portlandLocation.latitude}&longitude=${portlandLocation.longitude}&userId=${userId}`,
      });

      expect(feedResponse.statusCode).toBe(200);
      const feed = feedResponse.json();
      expect(feed.length).toBe(1);
      expect(feed[0].text).toBe(message.text);
    });

    it('should exclude messages outside radius', async () => {
      const userId = randomUuid();
      const message = validMessage({
        userId,
        radiusMeters: 1000, // 1km radius
        ...portlandLocation,
      });

      // Create message in Portland
      await app.inject({
        method: 'POST',
        url: '/messages',
        payload: message,
      });

      // Fetch feed from Seattle (233km away)
      const feedResponse = await app.inject({
        method: 'GET',
        url: `/messages/feed?latitude=${seattleLocation.latitude}&longitude=${seattleLocation.longitude}&userId=${userId}`,
      });

      const feed = feedResponse.json();
      expect(feed.length).toBe(0);
    });

    it('should calculate Haversine distance correctly', async () => {
      const userId = randomUuid();
      const message = validMessage({
        userId,
        radiusMeters: 100000, // 100km - we'll query from a closer location
        latitude: portlandLocation.latitude,
        longitude: portlandLocation.longitude,
      });

      await app.inject({
        method: 'POST',
        url: '/messages',
        payload: message,
      });

      // Query from a location 50km away (within radius)
      const queryLat = portlandLocation.latitude + 0.45; // ~50km north
      const feedResponse = await app.inject({
        method: 'GET',
        url: `/messages/feed?latitude=${queryLat}&longitude=${portlandLocation.longitude}&userId=${userId}`,
      });

      const feed = feedResponse.json();
      expect(feed.length).toBe(1);

      // Distance should be approximately 50km
      expect(feed[0].distance).toBeGreaterThan(45000);
      expect(feed[0].distance).toBeLessThan(55000);
    });

    it('should sort by nearest by default', async () => {
      const userId = randomUuid();

      // Create a close message
      await app.inject({
        method: 'POST',
        url: '/messages',
        payload: validMessage({
          userId,
          text: 'Close message',
          latitude: portlandLocation.latitude + 0.001,
          longitude: portlandLocation.longitude,
          radiusMeters: 10000,
        }),
      });

      // Create a far message
      await app.inject({
        method: 'POST',
        url: '/messages',
        payload: validMessage({
          userId,
          text: 'Far message',
          latitude: portlandLocation.latitude + 0.01,
          longitude: portlandLocation.longitude,
          radiusMeters: 10000,
        }),
      });

      const feedResponse = await app.inject({
        method: 'GET',
        url: `/messages/feed?latitude=${portlandLocation.latitude}&longitude=${portlandLocation.longitude}`,
      });

      const feed = feedResponse.json();
      expect(feed.length).toBe(2);
      expect(feed[0].text).toBe('Close message');
      expect(feed[1].text).toBe('Far message');
    });

    it('should sort by soonest when specified', async () => {
      const userId = randomUuid();

      // Create message expiring later
      await app.inject({
        method: 'POST',
        url: '/messages',
        payload: validMessage({
          userId,
          text: 'Later message',
          activeMinutes: 120,
          radiusMeters: 10000,
        }),
      });

      // Create message expiring sooner
      await app.inject({
        method: 'POST',
        url: '/messages',
        payload: validMessage({
          userId,
          text: 'Sooner message',
          activeMinutes: 30,
          radiusMeters: 10000,
        }),
      });

      const feedResponse = await app.inject({
        method: 'GET',
        url: `/messages/feed?latitude=${portlandLocation.latitude}&longitude=${portlandLocation.longitude}&sortBy=soonest`,
      });

      const feed = feedResponse.json();
      expect(feed.length).toBe(2);
      expect(feed[0].text).toBe('Sooner message');
      expect(feed[1].text).toBe('Later message');
    });

    it('should apply pagination with limit and offset', async () => {
      const userId = randomUuid();

      // Create 5 messages
      for (let i = 0; i < 5; i++) {
        await app.inject({
          method: 'POST',
          url: '/messages',
          payload: validMessage({
            userId,
            text: `Message ${i}`,
            radiusMeters: 10000,
          }),
        });
      }

      // Get first 2
      const response1 = await app.inject({
        method: 'GET',
        url: `/messages/feed?latitude=${portlandLocation.latitude}&longitude=${portlandLocation.longitude}&limit=2&offset=0`,
      });
      expect(response1.json().length).toBe(2);

      // Get next 2
      const response2 = await app.inject({
        method: 'GET',
        url: `/messages/feed?latitude=${portlandLocation.latitude}&longitude=${portlandLocation.longitude}&limit=2&offset=2`,
      });
      expect(response2.json().length).toBe(2);

      // Get last 1
      const response3 = await app.inject({
        method: 'GET',
        url: `/messages/feed?latitude=${portlandLocation.latitude}&longitude=${portlandLocation.longitude}&limit=2&offset=4`,
      });
      expect(response3.json().length).toBe(1);
    });

    it('should include isBoosted flag for user', async () => {
      const ownerId = randomUuid();
      const boosterId = randomUuid();

      // Create message
      const messageResponse = await app.inject({
        method: 'POST',
        url: '/messages',
        payload: validMessage({ userId: ownerId, radiusMeters: 10000 }),
      });
      const messageId = messageResponse.json().id;

      // Boost it
      await app.inject({
        method: 'POST',
        url: `/messages/${messageId}/boost`,
        payload: validBoost({ userId: boosterId }),
      });

      // Check feed for booster
      const feedResponse = await app.inject({
        method: 'GET',
        url: `/messages/feed?latitude=${portlandLocation.latitude}&longitude=${portlandLocation.longitude}&userId=${boosterId}`,
      });

      const feed = feedResponse.json();
      expect(feed[0].isBoosted).toBe(true);

      // Check feed for different user
      const otherFeedResponse = await app.inject({
        method: 'GET',
        url: `/messages/feed?latitude=${portlandLocation.latitude}&longitude=${portlandLocation.longitude}&userId=${randomUuid()}`,
      });

      const otherFeed = otherFeedResponse.json();
      expect(otherFeed[0].isBoosted).toBe(false);
    });

    it('should include isOwner flag for user', async () => {
      const ownerId = randomUuid();

      await app.inject({
        method: 'POST',
        url: '/messages',
        payload: validMessage({ userId: ownerId, radiusMeters: 10000 }),
      });

      // Check as owner
      const ownerFeedResponse = await app.inject({
        method: 'GET',
        url: `/messages/feed?latitude=${portlandLocation.latitude}&longitude=${portlandLocation.longitude}&userId=${ownerId}`,
      });
      expect(ownerFeedResponse.json()[0].isOwner).toBe(true);

      // Check as other user
      const otherFeedResponse = await app.inject({
        method: 'GET',
        url: `/messages/feed?latitude=${portlandLocation.latitude}&longitude=${portlandLocation.longitude}&userId=${randomUuid()}`,
      });
      expect(otherFeedResponse.json()[0].isOwner).toBe(false);
    });

    it('should return only global messages when no crowdId specified', async () => {
      const userId = randomUuid();

      // Create a crowd and message in it
      const crowdResponse = await app.inject({
        method: 'POST',
        url: '/crowds',
        payload: { name: 'Test Crowd', userId, isOpen: true },
      });
      const crowdId = crowdResponse.json().id;

      await app.inject({
        method: 'POST',
        url: '/messages',
        payload: validMessage({ userId, crowdId, text: 'Crowd message', radiusMeters: 10000 }),
      });

      // Create global message
      await app.inject({
        method: 'POST',
        url: '/messages',
        payload: validMessage({ userId, text: 'Global message', radiusMeters: 10000 }),
      });

      // Fetch global feed (no crowdId)
      const feedResponse = await app.inject({
        method: 'GET',
        url: `/messages/feed?latitude=${portlandLocation.latitude}&longitude=${portlandLocation.longitude}&userId=${userId}`,
      });

      const feed = feedResponse.json();
      expect(feed.length).toBe(1);
      expect(feed[0].text).toBe('Global message');
    });

    it('should filter by crowdId', async () => {
      const userId = randomUuid();

      // Create a crowd and message in it
      const crowdResponse = await app.inject({
        method: 'POST',
        url: '/crowds',
        payload: { name: 'Test Crowd', userId, isOpen: true },
      });
      const crowdId = crowdResponse.json().id;

      await app.inject({
        method: 'POST',
        url: '/messages',
        payload: validMessage({ userId, crowdId, text: 'Crowd message', radiusMeters: 10000 }),
      });

      // Create global message
      await app.inject({
        method: 'POST',
        url: '/messages',
        payload: validMessage({ userId, text: 'Global message', radiusMeters: 10000 }),
      });

      // Fetch crowd feed
      const feedResponse = await app.inject({
        method: 'GET',
        url: `/messages/feed?latitude=${portlandLocation.latitude}&longitude=${portlandLocation.longitude}&userId=${userId}&crowdId=${crowdId}`,
      });

      const feed = feedResponse.json();
      expect(feed.length).toBe(1);
      expect(feed[0].text).toBe('Crowd message');
    });
  });

  describe('POST /messages/:id/boost', () => {
    it('should boost successfully and increment count', async () => {
      const ownerId = randomUuid();
      const boosterId = randomUuid();

      // Create message
      const messageResponse = await app.inject({
        method: 'POST',
        url: '/messages',
        payload: validMessage({ userId: ownerId, radiusMeters: 10000 }),
      });
      const messageId = messageResponse.json().id;

      // Boost
      const boostResponse = await app.inject({
        method: 'POST',
        url: `/messages/${messageId}/boost`,
        payload: validBoost({ userId: boosterId }),
      });

      expect(boostResponse.statusCode).toBe(200);
      expect(boostResponse.json().status).toBe('ok');

      // Verify boost count
      const feedResponse = await app.inject({
        method: 'GET',
        url: `/messages/feed?latitude=${portlandLocation.latitude}&longitude=${portlandLocation.longitude}`,
      });

      expect(feedResponse.json()[0].boostCount).toBe(1);
    });

    it('should reject self-boost', async () => {
      const ownerId = randomUuid();

      // Create message
      const messageResponse = await app.inject({
        method: 'POST',
        url: '/messages',
        payload: validMessage({ userId: ownerId, radiusMeters: 10000 }),
      });
      const messageId = messageResponse.json().id;

      // Try to self-boost
      const boostResponse = await app.inject({
        method: 'POST',
        url: `/messages/${messageId}/boost`,
        payload: validBoost({ userId: ownerId }),
      });

      expect(boostResponse.statusCode).toBe(400);
      expect(boostResponse.json().error).toBe('Cannot boost your own message');
    });

    it('should handle duplicate boost (unique constraint)', async () => {
      const ownerId = randomUuid();
      const boosterId = randomUuid();

      // Create message
      const messageResponse = await app.inject({
        method: 'POST',
        url: '/messages',
        payload: validMessage({ userId: ownerId, radiusMeters: 10000 }),
      });
      const messageId = messageResponse.json().id;

      // First boost
      await app.inject({
        method: 'POST',
        url: `/messages/${messageId}/boost`,
        payload: validBoost({ userId: boosterId }),
      });

      // Duplicate boost - should fail (400 or 500 depending on error handling)
      const duplicateResponse = await app.inject({
        method: 'POST',
        url: `/messages/${messageId}/boost`,
        payload: validBoost({ userId: boosterId }),
      });

      // Verify it's not successful (either 400 if caught or 500 if not)
      expect(duplicateResponse.statusCode).toBeGreaterThanOrEqual(400);
      expect(duplicateResponse.statusCode).toBeLessThan(600);

      // Verify boost count didn't increase
      const feedResponse = await app.inject({
        method: 'GET',
        url: `/messages/feed?latitude=${portlandLocation.latitude}&longitude=${portlandLocation.longitude}`,
      });
      expect(feedResponse.json()[0].boostCount).toBe(1);
    });

    it('should return 404 for non-existent message', async () => {
      const boostResponse = await app.inject({
        method: 'POST',
        url: `/messages/${randomUuid()}/boost`,
        payload: validBoost(),
      });

      expect(boostResponse.statusCode).toBe(404);
      expect(boostResponse.json().error).toBe('Message not found');
    });

    it('should affect effective distance in feed when boosted from closer location', async () => {
      const ownerId = randomUuid();
      const boosterId = randomUuid();
      const viewerId = randomUuid();

      // Create message at location A with small radius
      const messageResponse = await app.inject({
        method: 'POST',
        url: '/messages',
        payload: validMessage({
          userId: ownerId,
          radiusMeters: 5000, // 5km radius
          latitude: portlandLocation.latitude,
          longitude: portlandLocation.longitude,
        }),
      });
      const messageId = messageResponse.json().id;

      // Viewer is 6km away (outside original radius)
      const viewerLat = portlandLocation.latitude + 0.055; // ~6km north

      // Should not see message initially
      const beforeBoostResponse = await app.inject({
        method: 'GET',
        url: `/messages/feed?latitude=${viewerLat}&longitude=${portlandLocation.longitude}&userId=${viewerId}`,
      });
      expect(beforeBoostResponse.json().length).toBe(0);

      // Boost from closer to viewer (4km from viewer)
      const boostLat = viewerLat - 0.036; // ~4km south of viewer
      await app.inject({
        method: 'POST',
        url: `/messages/${messageId}/boost`,
        payload: validBoost({
          userId: boosterId,
          latitude: boostLat,
          longitude: portlandLocation.longitude,
        }),
      });

      // Now viewer should see message (within 5km of boost location)
      const afterBoostResponse = await app.inject({
        method: 'GET',
        url: `/messages/feed?latitude=${viewerLat}&longitude=${portlandLocation.longitude}&userId=${viewerId}`,
      });
      expect(afterBoostResponse.json().length).toBe(1);
    });
  });
});
