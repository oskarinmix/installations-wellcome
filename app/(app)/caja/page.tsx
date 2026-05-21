"use client";

import { useState, useEffect, useCallback } from "react";
import { BalanceCards } from "@/components/caja/balance-cards";
import { OperacionesTable } from "@/components/caja/operaciones-table";
import { NuevaOperacionDialog } from "@/components/caja/nueva-operacion-dialog";
import { getCajaBalance, getCajaOperaciones } from "@/lib/actions/caja";
import type { CajaOperacionRow, CajaFilters } from "@/lib/actions/caja";
import { getCurrentUserRole } from "@/lib/actions";

export default function CajaPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [balance, setBalance] = useState({ usd: 0, bcv: 0 });
  const [rows, setRows] = useState<CajaOperacionRow[]>([]);
  const [filters, setFilters] = useState<CajaFilters>({});

  useEffect(() => {
    getCurrentUserRole().then((res) => {
      if (res?.role === "admin") setIsAdmin(true);
    });
  }, []);

  const loadBalance = useCallback(async () => {
    const b = await getCajaBalance();
    setBalance(b);
  }, []);

  const loadRows = useCallback(async () => {
    const data = await getCajaOperaciones(filters);
    setRows(data);
  }, [filters]);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  function handleCardSelect(currency: "USD" | "BCV" | null) {
    setFilters((f) => ({ ...f, currency: currency ?? undefined }));
  }

  function handleRefresh() {
    loadBalance();
    loadRows();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <span>🏦</span> Caja
        </h1>
        <NuevaOperacionDialog isAdmin={isAdmin} onSuccess={handleRefresh} />
      </div>

      <BalanceCards
        usd={balance.usd}
        bcv={balance.bcv}
        activeCurrency={filters.currency ?? null}
        onSelect={handleCardSelect}
      />

      <OperacionesTable
        rows={rows}
        filters={filters}
        isAdmin={isAdmin}
        onFiltersChange={setFilters}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
