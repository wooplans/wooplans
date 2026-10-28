ALTER TABLE `media` ADD `plan_id` text;--> statement-breakpoint
ALTER TABLE `media` ADD `kind` text;--> statement-breakpoint
ALTER TABLE `media` ADD `source_key` text;--> statement-breakpoint
ALTER TABLE `media` ADD `delete_after` integer;--> statement-breakpoint
CREATE INDEX `media_plan_idx` ON `media` (`plan_id`);--> statement-breakpoint
CREATE INDEX `media_delete_after_idx` ON `media` (`delete_after`);