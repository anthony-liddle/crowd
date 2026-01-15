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

async function cleanupExpired() {
  try {
    const now = new Date();
    console.log(`[${now.toISOString()}] Starting cleanup of expired data...`);

    // Step 1: Find and delete expired messages and their boosts
    const expiredMessages = await db
      .select({ id: messages.id })
      .from(messages)
      .where(lt(messages.expiresAt, now));

    const expiredMessageIds = expiredMessages.map(m => m.id);
    let deletedBoosts = 0;
    let deletedMessages = 0;

    if (expiredMessageIds.length > 0) {
      // Count boosts before deletion
      const [boostCountResult] = await db
        .select({ count: count() })
        .from(messageBoosts)
        .where(inArray(messageBoosts.messageId, expiredMessageIds));
      
      deletedBoosts = boostCountResult?.count || 0;

      // Delete boosts for expired messages first (to avoid foreign key issues)
      await db
        .delete(messageBoosts)
        .where(inArray(messageBoosts.messageId, expiredMessageIds));

      console.log(`Deleted ${deletedBoosts} boost(s) for expired messages`);

      // Delete expired messages
      await db
        .delete(messages)
        .where(inArray(messages.id, expiredMessageIds));

      deletedMessages = expiredMessageIds.length;
      console.log(`Deleted ${deletedMessages} expired message(s)`);
    } else {
      console.log('No expired messages found');
    }

    // Step 2: Find and delete expired crowds (memberships cascade automatically)
    const expiredCrowds = await db
      .select({ id: crowds.id })
      .from(crowds)
      .where(lt(crowds.expiresAt, now));

    const expiredCrowdIds = expiredCrowds.map(c => c.id);
    let deletedCrowds = 0;

    if (expiredCrowdIds.length > 0) {
      await db
        .delete(crowds)
        .where(inArray(crowds.id, expiredCrowdIds));

      deletedCrowds = expiredCrowdIds.length;
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
