ALTER TABLE `members` ADD `testimonial_received_at` integer;--> statement-breakpoint
ALTER TABLE `members` ADD `after_sale_step` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `members` ADD `after_sale_next_at` integer;--> statement-breakpoint
CREATE INDEX `members_after_sale_idx` ON `members` (`after_sale_next_at`);--> statement-breakpoint
ALTER TABLE `prospects` ADD `sequence_kind` text DEFAULT 'relance' NOT NULL;