import { pgTable, uuid, text, numeric, integer, timestamp, uniqueIndex, boolean } from 'drizzle-orm/pg-core';

// Crowds table - time-limited groups (24 hours)
export const crowds = pgTable('crowds', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  ownerId: uuid('owner_id').notNull(), // Creator's userId
  isOpen: boolean('is_open').default(true).notNull(), // Open vs Closed
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(), // createdAt + 24 hours
});

// Crowd memberships table
export const crowdMemberships = pgTable('crowd_memberships', {
  id: uuid('id').defaultRandom().primaryKey(),
  crowdId: uuid('crowd_id').references(() => crowds.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, (t) => ({
  uniqueMembership: uniqueIndex('unique_crowd_membership').on(t.crowdId, t.userId),
}));

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  text: text('text').notNull(),
  latitude: numeric('latitude').notNull(),
  longitude: numeric('longitude').notNull(),
  radiusMeters: integer('radius_meters').notNull(),
  activeMinutes: integer('active_minutes').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  ownerId: uuid('owner_id'), // Nullable for existing messages, enforced logic in app
  boostCount: integer('boost_count').default(0).notNull(),
  crowdId: uuid('crowd_id').references(() => crowds.id, { onDelete: 'set null' }), // NULL = global feed
});

export const messageBoosts = pgTable('message_boosts', {
  id: uuid('id').defaultRandom().primaryKey(),
  messageId: uuid('message_id').references(() => messages.id).notNull(),
  userId: uuid('user_id').notNull(),
  latitude: numeric('latitude').notNull(),
  longitude: numeric('longitude').notNull(),
  boostedAt: timestamp('boosted_at').defaultNow().notNull(),
}, (t) => ({
  uniqueUserBoost: uniqueIndex('unique_user_boost').on(t.messageId, t.userId),
}));
