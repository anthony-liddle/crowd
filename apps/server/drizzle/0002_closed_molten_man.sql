CREATE TABLE "crowd_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"crowd_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crowds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"owner_id" uuid NOT NULL,
	"is_open" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "crowd_id" uuid;--> statement-breakpoint
ALTER TABLE "crowd_memberships" ADD CONSTRAINT "crowd_memberships_crowd_id_crowds_id_fk" FOREIGN KEY ("crowd_id") REFERENCES "public"."crowds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_crowd_membership" ON "crowd_memberships" USING btree ("crowd_id","user_id");--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_crowd_id_crowds_id_fk" FOREIGN KEY ("crowd_id") REFERENCES "public"."crowds"("id") ON DELETE set null ON UPDATE no action;