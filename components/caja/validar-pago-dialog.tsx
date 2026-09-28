"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  buscarFacturasVencidas,
  confirmarPagoFactura,
  type FacturaVencida,
} from "@/lib/actions/mikrowisp";

interface ValidarPagoDialogProps {
  open: boolean;
  onClose: () => void;
  initialCedula?: string;
  onValidated?: () => void;
}

export function ValidarPagoDialog({ open, onClose, initialCedula, onValidated }: ValidarPagoDialogProps) {
  const [cedula, setCedula] = useState("");
  const [searching, setSearching] = useState(false);
  const [idCliente, setIdCliente] = useState<number | null>(null);
  const [clienteNombre, setClienteNombre] = useState<string | null>(null);
  const [clienteEstado, setClienteEstado] = useState<string | null>(null);
  const [facturas, setFacturas] = useState<FacturaVencida[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resuspendido, setResuspendido] = useState(false);

  const [cantidad, setCantidad] = useState("");
  const [comision, setComision] = useState("");
  const [idtransaccion, setIdtransaccion] = useState("");
  const [fechalimite, setFechalimite] = useState("");
  const [nota, setNota] = useState("");

  function reset() {
    setCedula("");
    setIdCliente(null);
    setClienteNombre(null);
    setClienteEstado(null);
    setFacturas(null);
    setSelectedId(null);
    setError(null);
    setSuccess(false);
    setResuspendido(false);
    setCantidad("");
    setComision("");
    setIdtransaccion("");
    setFechalimite("");
    setNota("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function buscar(cedulaValue: string) {
    setError(null);
    setFacturas(null);
    setSelectedId(null);
    setSearching(true);
    const result = await buscarFacturasVencidas(cedulaValue);
    setSearching(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.notFound) {
      setError("Cliente no encontrado en Mikrowisp");
      return;
    }
    setIdCliente(result.idcliente ?? null);
    setClienteNombre(result.clienteNombre ?? null);
    setClienteEstado(result.clienteEstado ?? null);
    setFacturas(result.facturas ?? []);
  }

  function handleBuscar(e: React.FormEvent) {
    e.preventDefault();
    buscar(cedula);
  }

  useEffect(() => {
    if (open && initialCedula) {
      setCedula(initialCedula);
      buscar(initialCedula);
    }
  }, [open, initialCedula]);

  async function handleConfirmar() {
    if (selectedId == null || idCliente == null) return;
    setError(null);
    setConfirming(true);
    const result = await confirmarPagoFactura(selectedId, idCliente, {
      cantidad: cantidad ? parseFloat(cantidad) : undefined,
      comision: comision ? parseFloat(comision) : undefined,
      idtransaccion: idtransaccion || undefined,
      fechalimite: fechalimite ? fechalimite.replace("T", " ") + ":00" : undefined,
      nota: nota || undefined,
    });
    setConfirming(false);
    if (!result.success) {
      setError(result.error ?? "Error desconocido");
      return;
    }
    setSuccess(true);
    setResuspendido(!!result.resuspendido);
    setClienteEstado((prev) => (result.resuspendido ? prev : "ACTIVO"));
    setFacturas((prev) => prev?.filter((f) => f.id !== selectedId) ?? null);
    onValidated?.();
    setSelectedId(null);
    setCantidad("");
    setComision("");
    setIdtransaccion("");
    setFechalimite("");
    setNota("");
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Validar pago</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleBuscar} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="validar-cedula">Cédula del cliente</Label>
            <div className="flex gap-2">
              <input
                id="validar-cedula"
                type="text"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                placeholder="Ej. 12345678"
                required
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              />
              <Button type="submit" disabled={searching}>
                {searching ? "Buscando..." : "Buscar"}
              </Button>
            </div>
          </div>
        </form>

        {clienteNombre != null && (
          <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
            <span className="truncate">{clienteNombre}</span>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                clienteEstado === "ACTIVO"
                  ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                  : "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
              )}
            >
              {clienteEstado}
            </span>
          </div>
        )}

        {facturas != null && (
          <div className="space-y-2">
            {facturas.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay facturas vencidas para este cliente.</p>
            ) : (
              facturas.map((f) => (
                <label
                  key={f.id}
                  className={cn(
                    "flex items-center justify-between rounded-md border px-3 py-2 text-sm cursor-pointer",
                    selectedId === f.id ? "border-blue-500 bg-blue-50 dark:bg-blue-950" : "hover:bg-accent"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="factura"
                      checked={selectedId === f.id}
                      onChange={() => setSelectedId(f.id)}
                    />
                    Vence {f.vencimiento} — Pendiente: {f.pendiente}
                  </span>
                  <span className="font-medium">Total: {f.total}</span>
                </label>
              ))
            )}
          </div>
        )}

        {selectedId != null && (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="validar-cantidad">Cantidad (opcional)</Label>
                <input
                  id="validar-cantidad"
                  type="number"
                  min="0"
                  step="0.01"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  placeholder="Total de la factura"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="validar-comision">Comisión (opcional)</Label>
                <input
                  id="validar-comision"
                  type="number"
                  min="0"
                  step="0.01"
                  value={comision}
                  onChange={(e) => setComision(e.target.value)}
                  placeholder="0"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="validar-idtransaccion">Nº de operación (opcional)</Label>
              <input
                id="validar-idtransaccion"
                type="text"
                value={idtransaccion}
                onChange={(e) => setIdtransaccion(e.target.value)}
                placeholder="Código o Nº de operación del pago"
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="validar-fechalimite">Fecha del pago (opcional)</Label>
              <input
                id="validar-fechalimite"
                type="datetime-local"
                value={fechalimite}
                onChange={(e) => setFechalimite(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="validar-nota">Nota (opcional)</Label>
              <input
                id="validar-nota"
                type="text"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Descripción del pago"
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && (
          <p className="text-sm text-green-600">
            Pago validado correctamente.
            {resuspendido && " Cliente sigue suspendido: aún tiene facturas vencidas pendientes."}
          </p>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cerrar
          </Button>
          {facturas != null && facturas.length > 0 && (
            <Button
              type="button"
              disabled={selectedId == null || confirming}
              onClick={handleConfirmar}
            >
              {confirming ? "Confirmando..." : "Confirmar pago"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
