ALTER TABLE `members` ADD `testimonial_asked_at` integer;--> statement-breakpoint
ALTER TABLE `members` ADD `testimonial_ask_count` integer DEFAULT 0 NOT NULL;