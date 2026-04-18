-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Plan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "surface" INTEGER NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "bathrooms" INTEGER NOT NULL,
    "floors" INTEGER NOT NULL,
    "rooms" TEXT NOT NULL,
    "images" TEXT NOT NULL,
    "thumbnail" TEXT NOT NULL,
    "estimatedCost" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostImage" TEXT NOT NULL DEFAULT '',
    "distributionPlans" TEXT NOT NULL DEFAULT '[]',
    "distributionPlanUrl" TEXT NOT NULL DEFAULT '',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Plan" ("bathrooms", "bedrooms", "category", "createdAt", "description", "distributionPlanUrl", "estimatedCost", "featured", "floors", "id", "images", "name", "published", "rooms", "slug", "surface", "thumbnail", "updatedAt") SELECT "bathrooms", "bedrooms", "category", "createdAt", "description", "distributionPlanUrl", "estimatedCost", "featured", "floors", "id", "images", "name", "published", "rooms", "slug", "surface", "thumbnail", "updatedAt" FROM "Plan";
DROP TABLE "Plan";
ALTER TABLE "new_Plan" RENAME TO "Plan";
CREATE UNIQUE INDEX "Plan_slug_key" ON "Plan"("slug");
CREATE INDEX "Plan_category_idx" ON "Plan"("category");
CREATE INDEX "Plan_featured_idx" ON "Plan"("featured");
CREATE INDEX "Plan_published_idx" ON "Plan"("published");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
