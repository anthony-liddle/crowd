import { beforeAll, afterAll } from 'vitest';
import { setupTestDb, teardownTestDb } from './helpers/db';

// Setup test database before all tests
beforeAll(async () => {
  await setupTestDb();
});

// Cleanup test database after all tests
afterAll(async () => {
  await teardownTestDb();
});
