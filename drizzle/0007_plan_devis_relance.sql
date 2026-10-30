ALTER TABLE `checkout_intents` ADD `relance_step` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `checkout_intents` ADD `relance_next_at` integer;--> statement-breakpoint
CREATE INDEX `intents_relance_idx` ON `checkout_intents` (`relance_next_at`);