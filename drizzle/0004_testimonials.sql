CREATE TABLE `testimonial_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text,
	`name` text NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`kind` text NOT NULL,
	`media_key` text NOT NULL,
	`content_type` text NOT NULL,
	`size` integer DEFAULT 0 NOT NULL,
	`duration_sec` integer,
	`quote` text DEFAULT '' NOT NULL,
	`consent` integer DEFAULT false NOT NULL,
	`first_name_only` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `testimonial_submissions_status_idx` ON `testimonial_submissions` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `testimonial_submissions_member_idx` ON `testimonial_submissions` (`member_id`);--> statement-breakpoint
ALTER TABLE `members` ADD `testimonial_asked_at` integer;--> statement-breakpoint
ALTER TABLE `members` ADD `testimonial_ask_count` integer DEFAULT 0 NOT NULL;