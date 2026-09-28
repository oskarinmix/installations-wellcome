"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createCajaOperacion } from "@/lib/actions/caja";
import { Plus } from "lucide-react";

interface NuevaOperacionDialogProps {
  isAdmin: boolean;
  onSuccess: () => void;
}

export function NuevaOperacionDialog({ isAdmin, onSuccess }: NuevaOperacionDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<"DEPOSITO" | "RETIRO">("DEPOSITO");
  const [currency, setCurrency] = useState<"USD" | "BCV">("USD");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [cedula, setCedula] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      setError("Monto inválido");
      return;
    }
    setLoading(true);
    const result = await createCajaOperacion({
      type,
      currency,
      amount: parsed,
      description,
      cedula: cedula || undefined,
    });
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Error desconocido");
      return;
    }
    setOpen(false);
    setAmount("");
    setDescription("");
    setCedula("");
    setType("DEPOSITO");
    setCurrency("USD");
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva Operación
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva Operación de Caja</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType("DEPOSITO")}
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  type === "DEPOSITO"
                    ? "bg-green-100 border-green-500 text-green-800 dark:bg-green-950 dark:text-green-300"
                    : "hover:bg-accent"
                }`}
              >
                Depósito
              </button>
              <button
                type="button"
                onClick={() => setType("RETIRO")}
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  type === "RETIRO"
                    ? "bg-red-100 border-red-500 text-red-800 dark:bg-red-950 dark:text-red-300"
                    : "hover:bg-accent"
                }`}
              >
                Retiro
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Moneda</Label>
            <div className="flex gap-2">
              {(["USD", "BCV"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCurrency(c)}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    currency === c
                      ? "bg-blue-100 border-blue-500 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                      : "hover:bg-accent"
                  }`}
                >
                  {c === "USD" ? "USD ($)" : "BCV (Bs.)"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="amount">Monto</Label>
            <input
              id="amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cedula">Cédula del cliente (opcional)</Label>
            <input
              id="cedula"
              type="text"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              placeholder="Ej. 12345678"
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descripción</Label>
            <input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción de la operación"
              required
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Registrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
