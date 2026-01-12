import { pgTable, uuid, text, numeric, integer, timestamp, uniqueIndex, boolean } from 'drizzle-orm/pg-core';

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
