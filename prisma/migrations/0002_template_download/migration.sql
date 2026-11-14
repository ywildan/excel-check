-- CreateTable
CREATE TABLE "TemplateDownload" (
    "id" TEXT NOT NULL,
    "issuedId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'generator',
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateDownload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TemplateDownload_issuedId_key" ON "TemplateDownload"("issuedId");

-- CreateIndex
CREATE INDEX "TemplateDownload_createdAt_idx" ON "TemplateDownload"("createdAt");
