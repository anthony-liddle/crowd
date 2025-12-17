import { pgTable, uuid, text, numeric, integer, timestamp, geometry } from 'drizzle-orm/pg-core';

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  text: text('text').notNull(),
  latitude: numeric('latitude').notNull(),
  longitude: numeric('longitude').notNull(),
  radiusMeters: integer('radius_meters').notNull(),
  activeMinutes: integer('active_minutes').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  // PostGIS point: geometry(Point, 4326)
  location: geometry('location', { type: 'point', mode: 'xy', srid: 4326 }),
});
