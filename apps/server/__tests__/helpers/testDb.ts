import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import path from 'node:path';
import * as schema from '../../src/db/schema';

let container: StartedPostgreSqlContainer;
let pool: Pool;
let testDb: ReturnType<typeof drizzle>;

// Track if we're in shutdown mode to suppress expected errors
let isShuttingDown = false;

export async function setupTestDb() {
  container = await new PostgreSqlContainer('postgres:15')
    .withDatabase('test_db')
    .withUsername('test')
    .withPassword('test')
    .start();

  const connectionString = container.getConnectionUri();

  pool = new Pool({ connectionString });

  // Suppress expected shutdown errors from the pool
  pool.on('error', (err: Error) => {
    if (isShuttingDown && ((err as any)?.code === '57P01' || err.message?.includes('terminating connection'))) {
      return; // Expected during container shutdown
    }
    console.error('Unexpected pool error:', err);
  });

  testDb = drizzle(pool, { schema });

  await migrate(testDb, {
    migrationsFolder: path.resolve(__dirname, '../../drizzle'),
  });

  return { db: testDb, connectionString };
}

export async function clearTables() {
  if (!pool) return;

  // Clear tables in correct order due to foreign keys
  await pool.query('DELETE FROM message_boosts');
  await pool.query('DELETE FROM messages');
  await pool.query('DELETE FROM proximity_tokens');
  await pool.query('DELETE FROM crowd_memberships');
  await pool.query('DELETE FROM crowds');
}

export async function teardownTestDb() {
  isShuttingDown = true;

  try {
    if (pool) {
      // Force close all connections
      await pool.end();
      // Wait for connections to fully drain
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  } catch {
    // Ignore errors during pool cleanup
  }

  try {
    if (container) {
      await container.stop();
    }
  } catch {
    // Ignore errors during container stop - expected when connections are terminated
  }
}

export function getTestDb() {
  return testDb;
}

export function getConnectionString() {
  return container?.getConnectionUri();
}
