import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// In production DATABASE_URL must be set — fail loud at module load rather
// than silently falling through to localhost (which would only surface as
// query failures later). Outside production the localhost default keeps
// docker-compose and tests working without configuration.
const isProduction = process.env.NODE_ENV === 'production';
const envDatabaseUrl = process.env.DATABASE_URL;

if (isProduction && !envDatabaseUrl) {
  throw new Error(
    'DATABASE_URL must be set when NODE_ENV=production. Set it via ' +
    "`fly secrets set DATABASE_URL='postgres://...'` (Neon's pooled " +
    'connection string for this app).',
  );
}

const connectionString =
  envDatabaseUrl || 'postgres://postgres:postgres@localhost:5432/monorepo_db';

const pool = new Pool({
  connectionString,
});

export const db = drizzle(pool, { schema });
