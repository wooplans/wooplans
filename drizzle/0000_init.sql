CREATE TABLE `admins` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admins_email_idx` ON `admins` (`email`);--> statement-breakpoint
CREATE TABLE `checkout_intents` (
	`id` text PRIMARY KEY NOT NULL,
	`visitor_id` text,
	`email` text,
	`cta_id` text,
	`status` text DEFAULT 'started' NOT NULL,
	`sale_id` text,
	`reveal_code` text,
	`reveal_until` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `intents_email_idx` ON `checkout_intents` (`email`);--> statement-breakpoint
CREATE INDEX `intents_created_idx` ON `checkout_intents` (`created_at`);--> statement-breakpoint
CREATE TABLE `email_log` (
	`id` text PRIMARY KEY NOT NULL,
	`to` text NOT NULL,
	`template` text NOT NULL,
	`subject` text NOT NULL,
	`status` text NOT NULL,
	`provider_id` text,
	`error` text,
	`member_id` text,
	`lead_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `email_log_created_idx` ON `email_log` (`created_at`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`visitor_id` text NOT NULL,
	`type` text NOT NULL,
	`path` text NOT NULL,
	`cta_id` text,
	`plan_slug` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `events_visitor_idx` ON `events` (`visitor_id`);--> statement-breakpoint
CREATE INDEX `events_type_created_idx` ON `events` (`type`,`created_at`);--> statement-breakpoint
CREATE TABLE `favorites` (
	`member_id` text NOT NULL,
	`plan_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`member_id`, `plan_id`),
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `lead_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`kind` text NOT NULL,
	`body` text NOT NULL,
	`author` text DEFAULT 'admin' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `lead_activities_lead_idx` ON `lead_activities` (`lead_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `lead_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`amount` integer NOT NULL,
	`method` text DEFAULT 'mobile_money' NOT NULL,
	`reference` text,
	`paid_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`note` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `lead_payments_lead_idx` ON `lead_payments` (`lead_id`);--> statement-breakpoint
CREATE INDEX `lead_payments_paid_idx` ON `lead_payments` (`paid_at`);--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`email` text,
	`country` text,
	`city` text,
	`member_id` text,
	`plan_id` text,
	`plan_label` text,
	`channel` text DEFAULT 'site' NOT NULL,
	`stage` text DEFAULT 'demande' NOT NULL,
	`project_details` text DEFAULT '' NOT NULL,
	`land_details` text DEFAULT '' NOT NULL,
	`budget` integer,
	`agreed_price` integer,
	`catalogue_credit` integer DEFAULT 0 NOT NULL,
	`next_follow_up_at` integer,
	`lost_reason` text,
	`utm_source` text,
	`utm_campaign` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `leads_stage_idx` ON `leads` (`stage`);--> statement-breakpoint
CREATE INDEX `leads_follow_idx` ON `leads` (`next_follow_up_at`);--> statement-breakpoint
CREATE TABLE `media` (
	`key` text PRIMARY KEY NOT NULL,
	`visibility` text NOT NULL,
	`content_type` text DEFAULT 'application/octet-stream' NOT NULL,
	`size` integer DEFAULT 0 NOT NULL,
	`label` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `media_visibility_idx` ON `media` (`visibility`);--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`phone` text,
	`country` text,
	`status` text DEFAULT 'active' NOT NULL,
	`code_hash` text NOT NULL,
	`session_version` integer DEFAULT 1 NOT NULL,
	`source` text NOT NULL,
	`chariow_customer_id` text,
	`revoked_at` integer,
	`revoked_reason` text,
	`last_login_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `members_email_idx` ON `members` (`email`);--> statement-breakpoint
CREATE INDEX `members_status_idx` ON `members` (`status`);--> statement-breakpoint
CREATE TABLE `plans` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`seo_title` text,
	`seo_description` text,
	`bedrooms` integer DEFAULT 0 NOT NULL,
	`bathrooms` integer DEFAULT 0 NOT NULL,
	`levels` integer DEFAULT 1 NOT NULL,
	`surface_total` integer DEFAULT 0 NOT NULL,
	`footprint` integer,
	`building_width` real,
	`building_depth` real,
	`land_area` integer,
	`land_width` real,
	`land_depth` real,
	`budget_min` integer,
	`budget_max` integer,
	`cover_image` text DEFAULT '' NOT NULL,
	`renders` text DEFAULT '[]' NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`rooms` text DEFAULT '[]' NOT NULL,
	`floor_plans` text DEFAULT '[]' NOT NULL,
	`estimate_total` integer,
	`estimate_lots` text DEFAULT '[]' NOT NULL,
	`cost_assumptions` text DEFAULT '' NOT NULL,
	`strengths` text DEFAULT '[]' NOT NULL,
	`watchouts` text DEFAULT '[]' NOT NULL,
	`premium_notes` text DEFAULT '' NOT NULL,
	`published_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plans_slug_idx` ON `plans` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `plans_code_idx` ON `plans` (`code`);--> statement-breakpoint
CREATE INDEX `plans_status_idx` ON `plans` (`status`);--> statement-breakpoint
CREATE INDEX `plans_category_idx` ON `plans` (`category`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`window_start` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sales` (
	`id` text PRIMARY KEY NOT NULL,
	`chariow_sale_id` text NOT NULL,
	`product_id` text NOT NULL,
	`product_name` text NOT NULL,
	`status` text NOT NULL,
	`amount` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'XAF' NOT NULL,
	`email` text,
	`name` text,
	`phone` text,
	`country` text,
	`member_id` text,
	`intent_id` text,
	`visitor_id` text,
	`utm_source` text,
	`utm_campaign` text,
	`source` text,
	`occurred_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sales_chariow_idx` ON `sales` (`chariow_sale_id`);--> statement-breakpoint
CREATE INDEX `sales_status_idx` ON `sales` (`status`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `sales_email_idx` ON `sales` (`email`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `visitors` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`landing_path` text NOT NULL,
	`referrer` text,
	`utm_source` text,
	`utm_medium` text,
	`utm_campaign` text,
	`utm_content` text,
	`utm_term` text,
	`fbclid` integer DEFAULT false NOT NULL,
	`country` text,
	`device` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`last_seen_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `visitors_created_idx` ON `visitors` (`created_at`);--> statement-breakpoint
CREATE INDEX `visitors_source_idx` ON `visitors` (`source`);--> statement-breakpoint
CREATE TABLE `webhook_deliveries` (
	`delivery_id` text PRIMARY KEY NOT NULL,
	`event` text NOT NULL,
	`sale_id` text,
	`outcome` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
