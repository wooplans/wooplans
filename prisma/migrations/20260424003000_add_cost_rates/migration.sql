-- CreateTable
CREATE TABLE "CostRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "region" TEXT NOT NULL DEFAULT 'default',
    "amountPerSquareMeter" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "CostRate_category_region_key" ON "CostRate"("category", "region");

-- CreateIndex
CREATE INDEX "CostRate_category_idx" ON "CostRate"("category");

-- CreateIndex
CREATE INDEX "CostRate_region_idx" ON "CostRate"("region");

-- SeedDefaults
INSERT OR IGNORE INTO "CostRate" ("id", "category", "region", "amountPerSquareMeter", "createdAt", "updatedAt")
VALUES
  ('default-villa', 'villa', 'default', 150000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default-duplex', 'duplex', 'default', 180000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
