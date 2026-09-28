"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CajaOperacionRow, CajaFilters } from "@/lib/actions/caja";
import { updateCajaStatus, deleteCajaOperacion, marcarCajaValidado, procesarValidacionPago } from "@/lib/actions/caja";
import { EditOperacionDialog } from "@/components/caja/edit-operacion-dialog";
import { ValidarPagoDialog } from "@/components/caja/validar-pago-dialog";

interface OperacionesTableProps {
  rows: CajaOperacionRow[];
  filters: CajaFilters;
  isAdmin: boolean;
  canValidarPago: boolean;
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
  canValidarPago,
  onFiltersChange,
  onRefresh,
}: OperacionesTableProps) {
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [editRow, setEditRow] = useState<CajaOperacionRow | null>(null);
  const [manualRow, setManualRow] = useState<CajaOperacionRow | null>(null);
  const showAcciones = isAdmin || canValidarPago;

  async function handleValidarPago(row: CajaOperacionRow) {
    if (!row.cedula) {
      toast.error("Esta operación no tiene cédula registrada");
      return;
    }
    setActionLoading(row.id);
    const result = await procesarValidacionPago(row.id);
    setActionLoading(null);
    if (result.status === "validado") {
      toast.success(result.mensaje);
      onRefresh();
    } else if (result.status === "manual") {
      setManualRow(row);
    } else {
      toast.error(result.error);
    }
  }

  async function handleManualValidated() {
    if (!manualRow) return;
    await marcarCajaValidado(manualRow.id, true);
    setManualRow(null);
    onRefresh();
  }

  async function handleStatusChange(id: number, status: "REGISTRADO" | "CANCELADO") {
    setActionLoading(id);
    const result = await updateCajaStatus(id, status);
    setActionLoading(null);
    if (result.success) onRefresh();
  }

  async function handleDelete(id: number) {
    if (!window.confirm("¿Eliminar esta operación permanentemente? Esta acción no se puede deshacer.")) return;
    setActionLoading(id);
    const result = await deleteCajaOperacion(id);
    setActionLoading(null);
    if (result.success) onRefresh();
  }

  function setFilter<K extends keyof CajaFilters>(key: K, value: CajaFilters[K]) {
    onFiltersChange({ ...filters, [key]: value || undefined });
  }

  return (
    <div className="space-y-4">
      <EditOperacionDialog
        row={editRow}
        onClose={() => setEditRow(null)}
        onSuccess={onRefresh}
      />
      <ValidarPagoDialog
        open={manualRow != null}
        initialCedula={manualRow?.cedula ?? undefined}
        onClose={() => setManualRow(null)}
        onValidated={handleManualValidated}
      />
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
                <th className="p-3">Cédula</th>
                <th className="p-3 text-right">Monto</th>
                <th className="p-3">Moneda</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Validado</th>
                <th className="p-3">Cargado por</th>
                <th className="p-3">Registrado por</th>
                {showAcciones && <th className="p-3">Acciones</th>}
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
                  <td className="p-3 text-muted-foreground whitespace-nowrap">{row.cedula ?? "—"}</td>
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
                  <td className="p-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        row.validado
                          ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                      )}
                    >
                      {row.validado ? "Validado" : "Pendiente"}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">{row.createdByName}</td>
                  <td className="p-3 text-muted-foreground">{row.updatedByName ?? "—"}</td>
                  {showAcciones && (
                    <td className="p-3">
                      <div className="flex gap-1">
                        {isAdmin && row.status === "CARGADO" && (
                          <button
                            onClick={() => handleStatusChange(row.id, "REGISTRADO")}
                            disabled={actionLoading === row.id}
                            className="rounded px-2 py-1 text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-950 dark:text-green-300 disabled:opacity-50"
                          >
                            {actionLoading === row.id ? "..." : "Registrar"}
                          </button>
                        )}
                        {isAdmin && row.status !== "CANCELADO" && (
                          <button
                            onClick={() => handleStatusChange(row.id, "CANCELADO")}
                            disabled={actionLoading === row.id}
                            className="rounded px-2 py-1 text-xs font-medium bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-950 dark:text-red-400 disabled:opacity-50"
                          >
                            {actionLoading === row.id ? "..." : "Cancelar"}
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => setEditRow(row)}
                            disabled={actionLoading === row.id}
                            className="rounded px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-950 dark:text-blue-300 disabled:opacity-50"
                          >
                            Editar
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(row.id)}
                            disabled={actionLoading === row.id}
                            className="rounded px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 hover:bg-red-100 hover:text-red-700 dark:bg-gray-800 dark:text-gray-300 disabled:opacity-50"
                          >
                            {actionLoading === row.id ? "..." : "Eliminar"}
                          </button>
                        )}
                        {canValidarPago && !row.validado && row.cedula && (
                          <button
                            onClick={() => handleValidarPago(row)}
                            disabled={actionLoading === row.id}
                            className="rounded px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-950 dark:text-purple-300 disabled:opacity-50"
                          >
                            {actionLoading === row.id ? "..." : "Validar pago"}
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
