ALTER TABLE "Plan" ADD COLUMN "cataloguePreview" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Plan_cataloguePreview_idx" ON "Plan"("cataloguePreview");
