import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/monorepo_db",
  },
  schemaFilter: ['public'],
  tablesFilter: ["crowds", "crowd_memberships", "messages", "message_boosts"],
});

