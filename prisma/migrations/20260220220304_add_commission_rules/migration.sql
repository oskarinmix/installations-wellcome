-- CreateEnum
CREATE TYPE "CommissionValueType" AS ENUM ('FIXED', 'PERCENTAGE');

-- AlterTable
ALTER TABLE "Seller" ADD COLUMN     "commissionRuleId" INTEGER;

-- CreateTable
CREATE TABLE "CommissionRule" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sellerFreeType" "CommissionValueType" NOT NULL,
    "sellerFreeValue" DOUBLE PRECISION NOT NULL,
    "sellerPaidType" "CommissionValueType" NOT NULL,
    "sellerPaidValue" DOUBLE PRECISION NOT NULL,
    "installerFreeType" "CommissionValueType" NOT NULL,
    "installerFreeValue" DOUBLE PRECISION NOT NULL,
    "installerPaidType" "CommissionValueType" NOT NULL,
    "installerPaidValue" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CommissionRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommissionRule_name_key" ON "CommissionRule"("name");

-- AddForeignKey
ALTER TABLE "Seller" ADD CONSTRAINT "Seller_commissionRuleId_fkey" FOREIGN KEY ("commissionRuleId") REFERENCES "CommissionRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
