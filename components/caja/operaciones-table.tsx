"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { CajaOperacionRow, CajaFilters } from "@/lib/actions/caja";
import { updateCajaStatus } from "@/lib/actions/caja";

interface OperacionesTableProps {
  rows: CajaOperacionRow[];
  filters: CajaFilters;
  isAdmin: boolean;
  onFiltersChange: (filters: CajaFilters) => void;
  onRefresh: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  CARGADO: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
  REGISTRADO: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  CANCELADO: "bg-red-100 text-red-500 dark:bg-red-950 dark:text-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  CARGADO: "Cargado",
  REGISTRADO: "Registrado",
  CANCELADO: "Cancelado",
};

const TYPE_STYLES: Record<string, string> = {
  DEPOSITO: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  RETIRO: "bg-red-100 text-red-500 dark:bg-red-950 dark:text-red-400",
};

export function OperacionesTable({
  rows,
  filters,
  isAdmin,
  onFiltersChange,
  onRefresh,
}: OperacionesTableProps) {
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  async function handleStatusChange(id: number, status: "REGISTRADO" | "CANCELADO") {
    setActionLoading(id);
    await updateCajaStatus(id, status);
    setActionLoading(null);
    onRefresh();
  }

  function setFilter<K extends keyof CajaFilters>(key: K, value: CajaFilters[K]) {
    onFiltersChange({ ...filters, [key]: value || undefined });
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-end">
        <input
          type="text"
          placeholder="Buscar descripción..."
          value={filters.search ?? ""}
          onChange={(e) => setFilter("search", e.target.value || undefined)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm w-52"
        />
        <select
          value={filters.currency ?? ""}
          onChange={(e) => setFilter("currency", (e.target.value as "USD" | "BCV") || undefined)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Todas las monedas</option>
          <option value="USD">USD</option>
          <option value="BCV">BCV</option>
        </select>
        <select
          value={filters.type ?? ""}
          onChange={(e) => setFilter("type", (e.target.value as "DEPOSITO" | "RETIRO") || undefined)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Todos los tipos</option>
          <option value="DEPOSITO">Depósito</option>
          <option value="RETIRO">Retiro</option>
        </select>
        <select
          value={filters.status ?? ""}
          onChange={(e) =>
            setFilter("status", (e.target.value as "CARGADO" | "REGISTRADO" | "CANCELADO") || undefined)
          }
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="CARGADO">Cargado</option>
          <option value="REGISTRADO">Registrado</option>
          <option value="CANCELADO">Cancelado</option>
        </select>
        <input
          type="date"
          value={filters.startDate ?? ""}
          onChange={(e) => setFilter("startDate", e.target.value || undefined)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        />
        <input
          type="date"
          value={filters.endDate ?? ""}
          onChange={(e) => setFilter("endDate", e.target.value || undefined)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        />
        {Object.values(filters).some(Boolean) && (
          <button
            onClick={() => onFiltersChange({})}
            className="h-9 px-3 rounded-md border text-sm text-muted-foreground hover:bg-accent"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-x-auto">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <span className="text-4xl mb-3">🏦</span>
            <p>No hay operaciones</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-left text-muted-foreground">
                <th className="p-3">Fecha</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Descripción</th>
                <th className="p-3 text-right">Monto</th>
                <th className="p-3">Moneda</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Registrado por</th>
                {isAdmin && <th className="p-3">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    "border-t hover:bg-muted/30 transition-colors",
                    row.status === "CANCELADO" && "opacity-50"
                  )}
                >
                  <td className="p-3 text-muted-foreground whitespace-nowrap">
                    {new Date(row.createdAt).toLocaleDateString("es-VE")}
                  </td>
                  <td className="p-3">
                    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", TYPE_STYLES[row.type])}>
                      {row.type === "DEPOSITO" ? "↑ Depósito" : "↓ Retiro"}
                    </span>
                  </td>
                  <td className="p-3 max-w-xs truncate">{row.description}</td>
                  <td className={cn("p-3 text-right font-medium", row.type === "DEPOSITO" ? "text-green-600" : "text-red-500")}>
                    {row.type === "RETIRO" ? "-" : "+"}
                    {row.currency === "USD" ? "$" : "Bs."}{row.amount.toFixed(2)}
                  </td>
                  <td className="p-3 text-muted-foreground">{row.currency}</td>
                  <td className="p-3">
                    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLES[row.status])}>
                      {STATUS_LABELS[row.status]}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">{row.createdByName}</td>
                  {isAdmin && (
                    <td className="p-3">
                      <div className="flex gap-1">
                        {row.status === "CARGADO" && (
                          <button
                            onClick={() => handleStatusChange(row.id, "REGISTRADO")}
                            disabled={actionLoading === row.id}
                            className="rounded px-2 py-1 text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-950 dark:text-green-300 disabled:opacity-50"
                          >
                            {actionLoading === row.id ? "..." : "Registrar"}
                          </button>
                        )}
                        {row.status !== "CANCELADO" && (
                          <button
                            onClick={() => handleStatusChange(row.id, "CANCELADO")}
                            disabled={actionLoading === row.id}
                            className="rounded px-2 py-1 text-xs font-medium bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-950 dark:text-red-400 disabled:opacity-50"
                          >
                            {actionLoading === row.id ? "..." : "Cancelar"}
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
