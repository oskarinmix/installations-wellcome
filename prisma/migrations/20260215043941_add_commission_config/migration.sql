-- CreateTable
CREATE TABLE "CommissionConfig" (
    "id" SERIAL NOT NULL,
    "sellerFreeCommission" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "sellerPaidCommission" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "installerFreePercentage" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "installerPaidPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0.7,

    CONSTRAINT "CommissionConfig_pkey" PRIMARY KEY ("id")
);
