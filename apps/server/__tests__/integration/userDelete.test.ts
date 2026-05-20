import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { setupTestDb, teardownTestDb, clearTables, getTestDb } from '../helpers/testDb';
import { buildApp } from '../../src/app';
import { validMessage, validBoost, validCrowd, portlandLocation, randomUuid } from '../helpers/fixtures';

// POST /users/delete contract tests. The load-bearing behavior is the
// Option B soft-wipe split: messages with surviving (other-user) boosts
// are anonymized; messages without are deleted. Owned crowds are
// orphaned (left standing). Memberships are removed.
describe('User Data Delete API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    await setupTestDb();
    app = await buildApp({
      db: getTestDb(),
      cors: { origin: true, credentials: true },
      logger: false,
    });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTables();
  });

  const postMessage = async (userId: string, overrides = {}) => {
    const response = await app.inject({
      method: 'POST',
      url: '/messages',
      payload: validMessage({ userId, radiusMeters: 5000, ...overrides }),
    });
    return response.json().id as string;
  };

  const boost = async (messageId: string, userId: string) => {
    return app.inject({
      method: 'POST',
      url: `/messages/${messageId}/boost`,
      payload: validBoost({ userId }),
    });
  };

  const wipe = async (userIds: string[]) =>
    app.inject({
      method: 'POST',
      url: '/users/delete',
      payload: { userIds },
    });

  const globalFeed = async () =>
    app.inject({
      method: 'GET',
      url: `/messages/feed?latitude=${portlandLocation.latitude}&longitude=${portlandLocation.longitude}`,
    });

  it('deletes the user\'s message with zero boosts', async () => {
    const userId = randomUuid();
    await postMessage(userId);

    const response = await wipe([userId]);
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe('ok');
    expect(body.messagesDeleted).toBe(1);
    expect(body.messagesAnonymized).toBe(0);

    const feed = await globalFeed();
    expect(feed.json()).toEqual([]);
  });

  it('anonymizes (not deletes) a message that another user has boosted, preserving text and location', async () => {
    const ownerId = randomUuid();
    const boosterId = randomUuid();
    const messageId = await postMessage(ownerId, { text: 'Warning: black ice on 5th' });

    const boostResp = await boost(messageId, boosterId);
    expect(boostResp.statusCode).toBe(200);

    const response = await wipe([ownerId]);
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.messagesAnonymized).toBe(1);
    expect(body.messagesDeleted).toBe(0);

    // The booster still sees the message — and crucially, isOwner is now
    // false even for the original owner (they no longer hold the UUID),
    // but the message itself, its text, and its boost survive.
    const feedResponse = await app.inject({
      method: 'GET',
      url: `/messages/feed?latitude=${portlandLocation.latitude}&longitude=${portlandLocation.longitude}&userId=${boosterId}`,
    });
    const feed = feedResponse.json();
    expect(feed.length).toBe(1);
    expect(feed[0].id).toBe(messageId);
    expect(feed[0].text).toBe('Warning: black ice on 5th');
    expect(feed[0].latitude).toBeCloseTo(portlandLocation.latitude, 4);
    expect(feed[0].longitude).toBeCloseTo(portlandLocation.longitude, 4);
    expect(feed[0].boostCount).toBe(1);
    expect(feed[0].isBoosted).toBe(true);
    expect(feed[0].ownerId).toBeUndefined();
  });

  it('deletes boosts issued by the wiping user and decrements the parent message\'s boostCount', async () => {
    const otherOwner = randomUuid();
    const wipingUser = randomUuid();
    const messageId = await postMessage(otherOwner);

    const boostResp = await boost(messageId, wipingUser);
    expect(boostResp.statusCode).toBe(200);

    // Pre-wipe: boostCount is 1.
    const before = await globalFeed();
    expect(before.json()[0].boostCount).toBe(1);

    const response = await wipe([wipingUser]);
    const body = response.json();
    expect(body.boostsDeleted).toBe(1);

    // The other user's message still exists; boostCount is back to 0.
    const after = await globalFeed();
    const feed = after.json();
    expect(feed.length).toBe(1);
    expect(feed[0].id).toBe(messageId);
    expect(feed[0].boostCount).toBe(0);
  });

  it('removes the wiping user\'s crowd memberships', async () => {
    const ownerOfCrowd = randomUuid();
    const wipingUser = randomUuid();

    // ownerOfCrowd creates an open crowd; wipingUser joins it.
    const createResp = await app.inject({
      method: 'POST',
      url: '/crowds',
      payload: validCrowd({ crowdUserId: ownerOfCrowd, isOpen: true }),
    });
    const crowdId = createResp.json().id;

    await app.inject({
      method: 'POST',
      url: `/crowds/${crowdId}/join`,
      payload: { crowdUserId: wipingUser },
    });

    const response = await wipe([wipingUser]);
    expect(response.json().membershipsRemoved).toBe(1);

    // wipingUser no longer sees the crowd in lookup; owner still does.
    const wipingLookup = await app.inject({
      method: 'POST',
      url: '/crowds/lookup',
      payload: { crowdUserIds: [wipingUser] },
    });
    expect(wipingLookup.json()).toEqual([]);

    const ownerLookup = await app.inject({
      method: 'POST',
      url: '/crowds/lookup',
      payload: { crowdUserIds: [ownerOfCrowd] },
    });
    const ownerCrowds = ownerLookup.json();
    expect(ownerCrowds.length).toBe(1);
    expect(ownerCrowds[0].id).toBe(crowdId);
    // Only the owner's own auto-membership remains.
    expect(ownerCrowds[0].memberCount).toBe(1);
  });

  it('leaves an OPEN crowd owned by the wiping user standing, with other members\' memberships intact', async () => {
    const ownerId = randomUuid();
    const otherMember = randomUuid();

    const createResp = await app.inject({
      method: 'POST',
      url: '/crowds',
      payload: validCrowd({ crowdUserId: ownerId, isOpen: true, name: 'Open survivor' }),
    });
    const crowdId = createResp.json().id;

    await app.inject({
      method: 'POST',
      url: `/crowds/${crowdId}/join`,
      payload: { crowdUserId: otherMember },
    });

    await wipe([ownerId]);

    // Other member still sees the crowd; memberCount reflects owner's
    // membership row being gone but the crowd itself surviving.
    const lookupResp = await app.inject({
      method: 'POST',
      url: '/crowds/lookup',
      payload: { crowdUserIds: [otherMember] },
    });
    const crowds = lookupResp.json();
    expect(crowds.length).toBe(1);
    expect(crowds[0].id).toBe(crowdId);
    expect(crowds[0].name).toBe('Open survivor');
    expect(crowds[0].isOwner).toBe(false);
    expect(crowds[0].memberCount).toBe(1);
  });

  it('leaves a PRIVATE crowd owned by the wiping user standing; its messages remain crowd-scoped and do not leak to the global feed', async () => {
    const ownerId = randomUuid();
    const otherMember = randomUuid();

    const createResp = await app.inject({
      method: 'POST',
      url: '/crowds',
      payload: validCrowd({ crowdUserId: ownerId, isOpen: false, name: 'Private survivor' }),
    });
    const crowdId = createResp.json().id;

    // Owner mints a token while still owner, otherMember consumes it.
    const tokenResp = await app.inject({
      method: 'POST',
      url: `/crowds/${crowdId}/proximity-token`,
      payload: { crowdUserId: ownerId },
    });
    const token = tokenResp.json().token;

    await app.inject({
      method: 'POST',
      url: '/crowds/join-with-token',
      payload: { token, crowdUserId: otherMember },
    });

    // otherMember posts a message inside the private crowd. (Note: the
    // owner cannot also post via ownerId without re-joining as a member,
    // but the bookkeeping for this test cares about the crowd-scoped
    // message surviving — otherMember's post works the same way.)
    await app.inject({
      method: 'POST',
      url: '/messages',
      payload: validMessage({
        userId: otherMember,
        radiusMeters: 5000,
        crowdId,
        text: 'Private channel chatter',
      }),
    });

    await wipe([ownerId]);

    // Crowd survives for otherMember.
    const lookupResp = await app.inject({
      method: 'POST',
      url: '/crowds/lookup',
      payload: { crowdUserIds: [otherMember] },
    });
    const crowds = lookupResp.json();
    expect(crowds.length).toBe(1);
    expect(crowds[0].id).toBe(crowdId);
    expect(crowds[0].isOpen).toBe(false);

    // Crowd-scoped message is still visible inside the crowd.
    const crowdFeed = await app.inject({
      method: 'GET',
      url: `/messages/feed?latitude=${portlandLocation.latitude}&longitude=${portlandLocation.longitude}&userId=${otherMember}&crowdId=${crowdId}`,
    });
    expect(crowdFeed.statusCode).toBe(200);
    const crowdMessages = crowdFeed.json();
    expect(crowdMessages.length).toBe(1);
    expect(crowdMessages[0].text).toBe('Private channel chatter');

    // ...and crucially, it has NOT leaked into the global feed.
    const global = await globalFeed();
    expect(global.json()).toEqual([]);
  });

  it('returns DTO counts that match the actual outcome across mixed cases', async () => {
    const userId = randomUuid();
    const otherUser = randomUuid();

    // Two of the user's messages: one will be deleted (no boosts), one
    // will be anonymized (boosted by otherUser).
    const lonelyMessage = await postMessage(userId, { text: 'lonely' });
    const popularMessage = await postMessage(userId, { text: 'popular' });
    await boost(popularMessage, otherUser);

    // One boost issued BY the wiping user, on a third-party message.
    const thirdPartyOwner = randomUuid();
    const thirdPartyMessage = await postMessage(thirdPartyOwner);
    await boost(thirdPartyMessage, userId);

    // One crowd membership: user joins an open crowd owned by someone else.
    const crowdOwner = randomUuid();
    const createResp = await app.inject({
      method: 'POST',
      url: '/crowds',
      payload: validCrowd({ crowdUserId: crowdOwner, isOpen: true }),
    });
    const crowdId = createResp.json().id;
    await app.inject({
      method: 'POST',
      url: `/crowds/${crowdId}/join`,
      payload: { crowdUserId: userId },
    });

    const response = await wipe([userId]);
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toEqual({
      status: 'ok',
      messagesDeleted: 1,
      messagesAnonymized: 1,
      boostsDeleted: 1,
      membershipsRemoved: 1,
    });

    // Lonely message gone; popular message anonymized and still visible.
    const feed = await app.inject({
      method: 'GET',
      url: `/messages/feed?latitude=${portlandLocation.latitude}&longitude=${portlandLocation.longitude}&userId=${otherUser}`,
    });
    const feedJson = feed.json();
    const texts = feedJson.map((m: { text: string }) => m.text).sort();
    expect(texts).toEqual(['Test message', 'popular']); // 'lonely' is gone; thirdParty default is 'Test message'
    const popular = feedJson.find((m: { text: string }) => m.text === 'popular');
    expect(popular.ownerId).toBeUndefined();
    expect(popular.boostCount).toBe(1);

    // Third-party message survives with boostCount decremented back to 0.
    const thirdParty = feedJson.find((m: { id: string }) => m.id === thirdPartyMessage);
    expect(thirdParty.boostCount).toBe(0);
  });

  it('on a message owned by the user and boosted by BOTH the user (via a second wipe-set UUID) and another user: deletes the user\'s boost, decrements, preserves the other user\'s boost, and anonymizes (not deletes) the message', async () => {
    // The wipe set contains both of the user's UUIDs (e.g. global + a
    // crowd-specific one). The boost endpoint rejects self-boost only
    // when ownerId === body.userId, so a second UUID held by the same
    // device can legitimately boost a message authored by the first —
    // and a wipe must clean up both attributions in one pass.
    const ownerUuid = randomUuid();
    const userSecondUuid = randomUuid();
    const otherUser = randomUuid();

    const messageId = await postMessage(ownerUuid, { text: 'mixed-boost survivor' });

    const selfBoost = await boost(messageId, userSecondUuid);
    expect(selfBoost.statusCode).toBe(200);

    const otherBoost = await boost(messageId, otherUser);
    expect(otherBoost.statusCode).toBe(200);

    // Pre-wipe: boostCount is 2.
    const before = await globalFeed();
    expect(before.json()[0].boostCount).toBe(2);

    const response = await wipe([ownerUuid, userSecondUuid]);
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toEqual({
      status: 'ok',
      messagesDeleted: 0,        // anonymized, not deleted
      messagesAnonymized: 1,
      boostsDeleted: 1,          // the self-boost
      membershipsRemoved: 0,
    });

    // Message survives, anonymized, with the other user's boost intact
    // and boostCount decremented to 1. Text and location preserved.
    const feedResponse = await app.inject({
      method: 'GET',
      url: `/messages/feed?latitude=${portlandLocation.latitude}&longitude=${portlandLocation.longitude}&userId=${otherUser}`,
    });
    const feed = feedResponse.json();
    expect(feed.length).toBe(1);
    expect(feed[0].id).toBe(messageId);
    expect(feed[0].text).toBe('mixed-boost survivor');
    expect(feed[0].latitude).toBeCloseTo(portlandLocation.latitude, 4);
    expect(feed[0].longitude).toBeCloseTo(portlandLocation.longitude, 4);
    expect(feed[0].boostCount).toBe(1);
    expect(feed[0].isBoosted).toBe(true);   // otherUser's boost survived
    expect(feed[0].ownerId).toBeUndefined(); // anonymized
  });

  it('rejects empty userIds with 400', async () => {
    const response = await wipe([]);
    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe('ValidationError');
  });
});
