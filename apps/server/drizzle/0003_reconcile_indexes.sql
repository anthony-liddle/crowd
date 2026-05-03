CREATE INDEX "crowds_owner_id_idx" ON "crowds" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "crowds_expires_at_idx" ON "crowds" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "message_boosts_message_id_idx" ON "message_boosts" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "messages_owner_id_idx" ON "messages" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "messages_expires_at_idx" ON "messages" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "messages_crowd_id_idx" ON "messages" USING btree ("crowd_id");--> statement-breakpoint
CREATE INDEX "idx_messages_active_geo" ON "messages" USING btree ("expires_at","latitude","longitude");