CREATE TABLE `pdf_downloads` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`plan_slug` text NOT NULL,
	`plan_code` text NOT NULL,
	`mark_id` text NOT NULL,
	`ip` text,
	`country` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `pdf_downloads_member_idx` ON `pdf_downloads` (`member_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `pdf_downloads_mark_idx` ON `pdf_downloads` (`mark_id`);