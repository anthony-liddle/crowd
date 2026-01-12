CREATE TABLE "message_boosts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"latitude" numeric NOT NULL,
	"longitude" numeric NOT NULL,
	"boosted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "owner_id" uuid;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "boost_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "message_boosts" ADD CONSTRAINT "message_boosts_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_user_boost" ON "message_boosts" USING btree ("message_id","user_id");