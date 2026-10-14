-- CreateTable
CREATE TABLE "WebhookReceipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subscriberId" TEXT NOT NULL,
    "modelSlug" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "terrain" TEXT NOT NULL,
    "needs" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'received',
    "notes" TEXT NOT NULL DEFAULT '',
    "nextFollowUp" DATETIME,
    "grossPrice" INTEGER NOT NULL DEFAULT 0,
    "catalogueCredit" INTEGER NOT NULL DEFAULT 0,
    "paidAmount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subscriberId" TEXT NOT NULL,
    "modelSlug" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Project_subscriberId_idx" ON "Project"("subscriberId");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_subscriberId_modelSlug_key" ON "Favorite"("subscriberId", "modelSlug");


CREATE TABLE "AuthAttempt" ("id" TEXT NOT NULL PRIMARY KEY, "count" INTEGER NOT NULL DEFAULT 0);
