CREATE TABLE `email_optouts` (
	`email` text NOT NULL,
	`scope` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`email`, `scope`)
);
--> statement-breakpoint
CREATE TABLE `prospects` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`phone` text,
	`country` text,
	`status` text DEFAULT 'open' NOT NULL,
	`last_event` text NOT NULL,
	`last_event_at` integer NOT NULL,
	`last_sale_id` text,
	`amount` integer,
	`source` text NOT NULL,
	`utm_source` text,
	`utm_campaign` text,
	`sequence_step` integer DEFAULT 0 NOT NULL,
	`sequence_started_at` integer,
	`next_email_at` integer,
	`last_email_at` integer,
	`converted_at` integer,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `prospects_email_idx` ON `prospects` (`email`);--> statement-breakpoint
CREATE INDEX `prospects_status_idx` ON `prospects` (`status`,`last_event_at`);--> statement-breakpoint
CREATE INDEX `prospects_next_email_idx` ON `prospects` (`next_email_at`);--> statement-breakpoint
CREATE INDEX `email_log_member_idx` ON `email_log` (`member_id`,`template`);