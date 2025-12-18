import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Use env var or default for now (user should probably configure this)
const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/monorepo_db';

const pool = new Pool({
  connectionString,
});

export const db = drizzle(pool, { schema });
