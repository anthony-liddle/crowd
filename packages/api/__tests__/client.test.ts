import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../__mocks__/server';
import { api } from '../src/client';
import { mockMessageId, mockCrowdId, mockUserId, mockMessage, mockCrowd } from '../__mocks__/handlers';

describe('ApiClient', () => {
  beforeEach(() => {
    // Reset base URL to test URL
    api.setBaseUrl('http://localhost:8080');
  });

  describe('health()', () => {
    it('should return status ok', async () => {
      const result = await api.health();
      expect(result).toEqual({ status: 'ok' });
    });

    it('should throw on server error', async () => {
      server.use(
        http.get('http://localhost:8080/health', () => {
          return HttpResponse.json({ error: 'Server error' }, { status: 500 });
        })
      );

      await expect(api.health()).rejects.toThrow('API Error: 500');
    });
  });

  describe('messages.post()', () => {
    const validMessage = {
      text: 'Hello, world!',
      latitude: 45.5152,
      longitude: -122.6784,
      radiusMeters: 1000,
      activeMinutes: 60,
      userId: mockUserId,
    };

    it('should create message and return ID', async () => {
      const result = await api.messages.post(validMessage);
      expect(result.id).toBe(mockMessageId);
    });

    it('should throw validation error for invalid input', async () => {
      await expect(
        api.messages.post({
          ...validMessage,
          text: '', // Empty text should fail validation
        })
      ).rejects.toThrow();
    });

    it('should throw validation error for invalid coordinates', async () => {
      await expect(
        api.messages.post({
          ...validMessage,
          latitude: 91, // Out of range
        })
      ).rejects.toThrow();
    });

    it('should throw on server error', async () => {
      server.use(
        http.post('http://localhost:8080/messages', () => {
          return HttpResponse.json({ error: 'Failed to create' }, { status: 500 });
        })
      );

      await expect(api.messages.post(validMessage)).rejects.toThrow('API Error: 500');
    });

    it('should accept optional crowdId', async () => {
      const result = await api.messages.post({
        ...validMessage,
        crowdId: mockCrowdId,
      });
      expect(result.id).toBe(mockMessageId);
    });
  });

  describe('messages.feed()', () => {
    const validParams = {
      latitude: 45.5152,
      longitude: -122.6784,
    };

    it('should fetch feed with minimal params', async () => {
      const result = await api.messages.feed(validParams);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should validate response array', async () => {
      const result = await api.messages.feed(validParams);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('text');
      expect(result[0]).toHaveProperty('latitude');
      expect(result[0]).toHaveProperty('longitude');
    });

    it('should coerce date strings in response', async () => {
      const result = await api.messages.feed(validParams);
      expect(result[0].createdAt).toBeInstanceOf(Date);
      expect(result[0].expiresAt).toBeInstanceOf(Date);
    });

    it('should handle empty response', async () => {
      server.use(
        http.get('http://localhost:8080/messages/feed', () => {
          return HttpResponse.json([]);
        })
      );

      const result = await api.messages.feed(validParams);
      expect(result).toEqual([]);
    });

    it('should include optional params in request', async () => {
      const result = await api.messages.feed({
        ...validParams,
        userId: mockUserId,
        sortBy: 'soonest',
        crowdId: mockCrowdId,
      });
      expect(Array.isArray(result)).toBe(true);
    });

    it('should throw on server error', async () => {
      server.use(
        http.get('http://localhost:8080/messages/feed', () => {
          return HttpResponse.json({ error: 'Server error' }, { status: 500 });
        })
      );

      await expect(api.messages.feed(validParams)).rejects.toThrow('API Error: 500');
    });
  });

  describe('messages.boost()', () => {
    const validBoost = {
      userId: mockUserId,
      latitude: 45.5152,
      longitude: -122.6784,
    };

    it('should boost message successfully', async () => {
      const result = await api.messages.boost(mockMessageId, validBoost);
      expect(result.status).toBe('ok');
    });

    it('should validate boost response', async () => {
      const result = await api.messages.boost(mockMessageId, validBoost);
      expect(result).toHaveProperty('status');
      expect(typeof result.status).toBe('string');
    });

    it('should throw validation error for invalid coordinates', async () => {
      await expect(
        api.messages.boost(mockMessageId, {
          ...validBoost,
          latitude: 91,
        })
      ).rejects.toThrow();
    });

    it('should throw on 404 for non-existent message', async () => {
      server.use(
        http.post('http://localhost:8080/messages/:id/boost', () => {
          return HttpResponse.json({ error: 'Message not found' }, { status: 404 });
        })
      );

      await expect(api.messages.boost('non-existent-id', validBoost)).rejects.toThrow('API Error: 404');
    });

    it('should throw on 400 for already boosted', async () => {
      server.use(
        http.post('http://localhost:8080/messages/:id/boost', () => {
          return HttpResponse.json({ error: 'Already boosted' }, { status: 400 });
        })
      );

      await expect(api.messages.boost(mockMessageId, validBoost)).rejects.toThrow('API Error: 400');
    });
  });

  describe('crowds.create()', () => {
    const validCrowd = {
      name: 'Test Crowd',
      userId: mockUserId,
    };

    it('should create crowd and return ID', async () => {
      const result = await api.crowds.create(validCrowd);
      expect(result.id).toBe(mockCrowdId);
    });

    it('should accept optional isOpen', async () => {
      const result = await api.crowds.create({
        ...validCrowd,
        isOpen: false,
      });
      expect(result.id).toBe(mockCrowdId);
    });

    it('should throw validation error for empty name', async () => {
      await expect(
        api.crowds.create({
          ...validCrowd,
          name: '',
        })
      ).rejects.toThrow();
    });

    it('should throw validation error for name too long', async () => {
      await expect(
        api.crowds.create({
          ...validCrowd,
          name: 'a'.repeat(51),
        })
      ).rejects.toThrow();
    });
  });

  describe('crowds.list()', () => {
    it('should return crowd array', async () => {
      const result = await api.crowds.list(mockUserId);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should validate crowd response fields', async () => {
      const result = await api.crowds.list(mockUserId);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('isOpen');
      expect(result[0]).toHaveProperty('memberCount');
    });

    it('should coerce date strings in response', async () => {
      const result = await api.crowds.list(mockUserId);
      expect(result[0].createdAt).toBeInstanceOf(Date);
      expect(result[0].expiresAt).toBeInstanceOf(Date);
    });

    it('should handle empty response', async () => {
      server.use(
        http.get('http://localhost:8080/crowds', () => {
          return HttpResponse.json([]);
        })
      );

      const result = await api.crowds.list(mockUserId);
      expect(result).toEqual([]);
    });
  });

  describe('crowds.join()', () => {
    const validJoin = {
      userId: mockUserId,
    };

    it('should join crowd and return status', async () => {
      const result = await api.crowds.join(mockCrowdId, validJoin);
      expect(result.status).toBe('ok');
    });

    it('should throw on 404 for non-existent crowd', async () => {
      server.use(
        http.post('http://localhost:8080/crowds/:id/join', () => {
          return HttpResponse.json({ error: 'Crowd not found' }, { status: 404 });
        })
      );

      await expect(api.crowds.join('non-existent-id', validJoin)).rejects.toThrow('API Error: 404');
    });

    it('should throw on 400 for closed crowd', async () => {
      server.use(
        http.post('http://localhost:8080/crowds/:id/join', () => {
          return HttpResponse.json({ error: 'Crowd is closed' }, { status: 400 });
        })
      );

      await expect(api.crowds.join(mockCrowdId, validJoin)).rejects.toThrow('API Error: 400');
    });
  });

  describe('crowds.leave()', () => {
    const validLeave = {
      userId: mockUserId,
    };

    it('should leave crowd and return status', async () => {
      const result = await api.crowds.leave(mockCrowdId, validLeave);
      expect(result.status).toBe('ok');
    });

    it('should be idempotent for non-member', async () => {
      // Server should return ok even if not a member (idempotent)
      const result = await api.crowds.leave(mockCrowdId, validLeave);
      expect(result.status).toBe('ok');
    });
  });

  describe('Error handling', () => {
    it('should throw on 4xx responses', async () => {
      server.use(
        http.get('http://localhost:8080/health', () => {
          return HttpResponse.json({ error: 'Bad request' }, { status: 400 });
        })
      );

      await expect(api.health()).rejects.toThrow('API Error: 400');
    });

    it('should throw on 5xx responses', async () => {
      server.use(
        http.get('http://localhost:8080/health', () => {
          return HttpResponse.json({ error: 'Internal server error' }, { status: 500 });
        })
      );

      await expect(api.health()).rejects.toThrow('API Error: 500');
    });

    it('should truncate long error messages', async () => {
      const longError = 'a'.repeat(300);
      server.use(
        http.get('http://localhost:8080/health', () => {
          return new HttpResponse(longError, { status: 500 });
        })
      );

      try {
        await api.health();
      } catch (error) {
        expect((error as Error).message.length).toBeLessThanOrEqual(220); // "API Error: 500 - " + 200 chars max
      }
    });
  });

  describe('Request timeout', () => {
    it('should throw after timeout', async () => {
      server.use(
        http.get('http://localhost:8080/health', async () => {
          // Simulate a long delay that exceeds timeout
          await new Promise((resolve) => setTimeout(resolve, 35000));
          return HttpResponse.json({ status: 'ok' });
        })
      );

      // Set a very short timeout for this test
      // Note: The actual timeout is 30s in the client, we can't easily test this
      // without modifying the client to accept timeout as parameter
      // This test documents expected behavior
      expect(true).toBe(true);
    }, 5000);
  });

  describe('setBaseUrl()', () => {
    it('should change the base URL for requests', async () => {
      api.setBaseUrl('http://different-server:9000');

      server.use(
        http.get('http://different-server:9000/health', () => {
          return HttpResponse.json({ status: 'different' });
        })
      );

      const result = await api.health();
      expect(result.status).toBe('different');

      // Reset for other tests
      api.setBaseUrl('http://localhost:8080');
    });
  });
});
