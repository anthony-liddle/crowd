import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../../src/db/schema';

let container: StartedPostgreSqlContainer;
let pool: Pool;
let testDb: ReturnType<typeof drizzle>;

// Track if we're in shutdown mode to suppress expected errors
let isShuttingDown = false;

const migrationSql = `
-- Create crowds table
CREATE TABLE IF NOT EXISTS "crowds" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "owner_id" uuid NOT NULL,
  "is_open" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "expires_at" timestamp NOT NULL
);
CREATE INDEX IF NOT EXISTS "crowds_owner_id_idx" ON "crowds" ("owner_id");
CREATE INDEX IF NOT EXISTS "crowds_expires_at_idx" ON "crowds" ("expires_at");

-- Create crowd_memberships table
CREATE TABLE IF NOT EXISTS "crowd_memberships" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "crowd_id" uuid NOT NULL REFERENCES "crowds"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL,
  "joined_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "unique_crowd_membership" ON "crowd_memberships" ("crowd_id", "user_id");

-- Create messages table
CREATE TABLE IF NOT EXISTS "messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "text" text NOT NULL,
  "latitude" numeric NOT NULL,
  "longitude" numeric NOT NULL,
  "radius_meters" integer NOT NULL,
  "active_minutes" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "expires_at" timestamp NOT NULL,
  "owner_id" uuid,
  "boost_count" integer DEFAULT 0 NOT NULL,
  "crowd_id" uuid REFERENCES "crowds"("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "messages_owner_id_idx" ON "messages" ("owner_id");
CREATE INDEX IF NOT EXISTS "messages_expires_at_idx" ON "messages" ("expires_at");
CREATE INDEX IF NOT EXISTS "messages_crowd_id_idx" ON "messages" ("crowd_id");

-- Create message_boosts table
CREATE TABLE IF NOT EXISTS "message_boosts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "message_id" uuid NOT NULL REFERENCES "messages"("id"),
  "user_id" uuid NOT NULL,
  "latitude" numeric NOT NULL,
  "longitude" numeric NOT NULL,
  "boosted_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "unique_user_boost" ON "message_boosts" ("message_id", "user_id");
CREATE INDEX IF NOT EXISTS "message_boosts_message_id_idx" ON "message_boosts" ("message_id");
`;

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

  // Run migrations
  await pool.query(migrationSql);

  return { db: testDb, connectionString };
}

export async function clearTables() {
  if (!pool) return;

  // Clear tables in correct order due to foreign keys
  await pool.query('DELETE FROM message_boosts');
  await pool.query('DELETE FROM messages');
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
