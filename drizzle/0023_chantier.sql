CREATE TABLE `chantier_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`terrain` text NOT NULL,
	`start` text NOT NULL,
	`plans` text NOT NULL,
	`house_type` text NOT NULL,
	`bedrooms` text NOT NULL,
	`budget` text NOT NULL,
	`profile` text NOT NULL,
	`utm_source` text,
	`utm_campaign` text,
	`utm_content` text,
	`phone` text,
	`country` text,
	`linked_at` integer,
	`lead_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chantier_requests_code_idx` ON `chantier_requests` (`code`);
--> statement-breakpoint
CREATE INDEX `chantier_requests_created_idx` ON `chantier_requests` (`created_at`);
