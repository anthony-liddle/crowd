import { describe, it, expect, beforeEach } from 'vitest';
import { resetTestDb, getTestDb } from '../helpers/db';
import { messages, messageBoosts, crowds } from '../../src/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

describe('Message Database Operations', () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  it('should create a message', async () => {
    const db = getTestDb();
    const userId = randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const [message] = await db.insert(messages).values({
      text: 'Test message',
      latitude: '37.7749',
      longitude: '-122.4194',
      radiusMeters: 1000,
      activeMinutes: 60,
      ownerId: userId,
      expiresAt,
      boostCount: 0,
    }).returning();

    expect(message).toBeDefined();
    expect(message.text).toBe('Test message');
    expect(message.ownerId).toBe(userId);
    expect(message.boostCount).toBe(0);
  });

  it('should create a message boost', async () => {
    const db = getTestDb();
    const userId = randomUUID();
    const boosterId = randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const [message] = await db.insert(messages).values({
      text: 'Test message',
      latitude: '37.7749',
      longitude: '-122.4194',
      radiusMeters: 1000,
      activeMinutes: 60,
      ownerId: userId,
      expiresAt,
      boostCount: 0,
    }).returning();

    const [boost] = await db.insert(messageBoosts).values({
      messageId: message.id,
      userId: boosterId,
      latitude: '37.7750',
      longitude: '-122.4195',
    }).returning();

    expect(boost).toBeDefined();
    expect(boost.messageId).toBe(message.id);
    expect(boost.userId).toBe(boosterId);
  });

  it('should update boost count', async () => {
    const db = getTestDb();
    const userId = randomUUID();
    const boosterId = randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const [message] = await db.insert(messages).values({
      text: 'Test message',
      latitude: '37.7749',
      longitude: '-122.4194',
      radiusMeters: 1000,
      activeMinutes: 60,
      ownerId: userId,
      expiresAt,
      boostCount: 0,
    }).returning();

    await db.insert(messageBoosts).values({
      messageId: message.id,
      userId: boosterId,
      latitude: '37.7750',
      longitude: '-122.4195',
    });

    await db.update(messages)
      .set({ boostCount: 1 })
      .where(eq(messages.id, message.id));

    const [updated] = await db.select()
      .from(messages)
      .where(eq(messages.id, message.id));

    expect(updated.boostCount).toBe(1);
  });

  it('should associate message with crowd', async () => {
    const db = getTestDb();
    const userId = randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const [crowd] = await db.insert(crowds).values({
      name: 'Test Crowd',
      ownerId: userId,
      isOpen: true,
      expiresAt,
    }).returning();

    const [message] = await db.insert(messages).values({
      text: 'Crowd message',
      latitude: '37.7749',
      longitude: '-122.4194',
      radiusMeters: 1000,
      activeMinutes: 60,
      ownerId: userId,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      boostCount: 0,
      crowdId: crowd.id,
    }).returning();

    expect(message.crowdId).toBe(crowd.id);
  });

  it('should set crowdId to null for global messages', async () => {
    const db = getTestDb();
    const userId = randomUUID();

    const [message] = await db.insert(messages).values({
      text: 'Global message',
      latitude: '37.7749',
      longitude: '-122.4194',
      radiusMeters: 1000,
      activeMinutes: 60,
      ownerId: userId,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      boostCount: 0,
      crowdId: null,
    }).returning();

    expect(message.crowdId).toBeNull();
  });
});
