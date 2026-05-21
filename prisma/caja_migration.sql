-- Create enums for CajaOperacion
CREATE TYPE "CajaOperationType" AS ENUM ('DEPOSITO', 'RETIRO');
CREATE TYPE "CajaOperationStatus" AS ENUM ('CARGADO', 'REGISTRADO', 'CANCELADO');

-- Create CajaOperacion table
CREATE TABLE "CajaOperacion" (
    "id" SERIAL NOT NULL,
    "type" "CajaOperationType" NOT NULL,
    "status" "CajaOperationStatus" NOT NULL DEFAULT 'CARGADO',
    "currency" "Currency" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    CONSTRAINT "CajaOperacion_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "CajaOperacion" ADD CONSTRAINT "CajaOperacion_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CajaOperacion" ADD CONSTRAINT "CajaOperacion_updatedById_fkey"
    FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "CajaOperacion_currency_idx" ON "CajaOperacion"("currency");
CREATE INDEX "CajaOperacion_status_idx" ON "CajaOperacion"("status");
CREATE INDEX "CajaOperacion_createdAt_idx" ON "CajaOperacion"("createdAt");
CREATE INDEX "CajaOperacion_type_idx" ON "CajaOperacion"("type");
