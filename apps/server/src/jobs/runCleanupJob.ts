import { db } from '../db/index';
import { cleanupExpired } from './cleanupExpired';

/**
 * Scheduled-job entry point. Compiled to `dist/jobs/runCleanupJob.js` for
 * the Fly scheduled machine to invoke via `node dist/jobs/runCleanupJob.js`.
 *
 * See `apps/server/scripts/setup-cleanup-schedule.sh` for the one-time
 * `fly machine run --schedule hourly` command that registers the schedule
 * against the dev app. The schedule is imperative (not declared in
 * `fly.toml`) because Fly's scheduled-machines feature is created via the
 * CLI rather than the deploy config.
 *
 * Logs in a structured shape so `fly logs` output is greppable.
 */
async function main() {
  const startedAt = new Date();
  console.log(
    JSON.stringify({ level: 'info', event: 'cleanup_started', startedAt: startedAt.toISOString() }),
  );

  const result = await cleanupExpired(db);

  const finishedAt = new Date();
  console.log(
    JSON.stringify({
      level: 'info',
      event: 'cleanup_complete',
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      ...result,
    }),
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'cleanup_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    process.exit(1);
  });
