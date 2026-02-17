"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";

interface FilterBarProps {
  sellers: string[];
  zones: string[];
  filters: {
    startDate: string;
    endDate: string;
    seller: string;
    zones: string[];
    currency: string;
    installationType: string;
  };
  onChange: (key: string, value: string | string[]) => void;
  onClear: () => void;
  disableDates?: boolean;
}

export function FilterBar({ sellers, zones, filters, onChange, onClear, disableDates }: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div className="space-y-1">
        <Label className="text-xs">Fecha Inicio</Label>
        <Input
          type="date"
          value={filters.startDate}
          onChange={(e) => onChange("startDate", e.target.value)}
          className="w-full sm:w-[160px]"
          disabled={disableDates}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Fecha Fin</Label>
        <Input
          type="date"
          value={filters.endDate}
          onChange={(e) => onChange("endDate", e.target.value)}
          className="w-full sm:w-[160px]"
          disabled={disableDates}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Vendedor</Label>
        <Select value={filters.seller || "all"} onValueChange={(v) => onChange("seller", v === "all" ? "" : v)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Todos los Vendedores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los Vendedores</SelectItem>
            {sellers.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Zona</Label>
        <MultiSelect
          options={zones}
          value={filters.zones}
          onValueChange={(v) => onChange("zones", v)}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Moneda</Label>
        <Select value={filters.currency || "all"} onValueChange={(v) => onChange("currency", v === "all" ? "" : v)}>
          <SelectTrigger className="w-full sm:w-[130px]">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="USD">USD</SelectItem>
            <SelectItem value="BCV">BCV</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Tipo</Label>
        <Select value={filters.installationType || "all"} onValueChange={(v) => onChange("installationType", v === "all" ? "" : v)}>
          <SelectTrigger className="w-full sm:w-[130px]">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="FREE">FREE</SelectItem>
            <SelectItem value="PAID">PAID</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button variant="outline" size="sm" onClick={onClear}>
        Limpiar
      </Button>
    </div>
  );
}
