import { lt, inArray, count } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { messages, messageBoosts, crowds } from '../db/schema';

const BATCH_SIZE = 1000;

export interface CleanupResult {
  messagesDeleted: number;
  boostsDeleted: number;
  crowdsDeleted: number;
}

/**
 * Delete expired messages, their boosts, and expired crowds in batches.
 *
 * Takes a Drizzle DB instance as a parameter so tests can inject a test
 * connection. Returns counts for each kind of deletion. Throws on errors —
 * callers (the manual script wrapper or the scheduled job runner) decide
 * what to do with failures.
 *
 * Crowd memberships and proximity tokens cascade automatically on crowd
 * delete (ON DELETE CASCADE in the schema).
 */
export async function cleanupExpired(
  db: NodePgDatabase<any>,
): Promise<CleanupResult> {
  const now = new Date();

  let messagesDeleted = 0;
  let boostsDeleted = 0;

  // Loop 1: expired messages + their boosts. Boosts deleted first to avoid
  // FK violations on message_boosts.message_id.
  while (true) {
    const batch = await db
      .select({ id: messages.id })
      .from(messages)
      .where(lt(messages.expiresAt, now))
      .limit(BATCH_SIZE);

    if (batch.length === 0) break;

    const batchIds = batch.map((m) => m.id);

    const [boostCountResult] = await db
      .select({ count: count() })
      .from(messageBoosts)
      .where(inArray(messageBoosts.messageId, batchIds));

    boostsDeleted += Number(boostCountResult?.count) || 0;

    await db
      .delete(messageBoosts)
      .where(inArray(messageBoosts.messageId, batchIds));

    await db.delete(messages).where(inArray(messages.id, batchIds));

    messagesDeleted += batchIds.length;
  }

  // Loop 2: expired crowds. Memberships + proximity tokens cascade.
  let crowdsDeleted = 0;
  while (true) {
    const batch = await db
      .select({ id: crowds.id })
      .from(crowds)
      .where(lt(crowds.expiresAt, now))
      .limit(BATCH_SIZE);

    if (batch.length === 0) break;

    const batchIds = batch.map((c) => c.id);
    await db.delete(crowds).where(inArray(crowds.id, batchIds));
    crowdsDeleted += batchIds.length;
  }

  return { messagesDeleted, boostsDeleted, crowdsDeleted };
}
