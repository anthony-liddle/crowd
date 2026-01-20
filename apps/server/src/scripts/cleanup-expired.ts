import { db } from '../db/index';
import { messages, messageBoosts, crowds } from '../db/schema';
import { lt, inArray, count } from 'drizzle-orm';

/**
 * Cleanup script to remove expired messages and crowds from the database.
 * 
 * This script:
 * - Deletes expired messages and their associated boosts
 * - Deletes expired crowds (memberships cascade automatically)
 * 
 * Run this periodically via cron or scheduled task.
 */

const BATCH_SIZE = 1000;

async function cleanupExpired() {
  try {
    const now = new Date();
    console.log(`[${now.toISOString()}] Starting cleanup of expired data...`);

    // Step 1: Delete expired messages and their boosts in batches
    let deletedBoosts = 0;
    let deletedMessages = 0;

    while (true) {
      // Get a batch of expired message IDs
      const batch = await db
        .select({ id: messages.id })
        .from(messages)
        .where(lt(messages.expiresAt, now))
        .limit(BATCH_SIZE);

      if (batch.length === 0) break;

      const batchIds = batch.map(m => m.id);

      // Count boosts before deletion
      const [boostCountResult] = await db
        .select({ count: count() })
        .from(messageBoosts)
        .where(inArray(messageBoosts.messageId, batchIds));

      deletedBoosts += Number(boostCountResult?.count) || 0;

      // Delete boosts for expired messages first (to avoid foreign key issues)
      await db
        .delete(messageBoosts)
        .where(inArray(messageBoosts.messageId, batchIds));

      // Delete expired messages
      await db
        .delete(messages)
        .where(inArray(messages.id, batchIds));

      deletedMessages += batchIds.length;
      console.log(`Deleted batch of ${batchIds.length} message(s)...`);
    }

    if (deletedMessages > 0) {
      console.log(`Deleted ${deletedBoosts} boost(s) for expired messages`);
      console.log(`Deleted ${deletedMessages} expired message(s)`);
    } else {
      console.log('No expired messages found');
    }

    // Step 2: Delete expired crowds in batches (memberships cascade automatically)
    let deletedCrowds = 0;

    while (true) {
      const batch = await db
        .select({ id: crowds.id })
        .from(crowds)
        .where(lt(crowds.expiresAt, now))
        .limit(BATCH_SIZE);

      if (batch.length === 0) break;

      const batchIds = batch.map(c => c.id);

      await db
        .delete(crowds)
        .where(inArray(crowds.id, batchIds));

      deletedCrowds += batchIds.length;
      console.log(`Deleted batch of ${batchIds.length} crowd(s)...`);
    }

    if (deletedCrowds > 0) {
      console.log(`Deleted ${deletedCrowds} expired crowd(s) (memberships cascaded automatically)`);
    } else {
      console.log('No expired crowds found');
    }

    // Summary
    console.log(`[${new Date().toISOString()}] Cleanup complete:`);
    console.log(`  - Messages deleted: ${deletedMessages}`);
    console.log(`  - Boosts deleted: ${deletedBoosts}`);
    console.log(`  - Crowds deleted: ${deletedCrowds}`);

    process.exit(0);
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

cleanupExpired();
