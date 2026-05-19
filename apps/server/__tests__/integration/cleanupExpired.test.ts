import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import {
  setupTestDb,
  teardownTestDb,
  clearTables,
  getTestDb,
} from '../helpers/testDb';
import { pastDate, futureDate, randomUuid } from '../helpers/fixtures';
import {
  messages,
  messageBoosts,
  crowds,
  crowdMemberships,
  proximityTokens,
} from '../../src/db/schema';
import { cleanupExpired } from '../../src/jobs/cleanupExpired';

describe('cleanupExpired', () => {
  let db: ReturnType<typeof getTestDb>;

  beforeAll(async () => {
    await setupTestDb();
    db = getTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTables();
  });

  it('deletes expired messages and preserves unexpired ones', async () => {
    const ownerId = randomUuid();
    const [expired] = await db
      .insert(messages)
      .values({
        text: 'expired',
        latitude: '45.5152',
        longitude: '-122.6784',
        radiusMeters: 1000,
        activeMinutes: 60,
        ownerId,
        expiresAt: pastDate(1),
      })
      .returning({ id: messages.id });
    const [live] = await db
      .insert(messages)
      .values({
        text: 'live',
        latitude: '45.5152',
        longitude: '-122.6784',
        radiusMeters: 1000,
        activeMinutes: 60,
        ownerId,
        expiresAt: futureDate(1),
      })
      .returning({ id: messages.id });

    const result = await cleanupExpired(db);

    expect(result.messagesDeleted).toBe(1);
    const remaining = await db.select({ id: messages.id }).from(messages);
    expect(remaining.map((r) => r.id)).toEqual([live.id]);
    expect(remaining.map((r) => r.id)).not.toContain(expired.id);
  });

  it('deletes boosts attached to expired messages before deleting the messages', async () => {
    const ownerId = randomUuid();
    const boosterId = randomUuid();
    const [expired] = await db
      .insert(messages)
      .values({
        text: 'expired',
        latitude: '45.5152',
        longitude: '-122.6784',
        radiusMeters: 1000,
        activeMinutes: 60,
        ownerId,
        expiresAt: pastDate(1),
      })
      .returning({ id: messages.id });

    await db.insert(messageBoosts).values({
      messageId: expired.id,
      userId: boosterId,
      latitude: '45.5152',
      longitude: '-122.6784',
    });

    const result = await cleanupExpired(db);

    expect(result.messagesDeleted).toBe(1);
    expect(result.boostsDeleted).toBe(1);
    const remainingBoosts = await db
      .select({ id: messageBoosts.id })
      .from(messageBoosts);
    expect(remainingBoosts).toEqual([]);
  });

  it('deletes expired crowds and preserves unexpired ones, cascading memberships and proximity tokens', async () => {
    const ownerId = randomUuid();
    const memberId = randomUuid();

    const [expiredCrowd] = await db
      .insert(crowds)
      .values({
        name: 'expired crowd',
        ownerId,
        isOpen: true,
        expiresAt: pastDate(1),
      })
      .returning({ id: crowds.id });

    const [liveCrowd] = await db
      .insert(crowds)
      .values({
        name: 'live crowd',
        ownerId,
        isOpen: true,
        expiresAt: futureDate(1),
      })
      .returning({ id: crowds.id });

    await db.insert(crowdMemberships).values([
      { crowdId: expiredCrowd.id, userId: memberId },
      { crowdId: liveCrowd.id, userId: memberId },
    ]);

    await db.insert(proximityTokens).values({
      crowdId: expiredCrowd.id,
      token: 'a'.repeat(43),
      expiresAt: futureDate(0.05), // not relevant; cascades with the crowd
    });

    const result = await cleanupExpired(db);

    expect(result.crowdsDeleted).toBe(1);

    const remainingCrowds = await db.select({ id: crowds.id }).from(crowds);
    expect(remainingCrowds.map((r) => r.id)).toEqual([liveCrowd.id]);

    // Membership for the expired crowd cascaded away.
    const remainingMemberships = await db
      .select({ crowdId: crowdMemberships.crowdId })
      .from(crowdMemberships);
    expect(remainingMemberships.map((m) => m.crowdId)).toEqual([liveCrowd.id]);

    // Proximity token for the expired crowd cascaded away.
    const remainingTokens = await db
      .select({ id: proximityTokens.id })
      .from(proximityTokens)
      .where(eq(proximityTokens.crowdId, expiredCrowd.id));
    expect(remainingTokens).toEqual([]);
  });

  it('returns zero counts when nothing is expired', async () => {
    const ownerId = randomUuid();
    await db.insert(messages).values({
      text: 'live',
      latitude: '45.5152',
      longitude: '-122.6784',
      radiusMeters: 1000,
      activeMinutes: 60,
      ownerId,
      expiresAt: futureDate(1),
    });
    await db.insert(crowds).values({
      name: 'live crowd',
      ownerId,
      isOpen: true,
      expiresAt: futureDate(1),
    });

    const result = await cleanupExpired(db);

    expect(result).toEqual({
      messagesDeleted: 0,
      boostsDeleted: 0,
      crowdsDeleted: 0,
    });
  });
});
