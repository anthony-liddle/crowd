import { createServer } from 'net';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { sql } from 'drizzle-orm';
import { db } from './db';

// Dev-only startup checks. The production server runs in a container where
// the platform manages port binding and the deploy pipeline runs migrations
// as a release_command — neither check helps there.

/**
 * Fails loud if the configured port is already in use. The common culprit
 * is leftover `docker compose` from a previous session — `tsx watch` would
 * otherwise silently fail to bind and the dev server wouldn't actually
 * start, leaving requests to hit Docker or hang.
 */
export async function checkPortAvailable(port: number, host: string): Promise<void> {
  await new Promise<void>((resolvePromise, reject) => {
    const tester = createServer()
      .once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          reject(
            new Error(
              `Port ${port} is already in use. Another process is holding it ` +
                `(usually a leftover docker compose from a previous session).\n` +
                `  Diagnose: lsof -i :${port}\n` +
                `  Recover:  docker compose down   (preferred if it's compose)\n` +
                `            lsof -ti :${port} | xargs kill -9   (fallback)`,
            ),
          );
        } else {
          reject(err);
        }
      })
      .once('listening', () => {
        tester.close(() => resolvePromise());
      })
      // Bind to the same host the real server will bind to. Without the
      // explicit host, Node may default to IPv6 (::) while the conflicting
      // process holds IPv4 (0.0.0.0), and macOS dual-stack lets both
      // coexist — the check passes but the real bind fails.
      .listen(port, host);
  });
}

/**
 * Warns if the local DB's applied-migration count differs from the journal
 * on disk. Doesn't fail startup — drift is recoverable. The common case is
 * "pulled a branch with new migrations, forgot to run them," which would
 * otherwise surface as opaque "Failed query: select ... from <table>" errors.
 */
export async function checkMigrationDrift(): Promise<void> {
  const journalPath = resolve(__dirname, '../drizzle/meta/_journal.json');
  let expectedCount: number;
  try {
    const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as {
      entries: unknown[];
    };
    expectedCount = journal.entries.length;
  } catch (err) {
    console.warn(
      '[preflight] Could not read drizzle journal at ' + journalPath +
        '. Skipping migration drift check.',
    );
    return;
  }

  let appliedCount: number;
  try {
    const result = await db.execute(
      sql`SELECT COUNT(*)::int AS count FROM drizzle.__drizzle_migrations`,
    );
    const row = (result as unknown as { rows: { count: number }[] }).rows[0];
    appliedCount = row?.count ?? 0;
  } catch {
    // Table doesn't exist — fresh DB.
    if (expectedCount > 0) {
      console.warn(
        '[preflight] No migrations have been applied to the local DB yet ' +
          `(${expectedCount} pending). Run: pnpm --filter @app/server migrate`,
      );
    }
    return;
  }

  if (appliedCount === expectedCount) return;

  if (appliedCount < expectedCount) {
    console.warn(
      `[preflight] Local DB is behind the migrations on disk ` +
        `(${appliedCount} applied, ${expectedCount} expected). Pulling a ` +
        `branch with new migrations? Run: pnpm --filter @app/server migrate`,
    );
    return;
  }

  // appliedCount > expectedCount — rare; usually means a branch was reverted.
  console.warn(
    `[preflight] Local DB has more applied migrations than the journal on ` +
      `disk (${appliedCount} applied, ${expectedCount} on disk). You may ` +
      `have reverted to a branch without the latest migrations. Review ` +
      `the DB state before proceeding; rolling back individual migrations ` +
      `is a manual operation.`,
  );
}
