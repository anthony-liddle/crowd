CREATE TABLE "proximity_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"crowd_id" uuid NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "proximity_tokens" ADD CONSTRAINT "proximity_tokens_crowd_id_crowds_id_fk" FOREIGN KEY ("crowd_id") REFERENCES "public"."crowds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_proximity_token" ON "proximity_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "proximity_tokens_crowd_id_idx" ON "proximity_tokens" USING btree ("crowd_id");