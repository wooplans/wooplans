-- AlterTable
ALTER TABLE "Subscriber" ADD COLUMN "premiumCode" TEXT;

-- CreateTable
CREATE TABLE "FunnelSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "landingPath" TEXT NOT NULL,
    "referrer" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "utmTerm" TEXT,
    "fbclidPresent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FunnelEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "ctaId" TEXT,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FunnelEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "FunnelSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FunnelSale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT,
    "chariowSaleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FunnelSale_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "FunnelSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "FunnelSession_source_idx" ON "FunnelSession"("source");

-- CreateIndex
CREATE INDEX "FunnelSession_landingPath_idx" ON "FunnelSession"("landingPath");

-- CreateIndex
CREATE INDEX "FunnelSession_createdAt_idx" ON "FunnelSession"("createdAt");

-- CreateIndex
CREATE INDEX "FunnelEvent_sessionId_idx" ON "FunnelEvent"("sessionId");

-- CreateIndex
CREATE INDEX "FunnelEvent_type_idx" ON "FunnelEvent"("type");

-- CreateIndex
CREATE INDEX "FunnelEvent_path_idx" ON "FunnelEvent"("path");

-- CreateIndex
CREATE INDEX "FunnelEvent_ctaId_idx" ON "FunnelEvent"("ctaId");

-- CreateIndex
CREATE INDEX "FunnelEvent_createdAt_idx" ON "FunnelEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FunnelSale_chariowSaleId_key" ON "FunnelSale"("chariowSaleId");

-- CreateIndex
CREATE INDEX "FunnelSale_sessionId_idx" ON "FunnelSale"("sessionId");

-- CreateIndex
CREATE INDEX "FunnelSale_chariowSaleId_idx" ON "FunnelSale"("chariowSaleId");

-- CreateIndex
CREATE INDEX "FunnelSale_status_idx" ON "FunnelSale"("status");

-- CreateIndex
CREATE INDEX "FunnelSale_createdAt_idx" ON "FunnelSale"("createdAt");
