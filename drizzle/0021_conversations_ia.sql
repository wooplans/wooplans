CREATE TABLE `wa_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`prospect_id` text,
	`phone` text NOT NULL,
	`direction` text NOT NULL,
	`type` text NOT NULL,
	`body` text,
	`transcript` text,
	`media_status` text,
	`sent_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `wa_messages_prospect_idx` ON `wa_messages` (`prospect_id`, `sent_at`);
--> statement-breakpoint
CREATE INDEX `wa_messages_media_idx` ON `wa_messages` (`media_status`);
--> statement-breakpoint
ALTER TABLE `prospects` ADD `ai_stage` text;
--> statement-breakpoint
ALTER TABLE `prospects` ADD `ai_score` integer;
--> statement-breakpoint
ALTER TABLE `prospects` ADD `ai_summary` text;
--> statement-breakpoint
ALTER TABLE `prospects` ADD `ai_next_action` text;
--> statement-breakpoint
ALTER TABLE `prospects` ADD `ai_updated_at` integer;
--> statement-breakpoint
ALTER TABLE `prospects` ADD `last_inbound_at` integer;
