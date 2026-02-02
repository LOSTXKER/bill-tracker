-- CreateTable
CREATE TABLE "CompanyConfig" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "CompanyConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyConfig_companyId_idx" ON "CompanyConfig"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyConfig_companyId_key_key" ON "CompanyConfig"("companyId", "key");

-- AddForeignKey
ALTER TABLE "CompanyConfig" ADD CONSTRAINT "CompanyConfig_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
