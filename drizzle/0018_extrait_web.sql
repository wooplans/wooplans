CREATE TABLE `extrait_events` (
	`id` text PRIMARY KEY NOT NULL,
	`intent_id` text NOT NULL,
	`email` text,
	`type` text NOT NULL,
	`plan_slug` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `extrait_events_intent_idx` ON `extrait_events` (`intent_id`);
--> statement-breakpoint
CREATE INDEX `extrait_events_email_idx` ON `extrait_events` (`email`);
