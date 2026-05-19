import { db } from '../db/index';
import { cleanupExpired } from '../jobs/cleanupExpired';

/**
 * Manual cleanup script. Thin wrapper around `cleanupExpired()` for cases
 * where you want to run cleanup once from the command line (`pnpm cleanup`).
 *
 * For scheduled runs, see `src/jobs/runCleanupJob.ts`, which is the entry
 * point used by the Fly scheduled machine. Both call the same function.
 */
async function main() {
  const startedAt = new Date();
  console.log(`[${startedAt.toISOString()}] Starting cleanup of expired data...`);

  const result = await cleanupExpired(db);

  const finishedAt = new Date();
  console.log(`[${finishedAt.toISOString()}] Cleanup complete:`);
  console.log(`  - Messages deleted: ${result.messagesDeleted}`);
  console.log(`  - Boosts deleted: ${result.boostsDeleted}`);
  console.log(`  - Crowds deleted: ${result.crowdsDeleted}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error during cleanup:', err);
    process.exit(1);
  });
