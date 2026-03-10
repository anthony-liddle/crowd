import { describe, it, expect, beforeEach } from 'vitest';
import { resetTestDb, getTestDb } from '../helpers/db';
import { crowds, crowdMemberships } from '../../src/db/schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

describe('Crowd Database Operations', () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  it('should create a crowd', async () => {
    const db = getTestDb();
    const userId = randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const [crowd] = await db.insert(crowds).values({
      name: 'Test Crowd',
      ownerId: userId,
      isOpen: true,
      expiresAt,
    }).returning();

    expect(crowd).toBeDefined();
    expect(crowd.name).toBe('Test Crowd');
    expect(crowd.ownerId).toBe(userId);
    expect(crowd.isOpen).toBe(true);
  });

  it('should create crowd membership', async () => {
    const db = getTestDb();
    const userId = randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const [crowd] = await db.insert(crowds).values({
      name: 'Test Crowd',
      ownerId: userId,
      isOpen: true,
      expiresAt,
    }).returning();

    const [membership] = await db.insert(crowdMemberships).values({
      crowdId: crowd.id,
      userId,
    }).returning();

    expect(membership).toBeDefined();
    expect(membership.crowdId).toBe(crowd.id);
    expect(membership.userId).toBe(userId);
  });

  it('should query crowds by membership', async () => {
    const db = getTestDb();
    const userId1 = randomUUID();
    const userId2 = randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const [crowd1] = await db.insert(crowds).values({
      name: 'Crowd 1',
      ownerId: userId1,
      isOpen: true,
      expiresAt,
    }).returning();

    const [crowd2] = await db.insert(crowds).values({
      name: 'Crowd 2',
      ownerId: userId2,
      isOpen: true,
      expiresAt,
    }).returning();

    await db.insert(crowdMemberships).values([
      { crowdId: crowd1.id, userId: userId1 },
      { crowdId: crowd2.id, userId: userId2 },
      { crowdId: crowd1.id, userId: userId2 }, // userId2 is also in crowd1
    ]);

    const userCrowds = await db
      .select()
      .from(crowds)
      .innerJoin(crowdMemberships, eq(crowds.id, crowdMemberships.crowdId))
      .where(eq(crowdMemberships.userId, userId2));

    expect(userCrowds.length).toBe(2);
  });

  it('should cascade delete memberships when crowd is deleted', async () => {
    const db = getTestDb();
    const userId = randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const [crowd] = await db.insert(crowds).values({
      name: 'Test Crowd',
      ownerId: userId,
      isOpen: true,
      expiresAt,
    }).returning();

    await db.insert(crowdMemberships).values({
      crowdId: crowd.id,
      userId,
    });

    // Delete crowd
    await db.delete(crowds).where(eq(crowds.id, crowd.id));

    // Verify membership is deleted (cascade)
    const [membership] = await db.select()
      .from(crowdMemberships)
      .where(eq(crowdMemberships.crowdId, crowd.id));

    expect(membership).toBeUndefined();
  });
});
