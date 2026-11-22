CREATE TABLE `video_events` (
	`id` text PRIMARY KEY NOT NULL,
	`prospect_id` text,
	`video` text NOT NULL,
	`event` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `video_events_prospect_idx` ON `video_events` (`prospect_id`);
