ALTER TABLE `prospects` ADD `wa_step` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `prospects` ADD `wa_next_at` integer;--> statement-breakpoint
ALTER TABLE `prospects` ADD `wa_last_sent_at` integer;--> statement-breakpoint
ALTER TABLE `prospects` ADD `wa_read_at` integer;--> statement-breakpoint
ALTER TABLE `prospects` ADD `wa_clicked_at` integer;--> statement-breakpoint
ALTER TABLE `prospects` ADD `wa_replied_at` integer;--> statement-breakpoint
ALTER TABLE `prospects` ADD `wa_opt_out_at` integer;--> statement-breakpoint
ALTER TABLE `prospects` ADD `pipeline_stage` text;--> statement-breakpoint
ALTER TABLE `prospects` ADD `pipeline_updated_at` integer;--> statement-breakpoint
CREATE INDEX `prospects_wa_next_idx` ON `prospects` (`wa_next_at`);--> statement-breakpoint
CREATE INDEX `prospects_pipeline_idx` ON `prospects` (`pipeline_stage`);--> statement-breakpoint
-- Acheteurs du guide d'avant la séquence WhatsApp : relancés à la main par Tao, sans réponse → « froid » (déplaçables dans l'admin).
UPDATE `prospects` SET `pipeline_stage` = CASE WHEN `status` = 'converted' THEN 'client' ELSE 'froid' END, `pipeline_updated_at` = CAST(strftime('%s','now') AS INTEGER) * 1000 WHERE `source` = 'guide' OR `sequence_kind` = 'guide';
