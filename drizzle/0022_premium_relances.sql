ALTER TABLE `members` ADD `premium_wa_step` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `members` ADD `premium_wa_last_at` integer;
