ALTER TABLE `checkout_intents` ADD `plan_slug` text;--> statement-breakpoint
ALTER TABLE `checkout_intents` ADD `downloads` integer DEFAULT 0 NOT NULL;