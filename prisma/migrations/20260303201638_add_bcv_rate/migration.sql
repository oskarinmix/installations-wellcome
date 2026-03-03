-- CreateTable
CREATE TABLE "BcvRate" (
    "id" SERIAL NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BcvRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BcvRate_effectiveDate_idx" ON "BcvRate"("effectiveDate");
