import { describe, it, expect, beforeEach } from 'vitest';
import { resetTestDb, getTestDb } from '../helpers/db';
import { messages, messageBoosts, crowds, crowdMemberships } from '../../src/db/schema';
import { lt, eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

describe('Cleanup Script Logic', () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  it('should identify expired messages', async () => {
    const db = getTestDb();
    const userId = randomUUID();
    const now = new Date();

    // Create expired and active messages
    await db.insert(messages).values([
      {
        text: 'Expired message',
        latitude: '37.7749',
        longitude: '-122.4194',
        radiusMeters: 1000,
        activeMinutes: 60,
        ownerId: userId,
        expiresAt: new Date(now.getTime() - 1000), // Expired
        boostCount: 0,
      },
      {
        text: 'Active message',
        latitude: '37.7749',
        longitude: '-122.4194',
        radiusMeters: 1000,
        activeMinutes: 60,
        ownerId: userId,
        expiresAt: new Date(now.getTime() + 60 * 60 * 1000), // Active
        boostCount: 0,
      },
    ]);

    const expiredMessages = await db
      .select({ id: messages.id })
      .from(messages)
      .where(lt(messages.expiresAt, now));

    expect(expiredMessages.length).toBe(1);
    expect(expiredMessages[0].id).toBeDefined();
  });

  it('should identify expired crowds', async () => {
    const db = getTestDb();
    const userId = randomUUID();
    const now = new Date();

    await db.insert(crowds).values([
      {
        name: 'Expired Crowd',
        ownerId: userId,
        isOpen: true,
        expiresAt: new Date(now.getTime() - 1000), // Expired
      },
      {
        name: 'Active Crowd',
        ownerId: userId,
        isOpen: true,
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Active
      },
    ]);

    const expiredCrowds = await db
      .select({ id: crowds.id })
      .from(crowds)
      .where(lt(crowds.expiresAt, now));

    expect(expiredCrowds.length).toBe(1);
  });

  it('should find boosts for expired messages', async () => {
    const db = getTestDb();
    const userId = randomUUID();
    const boosterId = randomUUID();
    const now = new Date();

    const [expiredMessage] = await db.insert(messages).values({
      text: 'Expired message',
      latitude: '37.7749',
      longitude: '-122.4194',
      radiusMeters: 1000,
      activeMinutes: 60,
      ownerId: userId,
      expiresAt: new Date(now.getTime() - 1000),
      boostCount: 1,
    }).returning();

    await db.insert(messageBoosts).values({
      messageId: expiredMessage.id,
      userId: boosterId,
      latitude: '37.7750',
      longitude: '-122.4195',
    });

    const expiredMessageIds = [expiredMessage.id];
    const boosts = await db
      .select()
      .from(messageBoosts)
      .where(eq(messageBoosts.messageId, expiredMessage.id));

    expect(boosts.length).toBe(1);
  });

  it('should handle cleanup of messages with boosts', async () => {
    const db = getTestDb();
    const userId = randomUUID();
    const boosterId = randomUUID();
    const now = new Date();

    const [expiredMessage] = await db.insert(messages).values({
      text: 'Expired message',
      latitude: '37.7749',
      longitude: '-122.4194',
      radiusMeters: 1000,
      activeMinutes: 60,
      ownerId: userId,
      expiresAt: new Date(now.getTime() - 1000),
      boostCount: 1,
    }).returning();

    await db.insert(messageBoosts).values({
      messageId: expiredMessage.id,
      userId: boosterId,
      latitude: '37.7750',
      longitude: '-122.4195',
    });

    // Simulate cleanup: delete boosts first, then messages
    await db.delete(messageBoosts).where(eq(messageBoosts.messageId, expiredMessage.id));
    await db.delete(messages).where(eq(messages.id, expiredMessage.id));

    const [remainingMessage] = await db.select()
      .from(messages)
      .where(eq(messages.id, expiredMessage.id));

    const [remainingBoost] = await db.select()
      .from(messageBoosts)
      .where(eq(messageBoosts.messageId, expiredMessage.id));

    expect(remainingMessage).toBeUndefined();
    expect(remainingBoost).toBeUndefined();
  });

  it('should handle cleanup of crowds with memberships', async () => {
    const db = getTestDb();
    const userId = randomUUID();
    const now = new Date();

    const [expiredCrowd] = await db.insert(crowds).values({
      name: 'Expired Crowd',
      ownerId: userId,
      isOpen: true,
      expiresAt: new Date(now.getTime() - 1000),
    }).returning();

    await db.insert(crowdMemberships).values({
      crowdId: expiredCrowd.id,
      userId,
    });

    // Delete crowd (memberships should cascade)
    await db.delete(crowds).where(eq(crowds.id, expiredCrowd.id));

    const [remainingCrowd] = await db.select()
      .from(crowds)
      .where(eq(crowds.id, expiredCrowd.id));

    const [remainingMembership] = await db.select()
      .from(crowdMemberships)
      .where(eq(crowdMemberships.crowdId, expiredCrowd.id));

    expect(remainingCrowd).toBeUndefined();
    expect(remainingMembership).toBeUndefined();
  });
});
