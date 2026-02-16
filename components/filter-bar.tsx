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
        <Label className="text-xs">Start Date</Label>
        <Input
          type="date"
          value={filters.startDate}
          onChange={(e) => onChange("startDate", e.target.value)}
          className="w-[160px]"
          disabled={disableDates}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">End Date</Label>
        <Input
          type="date"
          value={filters.endDate}
          onChange={(e) => onChange("endDate", e.target.value)}
          className="w-[160px]"
          disabled={disableDates}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Seller</Label>
        <Select value={filters.seller || "all"} onValueChange={(v) => onChange("seller", v === "all" ? "" : v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Sellers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sellers</SelectItem>
            {sellers.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Zone</Label>
        <MultiSelect
          options={zones}
          value={filters.zones}
          onValueChange={(v) => onChange("zones", v)}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Currency</Label>
        <Select value={filters.currency || "all"} onValueChange={(v) => onChange("currency", v === "all" ? "" : v)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="USD">USD</SelectItem>
            <SelectItem value="BCV">BCV</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Type</Label>
        <Select value={filters.installationType || "all"} onValueChange={(v) => onChange("installationType", v === "all" ? "" : v)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="FREE">FREE</SelectItem>
            <SelectItem value="PAID">PAID</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button variant="outline" size="sm" onClick={onClear}>
        Clear
      </Button>
    </div>
  );
}
