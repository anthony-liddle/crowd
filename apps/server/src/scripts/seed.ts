import { db } from '../db/index';
import { messages, messageBoosts, crowds, crowdMemberships } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

/**
 * Dev seed script.
 *
 * DESTRUCTIVE: truncates message_boosts, messages, crowd_memberships, and
 * crowds before re-inserting. Safe to run repeatedly — the data shape (row
 * counts, relationships, geographic spread) is fixed across runs; only the
 * generated UUIDs and timestamps shift.
 *
 * Tunables are constants at the top.
 */

// Geographic center for seeded data: Aloha, OR. Matches the mobile app's
// DEFAULT_LOCATION in apps/mobile/src/services/api.ts so the simulator's
// default feed surfaces these messages.
const CENTER = { lat: 45.46948, lng: -122.863 };

// Real Portland-area landmarks, sorted by great-circle distance from CENTER.
// Distances were computed with the same haversine formula the feed query
// uses; recompute if CENTER ever changes.
const SPOTS = [
  { name: 'THPRD Conestoga Rec Center',  lat: 45.4665,    lng: -122.8732    }, // 0.86 km
  { name: 'Aloha Community Library',     lat: 45.480601,  lng: -122.8562917 }, // 1.34 km
  { name: 'Aloha High School',           lat: 45.487,     lng: -122.8728    }, // 2.09 km
  { name: 'Tualatin Hills Nature Park',  lat: 45.502,     lng: -122.8265    }, // 4.60 km
  { name: 'The Round at Beaverton',      lat: 45.4895,    lng: -122.803     }, // 5.18 km
  { name: 'Beaverton City Library',      lat: 45.49,      lng: -122.803     }, // 5.20 km
  { name: 'Nike World Headquarters',     lat: 45.5074,    lng: -122.8076    }, // 6.04 km
  { name: 'Intel Ronler Acres',          lat: 45.5395,    lng: -122.8865    }, // 8.00 km
];

const MIN = 60_000;
const HOUR = 60 * MIN;

// Stable user UUIDs so messages, memberships, and boosts can cross-reference
// by readable names below. These are RFC 4122 v4-shaped (version nibble = 4,
// variant nibble = 8) so they pass Zod's strict UUID validation if a dev
// reuses them as API inputs while testing.
const USERS = {
  alice: '11111111-1111-4111-8111-111111111111',
  bob:   '22222222-2222-4222-8222-222222222222',
  carol: '33333333-3333-4333-8333-333333333333',
  dave:  '44444444-4444-4444-8444-444444444444',
  eve:   '55555555-5555-4555-8555-555555555555',
};

async function seed() {
  const now = Date.now();

  console.log('[seed] truncating existing data…');
  await db.execute(
    sql`TRUNCATE message_boosts, messages, crowd_memberships, crowds RESTART IDENTITY CASCADE`,
  );

  console.log('[seed] inserting crowds…');
  const insertedCrowds = await db
    .insert(crowds)
    .values([
      // Fresh open crowd, ~23h left.
      {
        name: 'Aloha Book Club',
        ownerId: USERS.alice,
        isOpen: true,
        createdAt: new Date(now - 1 * HOUR),
        expiresAt: new Date(now + 23 * HOUR),
      },
      // Open crowd near expiration, ~2h left.
      {
        name: 'Aloha Block Party',
        ownerId: USERS.bob,
        isOpen: true,
        createdAt: new Date(now - 22 * HOUR),
        expiresAt: new Date(now + 2 * HOUR),
      },
      // Closed/private crowd, fresh.
      {
        name: 'Aloha HS Study Group',
        ownerId: USERS.carol,
        isOpen: false,
        createdAt: new Date(now - 30 * MIN),
        expiresAt: new Date(now + 23 * HOUR + 30 * MIN),
      },
      // Open crowd at half-life, ~12h left.
      {
        name: 'Nature Park Late Night',
        ownerId: USERS.dave,
        isOpen: true,
        createdAt: new Date(now - 12 * HOUR),
        expiresAt: new Date(now + 12 * HOUR),
      },
    ])
    .returning({ id: crowds.id, name: crowds.name });

  const C: Record<string, string> = {};
  for (const c of insertedCrowds) C[c.name] = c.id;

  console.log('[seed] inserting memberships…');
  const memberships = [
    { crowdId: C['Aloha Book Club'],    userId: USERS.alice }, // owner
    { crowdId: C['Aloha Book Club'],    userId: USERS.bob },
    { crowdId: C['Aloha Book Club'],    userId: USERS.carol },
    { crowdId: C['Aloha Block Party'],      userId: USERS.bob }, // owner
    { crowdId: C['Aloha Block Party'],      userId: USERS.alice },
    { crowdId: C['Aloha Block Party'],      userId: USERS.dave },
    { crowdId: C['Aloha Block Party'],      userId: USERS.eve },
    { crowdId: C['Aloha HS Study Group'],   userId: USERS.carol }, // owner only — empty private crowd
    { crowdId: C['Nature Park Late Night'], userId: USERS.dave }, // owner
    { crowdId: C['Nature Park Late Night'], userId: USERS.eve },
    { crowdId: C['Nature Park Late Night'], userId: USERS.alice },
  ];
  await db.insert(crowdMemberships).values(memberships);

  console.log('[seed] inserting messages…');
  type MsgInput = {
    text: string;
    spot: (typeof SPOTS)[number];
    activeMinutes: number;
    radiusMeters: number;
    createdAgoMs: number;
    ownerId: string;
    crowdName: string | null;
  };
  // Radii are sized so each message's distance from CENTER fits inside its
  // radius — except the deliberate out-of-range demo on Intel Ronler Acres
  // (8 km away with a 1 km radius). Recompute if CENTER or SPOTS change.
  const msgInputs: MsgInput[] = [
    // ---------- global feed (crowdId = null) ----------
    // dist 1.34 km, radius 2 km → visible
    { text: 'Free coffee at the library cart',        spot: SPOTS[1], activeMinutes: 5,   radiusMeters: 2000, createdAgoMs: 1 * MIN,  ownerId: USERS.alice, crowdName: null },
    // dist 4.60 km, radius 5 km → visible
    { text: 'Lost dog near the park — orange tag',    spot: SPOTS[3], activeMinutes: 60,  radiusMeters: 5000, createdAgoMs: 30 * MIN, ownerId: USERS.bob,   crowdName: null },
    // dist 5.18 km, radius 6 km → visible
    { text: 'Open mic tonight at the brewery',        spot: SPOTS[4], activeMinutes: 480, radiusMeters: 6000, createdAgoMs: 2 * HOUR, ownerId: USERS.carol, crowdName: null },
    // dist 8.00 km, radius 1 km → OUT OF RANGE (deliberate radius-filter demo)
    { text: 'Anyone got a phone charger?',            spot: SPOTS[7], activeMinutes: 60,  radiusMeters: 1000, createdAgoMs: 30 * MIN, ownerId: USERS.eve,   crowdName: null },
    // ---------- Aloha Book Club (anchor: Aloha Community Library) ----------
    { text: 'Meeting on the 3rd floor at 7',          spot: SPOTS[1], activeMinutes: 60,  radiusMeters: 2000, createdAgoMs: 5 * MIN,  ownerId: USERS.alice, crowdName: 'Aloha Book Club' },
    { text: 'Brought extra copies if anyone needs',   spot: SPOTS[1], activeMinutes: 480, radiusMeters: 1500, createdAgoMs: 20 * MIN, ownerId: USERS.bob,   crowdName: 'Aloha Book Club' },
    { text: 'Running 10 min late, sorry',             spot: SPOTS[1], activeMinutes: 5,   radiusMeters: 2000, createdAgoMs: 1 * MIN,  ownerId: USERS.carol, crowdName: 'Aloha Book Club' },
    // ---------- Aloha Block Party (anchor: THPRD Conestoga) ----------
    { text: 'Tacos at the corner — 30 left',          spot: SPOTS[0], activeMinutes: 60,  radiusMeters: 1500, createdAgoMs: 15 * MIN, ownerId: USERS.bob,   crowdName: 'Aloha Block Party' },
    { text: 'Live music kicking off shortly',         spot: SPOTS[0], activeMinutes: 480, radiusMeters: 2500, createdAgoMs: 1 * HOUR, ownerId: USERS.alice, crowdName: 'Aloha Block Party' },
    { text: 'Anyone seen a green skateboard?',        spot: SPOTS[2], activeMinutes: 60,  radiusMeters: 3000, createdAgoMs: 40 * MIN, ownerId: USERS.dave,  crowdName: 'Aloha Block Party' },
    // ---------- Nature Park Late Night (anchor: Tualatin Hills Nature Park) ----------
    { text: 'Night hike kicking off at 10 — 8 spots', spot: SPOTS[3], activeMinutes: 480, radiusMeters: 5000, createdAgoMs: 4 * HOUR, ownerId: USERS.dave,  crowdName: 'Nature Park Late Night' },
    { text: "Found someone's glasses by the entrance", spot: SPOTS[3], activeMinutes: 60, radiusMeters: 5000, createdAgoMs: 25 * MIN, ownerId: USERS.eve,   crowdName: 'Nature Park Late Night' },
  ];

  const insertedMessages = await db
    .insert(messages)
    .values(
      msgInputs.map((m) => {
        const createdAt = new Date(now - m.createdAgoMs);
        const expiresAt = new Date(createdAt.getTime() + m.activeMinutes * MIN);
        return {
          text: m.text,
          latitude: m.spot.lat.toString(),
          longitude: m.spot.lng.toString(),
          radiusMeters: m.radiusMeters,
          activeMinutes: m.activeMinutes,
          createdAt,
          expiresAt,
          ownerId: m.ownerId,
          boostCount: 0,
          crowdId: m.crowdName ? C[m.crowdName] : null,
        };
      }),
    )
    .returning({ id: messages.id });

  console.log('[seed] inserting message boosts…');
  // Boost rules (enforced by the API too): a user can't boost their own
  // message, and each (message, user) pair is unique. The plan below picks
  // boosters that don't own the message.
  const boostPlan: { msgIdx: number; boosters: string[] }[] = [
    { msgIdx: 1, boosters: [USERS.carol, USERS.dave] },           // global lost-dog
    { msgIdx: 2, boosters: [USERS.alice] },                       // global open-mic
    { msgIdx: 4, boosters: [USERS.bob, USERS.carol, USERS.eve] }, // Aloha Book Club meeting
    { msgIdx: 7, boosters: [USERS.alice] },                       // Aloha Block Party tacos
  ];

  const boostInserts = boostPlan.flatMap(({ msgIdx, boosters }) => {
    const msg = insertedMessages[msgIdx];
    const spot = msgInputs[msgIdx].spot;
    return boosters.map((userId) => ({
      messageId: msg.id,
      userId,
      // Boosts happened "near" the original — small offset so the haversine
      // closest-boost path has something to chew on.
      latitude: (spot.lat + 0.001).toString(),
      longitude: (spot.lng + 0.001).toString(),
    }));
  });

  await db.insert(messageBoosts).values(boostInserts);

  for (const { msgIdx, boosters } of boostPlan) {
    await db
      .update(messages)
      .set({ boostCount: boosters.length })
      .where(eq(messages.id, insertedMessages[msgIdx].id));
  }

  const globalCount = msgInputs.filter((m) => !m.crowdName).length;
  const crowdCount = msgInputs.length - globalCount;
  console.log('[seed] done:');
  console.log(`  crowds:       ${insertedCrowds.length}`);
  console.log(`  memberships:  ${memberships.length}`);
  console.log(`  messages:     ${insertedMessages.length} (${globalCount} global, ${crowdCount} in crowds)`);
  console.log(`  boosts:       ${boostInserts.length} across ${boostPlan.length} message(s)`);
  console.log(`  geo center:   ${CENTER.lat}, ${CENTER.lng} (Aloha, OR)`);

  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
