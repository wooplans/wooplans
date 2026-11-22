CREATE TABLE `ad_spend` (
	`date` text NOT NULL,
	`campaign_id` text NOT NULL,
	`campaign_name` text NOT NULL,
	`spend_usd` real NOT NULL,
	`product` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`date`, `campaign_id`)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`category` text NOT NULL,
	`label` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text DEFAULT 'XAF' NOT NULL,
	`original_amount` real,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `expenses_date_idx` ON `expenses` (`date`);
--> statement-breakpoint
ALTER TABLE `sales` ADD `prospect_id` text;
