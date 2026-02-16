-- CreateEnum
CREATE TYPE "InstallationType" AS ENUM ('FREE', 'PAID');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'BCV');

-- CreateTable
CREATE TABLE "Upload" (
    "id" SERIAL NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Upload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Seller" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Seller_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" SERIAL NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "customerName" TEXT NOT NULL,
    "sellerName" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "referenceCode" TEXT,
    "installationType" "InstallationType" NOT NULL,
    "currency" "Currency" NOT NULL,
    "subscriptionAmount" DOUBLE PRECISION NOT NULL,
    "uploadId" INTEGER NOT NULL,
    "sellerId" INTEGER NOT NULL,
    "planId" INTEGER NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Seller_name_key" ON "Seller"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_name_key" ON "Plan"("name");

-- CreateIndex
CREATE INDEX "Sale_sellerName_idx" ON "Sale"("sellerName");

-- CreateIndex
CREATE INDEX "Sale_transactionDate_idx" ON "Sale"("transactionDate");

-- CreateIndex
CREATE INDEX "Sale_zone_idx" ON "Sale"("zone");

-- CreateIndex
CREATE INDEX "Sale_uploadId_idx" ON "Sale"("uploadId");

-- CreateIndex
CREATE INDEX "Sale_sellerId_idx" ON "Sale"("sellerId");

-- CreateIndex
CREATE INDEX "Sale_planId_idx" ON "Sale"("planId");

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
