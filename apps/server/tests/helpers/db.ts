import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import * as schema from '../../src/db/schema';
import { sql } from 'drizzle-orm';

let testPool: Pool | null = null;
let testDb: ReturnType<typeof drizzle> | null = null;

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/monorepo_db_test';

/**
 * Setup test database - creates connection and runs migrations
 */
export async function setupTestDb() {
  if (testPool) {
    return testDb!;
  }

  // Create connection pool
  testPool = new Pool({
    connectionString: TEST_DATABASE_URL,
  });

  // Create drizzle instance
  testDb = drizzle(testPool, { schema });

  // Run migrations
  try {
    await migrate(testDb, {
      migrationsFolder: './drizzle',
    });
    console.log('Test database migrations applied');
  } catch (error) {
    console.error('Error running migrations:', error);
    throw error;
  }

  return testDb;
}

/**
 * Get test database instance
 */
export function getTestDb() {
  if (!testDb) {
    throw new Error('Test database not initialized. Call setupTestDb() first.');
  }
  return testDb;
}

/**
 * Reset test database - truncates all tables
 */
export async function resetTestDb() {
  if (!testDb) {
    throw new Error('Test database not initialized. Call setupTestDb() first.');
  }

  // Truncate all tables in correct order (respecting foreign keys)
  await testDb.execute(sql`TRUNCATE TABLE message_boosts CASCADE`);
  await testDb.execute(sql`TRUNCATE TABLE crowd_memberships CASCADE`);
  await testDb.execute(sql`TRUNCATE TABLE messages CASCADE`);
  await testDb.execute(sql`TRUNCATE TABLE crowds CASCADE`);
}

/**
 * Teardown test database - closes connections
 */
export async function teardownTestDb() {
  if (testPool) {
    await testPool.end();
    testPool = null;
    testDb = null;
  }
}

/**
 * Helper to create a test database connection string
 * Useful for testing with a separate database
 */
export function getTestDatabaseUrl(): string {
  return TEST_DATABASE_URL;
}
