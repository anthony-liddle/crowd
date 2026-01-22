import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { setupTestDb, teardownTestDb, getConnectionString } from '../helpers/testDb';
import { createTestApp } from '../helpers/createApp';

describe('Health Endpoint', () => {
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

  it('should return status ok', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });
});
