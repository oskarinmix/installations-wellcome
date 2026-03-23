"use client";

import { useState } from "react";
import { Search, User, Phone, MapPin, Calendar, Wifi, CreditCard, AlertCircle, Loader2 } from "lucide-react";

interface Servicios {
  ip?: string;
  costo?: string | number;
  [key: string]: unknown;
}

interface ClienteData {
  cedula?: string;
  nombre?: string;
  apellido?: string;
  telefono?: string;
  celular?: string;
  email?: string;
  direccion?: string;
  municipio?: string;
  estado?: string;
  zona?: string;
  plan?: string;
  servicio?: string;
  status?: string;
  estado_servicio?: string;
  fecha_instalacion?: string;
  fecha_registro?: string;
  fecha_vencimiento?: string;
  ultimo_pago?: string;
  monto?: string | number;
  ip?: string;
  mac?: string;
  router?: string;
  contrato?: string;
  referencia?: string;
  name?: string;
  servicios?: Servicios | null;
  [key: string]: unknown;
}

function InfoRow({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-3 py-2 border-b last:border-0">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide min-w-[160px]">
        {label}
      </span>
      <span className="text-sm font-medium break-all">{String(value)}</span>
    </div>
  );
}

const FIELD_LABELS: Record<string, string> = {
  cedula: "Cédula",
  nombre: "Nombre",
  apellido: "Apellido",
  telefono: "Teléfono",
  celular: "Celular",
  email: "Correo",
  direccion: "Dirección",
  municipio: "Municipio",
  estado: "Estado",
  zona: "Zona",
  plan: "Plan",
  servicio: "Servicio",
  status: "Estatus",
  estado_servicio: "Estado del servicio",
  fecha_instalacion: "Fecha de instalación",
  fecha_registro: "Fecha de registro",
  fecha_vencimiento: "Fecha de vencimiento",
  ultimo_pago: "Último pago",
  monto: "Monto",
  mac: "MAC",
  router: "Router",
  contrato: "Contrato",
  referencia: "Referencia",
  servicios: "Servicios",
  ip: "IP",
  costo: "Costo",
};

function formatLabel(key: string): string {
  return FIELD_LABELS[key.toLowerCase()] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function CheckUserPage() {
  const [cedula, setCedula] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ClienteData | ClienteData[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = cedula.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch(`/api/check-user?cedula=${encodeURIComponent(trimmed)}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Error al consultar el cliente.");
      } else {
        setData(json);
      }
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  const records: ClienteData[] = data
    ? Array.isArray(data)
      ? data
      : [data]
    : [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Consultar Cliente</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Busca un cliente por número de cédula.
        </p>
      </div>

      {/* Search form */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            placeholder="Ej: 12345678"
            className="w-full pl-9 pr-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !cedula.trim()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Buscar
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Results */}
      {records.map((record, idx) => (
        <div key={idx} className="rounded-xl border bg-card shadow-sm overflow-hidden">
          {/* Card header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b bg-muted/30">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-sm">
                {[record.nombre, record.apellido].filter(Boolean).join(" ") ||
                  record.name ||
                  `Cliente #${idx + 1}`}
              </p>
              <p className="text-xs text-muted-foreground">
                Cédula: {record.cedula ?? cedula}
              </p>
            </div>
            {(record.status || record.estado_servicio) && (
              <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                {String(record.status ?? record.estado_servicio)}
              </span>
            )}
          </div>

          {/* Card body */}
          <div className="px-5 py-3">
            {Object.entries(record).map(([key, value]) => {
              if (key === "servicios") return null; // rendered separately below
              if (typeof value === "object" && value !== null) return null; // skip unknown nested objects
              return <InfoRow key={key} label={formatLabel(key)} value={value} />;
            })}
          </div>

          {/* Servicios sub-section */}
          {record.servicios && (
            <div className="mx-5 mb-4 rounded-lg border bg-muted/20 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/40">
                <Wifi className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Servicios
                </span>
              </div>
              <div className="px-4 py-2">
                {Object.entries(record.servicios).map(([k, v]) => (
                  <InfoRow key={k} label={formatLabel(k)} value={v} />
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* No results */}
      {!loading && data !== null && records.length === 0 && (
        <div className="text-center py-10 text-muted-foreground text-sm">
          No se encontraron resultados para esa cédula.
        </div>
      )}
    </div>
  );
}
