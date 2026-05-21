"use server";

import { prisma } from "@/lib/prisma";
import { getAuthUser, getUserRole } from "@/lib/get-user-role";
import type { CajaOperationType, CajaOperationStatus, Currency } from "@/lib/generated/prisma/client";

export async function getCajaBalance(): Promise<{ usd: number; bcv: number }> {
  const ops = await prisma.cajaOperacion.findMany({
    where: { status: { not: "CANCELADO" } },
    select: { type: true, currency: true, amount: true },
  });

  let usd = 0;
  let bcv = 0;

  for (const op of ops) {
    const sign = op.type === "DEPOSITO" ? 1 : -1;
    if (op.currency === "USD") usd += sign * op.amount;
    else bcv += sign * op.amount;
  }

  return { usd, bcv };
}

export type CajaOperacionRow = {
  id: number;
  type: CajaOperationType;
  status: CajaOperationStatus;
  currency: Currency;
  amount: number;
  description: string;
  createdAt: string;
  createdByName: string;
  updatedByName: string | null;
};

export type CajaFilters = {
  search?: string;
  currency?: "USD" | "BCV";
  type?: "DEPOSITO" | "RETIRO";
  status?: "CARGADO" | "REGISTRADO" | "CANCELADO";
  startDate?: string;
  endDate?: string;
};

export async function getCajaOperaciones(filters: CajaFilters): Promise<CajaOperacionRow[]> {
  const rows = await prisma.cajaOperacion.findMany({
    where: {
      ...(filters.currency ? { currency: filters.currency as Currency } : {}),
      ...(filters.type ? { type: filters.type as CajaOperationType } : {}),
      ...(filters.status ? { status: filters.status as CajaOperationStatus } : {}),
      ...(filters.search
        ? { description: { contains: filters.search, mode: "insensitive" } }
        : {}),
      ...(filters.startDate || filters.endDate
        ? {
            createdAt: {
              ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
              ...(filters.endDate ? { lte: new Date(filters.endDate + "T23:59:59.999Z") } : {}),
            },
          }
        : {}),
    },
    include: {
      createdBy: { select: { name: true } },
      updatedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    status: r.status,
    currency: r.currency,
    amount: r.amount,
    description: r.description,
    createdAt: r.createdAt.toISOString(),
    createdByName: r.createdBy.name,
    updatedByName: r.updatedBy?.name ?? null,
  }));
}

export type CreateCajaOperacionInput = {
  type: "DEPOSITO" | "RETIRO";
  currency: "USD" | "BCV";
  amount: number;
  description: string;
};

export async function createCajaOperacion(
  data: CreateCajaOperacionInput
): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "No autenticado" };
  if (data.type === "RETIRO" && user.role !== "admin") {
    return { success: false, error: "Solo el admin puede registrar retiros" };
  }
  if (!data.description.trim()) return { success: false, error: "Descripción requerida" };
  if (data.amount <= 0) return { success: false, error: "Monto debe ser mayor a 0" };

  await prisma.cajaOperacion.create({
    data: {
      type: data.type as CajaOperationType,
      currency: data.currency as Currency,
      amount: data.amount,
      description: data.description.trim(),
      createdById: user.id,
    },
  });

  return { success: true };
}

export async function updateCajaStatus(
  id: number,
  status: "REGISTRADO" | "CANCELADO"
): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "No autenticado" };
  if (user.role !== "admin") return { success: false, error: "Solo el admin puede cambiar el estado" };

  const op = await prisma.cajaOperacion.findUnique({ where: { id } });
  if (!op) return { success: false, error: "Operación no encontrada" };
  if (op.status === "CANCELADO") return { success: false, error: "No se puede modificar una operación cancelada" };

  await prisma.cajaOperacion.update({
    where: { id },
    data: {
      status: status as CajaOperationStatus,
      updatedById: user.id,
    },
  });

  return { success: true };
}
