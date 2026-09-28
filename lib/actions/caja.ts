"use server";

import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/get-user-role";
import type { CajaOperationType, CajaOperationStatus, Currency } from "@/lib/generated/prisma/client";
import {
  buscarFacturasVencidas,
  confirmarPagoFactura,
  type FacturaVencida,
} from "@/lib/actions/mikrowisp";

export async function getCajaBalance(): Promise<{ usd: number; bcv: number }> {
  const groups = await prisma.cajaOperacion.groupBy({
    by: ["currency", "type"],
    where: { status: { not: "CANCELADO" } },
    _sum: { amount: true },
  });

  let usd = 0;
  let bcv = 0;

  for (const g of groups) {
    const sign = g.type === "DEPOSITO" ? 1 : -1;
    const amount = g._sum.amount ?? 0;
    if (g.currency === "USD") usd += sign * amount;
    else bcv += sign * amount;
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
  cedula: string | null;
  validado: boolean;
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
    cedula: r.cedula,
    validado: r.validado,
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
  cedula?: string;
};

export async function createCajaOperacion(
  data: CreateCajaOperacionInput
): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "No autenticado" };
  if (data.type === "RETIRO" && user.role !== "admin" && user.role !== "cashier") {
    return { success: false, error: "Sin permiso para registrar retiros" };
  }
  if (!data.description.trim()) return { success: false, error: "Descripción requerida" };
  if (data.amount <= 0) return { success: false, error: "Monto debe ser mayor a 0" };

  await prisma.cajaOperacion.create({
    data: {
      type: data.type as CajaOperationType,
      currency: data.currency as Currency,
      amount: data.amount,
      description: data.description.trim(),
      cedula: data.cedula?.trim() || null,
      createdById: user.id,
    },
  });

  return { success: true };
}

export type UpdateCajaOperacionInput = {
  type: "DEPOSITO" | "RETIRO";
  currency: "USD" | "BCV";
  amount: number;
  description: string;
  cedula?: string;
};

export async function updateCajaOperacion(
  id: number,
  data: UpdateCajaOperacionInput
): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "No autenticado" };
  if (user.role !== "admin") return { success: false, error: "Solo el admin puede editar operaciones" };
  if (!data.description.trim()) return { success: false, error: "Descripción requerida" };
  if (data.amount <= 0) return { success: false, error: "Monto debe ser mayor a 0" };

  const exists = await prisma.cajaOperacion.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return { success: false, error: "Operación no encontrada" };

  await prisma.cajaOperacion.update({
    where: { id },
    data: {
      type: data.type as CajaOperationType,
      currency: data.currency as Currency,
      amount: data.amount,
      description: data.description.trim(),
      cedula: data.cedula?.trim() || null,
      updatedById: user.id,
    },
  });

  return { success: true };
}

export async function marcarCajaValidado(
  id: number,
  validado: boolean
): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "No autenticado" };

  await prisma.cajaOperacion.update({
    where: { id },
    data: validado
      ? { validado, status: "REGISTRADO", updatedById: user.id }
      : { validado },
  });
  return { success: true };
}

export async function deleteCajaOperacion(
  id: number
): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "No autenticado" };
  if (user.role !== "admin") return { success: false, error: "Solo el admin puede eliminar operaciones" };

  const exists = await prisma.cajaOperacion.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return { success: false, error: "Operación no encontrada" };

  await prisma.cajaOperacion.delete({ where: { id } });

  return { success: true };
}

export async function updateCajaStatus(
  id: number,
  status: "REGISTRADO" | "CANCELADO"
): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "No autenticado" };
  if (user.role !== "admin") return { success: false, error: "Solo el admin puede cambiar el estado" };

  const updated = await prisma.cajaOperacion.updateMany({
    where: { id, status: { not: "CANCELADO" } },
    data: {
      status: status as CajaOperationStatus,
      updatedById: user.id,
    },
  });

  if (updated.count === 0) {
    const exists = await prisma.cajaOperacion.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return { success: false, error: "Operación no encontrada" };
    return { success: false, error: "No se puede modificar una operación cancelada" };
  }

  return { success: true };
}

export type ValidacionPagoResult =
  | { status: "validado"; mensaje: string }
  | { status: "manual"; idcliente: number; facturas: FacturaVencida[] }
  | { status: "error"; error: string };

export async function procesarValidacionPago(rowId: number): Promise<ValidacionPagoResult> {
  const user = await getAuthUser();
  if (!user) return { status: "error", error: "No autenticado" };

  const row = await prisma.cajaOperacion.findUnique({ where: { id: rowId }, select: { cedula: true } });
  if (!row) return { status: "error", error: "Operación no encontrada" };
  if (!row.cedula) return { status: "error", error: "Esta operación no tiene cédula registrada" };

  const busqueda = await buscarFacturasVencidas(row.cedula);
  if (busqueda.error) return { status: "error", error: busqueda.error };
  if (busqueda.notFound) return { status: "error", error: "Cliente no encontrado en Mikrowisp" };

  const facturas = busqueda.facturas ?? [];
  const idcliente = busqueda.idcliente!;

  if (facturas.length === 0) {
    await prisma.cajaOperacion.update({
      where: { id: rowId },
      data: { validado: true, status: "REGISTRADO", updatedById: user.id },
    });
    return { status: "validado", mensaje: "Cliente sin facturas vencidas" };
  }

  if (facturas.length === 1) {
    const pago = await confirmarPagoFactura(facturas[0].id, idcliente);
    if (!pago.success) return { status: "error", error: pago.error ?? "Error al confirmar el pago" };
    await prisma.cajaOperacion.update({
      where: { id: rowId },
      data: { validado: true, status: "REGISTRADO", updatedById: user.id },
    });
    return { status: "validado", mensaje: "Pago validado automáticamente" };
  }

  return { status: "manual", idcliente, facturas };
}
