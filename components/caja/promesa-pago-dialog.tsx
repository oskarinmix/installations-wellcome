"use client";

import { useState } from "react";
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
  registrarPromesaPago,
  type FacturaVencida,
} from "@/lib/actions/mikrowisp";

interface PromesaPagoDialogProps {
  open: boolean;
  onClose: () => void;
}

const DIAS_OPCIONES = [1, 2, 3, 4, 5, 6];

export function PromesaPagoDialog({ open, onClose }: PromesaPagoDialogProps) {
  const [cedula, setCedula] = useState("");
  const [searching, setSearching] = useState(false);
  const [facturas, setFacturas] = useState<FacturaVencida[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [dias, setDias] = useState(1);
  const [descripcion, setDescripcion] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function reset() {
    setCedula("");
    setFacturas(null);
    setSelectedId(null);
    setDias(1);
    setDescripcion("");
    setError(null);
    setSuccess(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleBuscar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFacturas(null);
    setSelectedId(null);
    setSearching(true);
    const result = await buscarFacturasVencidas(cedula);
    setSearching(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.notFound) {
      setError("Cliente no encontrado en Mikrowisp");
      return;
    }
    setFacturas(result.facturas ?? []);
  }

  async function handleConfirmar() {
    if (selectedId == null) return;
    setError(null);
    setConfirming(true);
    const result = await registrarPromesaPago(selectedId, dias, descripcion || undefined);
    setConfirming(false);
    if (!result.success) {
      setError(result.error ?? "Error desconocido");
      return;
    }
    setSuccess(true);
    setFacturas((prev) => prev?.filter((f) => f.id !== selectedId) ?? null);
    setSelectedId(null);
    setDescripcion("");
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Promesa de pago</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleBuscar} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="promesa-cedula">Cédula del cliente</Label>
            <div className="flex gap-2">
              <input
                id="promesa-cedula"
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
                      name="factura-promesa"
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
            <div className="space-y-1.5">
              <Label htmlFor="promesa-dias">Plazo (días)</Label>
              <select
                id="promesa-dias"
                value={dias}
                onChange={(e) => setDias(Number(e.target.value))}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {DIAS_OPCIONES.map((d) => (
                  <option key={d} value={d}>
                    {d} {d === 1 ? "día" : "días"}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="promesa-descripcion">Nota (opcional)</Label>
              <input
                id="promesa-descripcion"
                type="text"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Motivo de la promesa"
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-600">Promesa de pago registrada correctamente.</p>}

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
              {confirming ? "Confirmando..." : "Registrar promesa"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
