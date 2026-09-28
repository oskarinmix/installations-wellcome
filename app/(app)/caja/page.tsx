"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BalanceCards } from "@/components/caja/balance-cards";
import { OperacionesTable } from "@/components/caja/operaciones-table";
import { NuevaOperacionDialog } from "@/components/caja/nueva-operacion-dialog";
import { PromesaPagoDialog } from "@/components/caja/promesa-pago-dialog";
import { Button } from "@/components/ui/button";
import { getCajaBalance, getCajaOperaciones } from "@/lib/actions/caja";
import type { CajaOperacionRow, CajaFilters } from "@/lib/actions/caja";
import { getCurrentUserRole } from "@/lib/actions";

export default function CajaPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCashier, setIsCashier] = useState(false);
  const [balance, setBalance] = useState({ usd: 0, bcv: 0 });
  const [rows, setRows] = useState<CajaOperacionRow[]>([]);
  const [filters, setFilters] = useState<CajaFilters>({});
  const [promesaOpen, setPromesaOpen] = useState(false);

  useEffect(() => {
    getCurrentUserRole().then((res) => {
      const role = res?.role;
      if (!role || role === "agent") {
        router.replace("/installations");
        return;
      }
      if (role === "admin") setIsAdmin(true);
      if (role === "cashier") setIsCashier(true);
    });
  }, [router]);

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
        <div className="flex items-center gap-2">
          {(isAdmin || isCashier) && (
            <Button type="button" variant="outline" onClick={() => setPromesaOpen(true)}>
              Promesa de pago
            </Button>
          )}
          <NuevaOperacionDialog isAdmin={isAdmin} onSuccess={handleRefresh} />
        </div>
      </div>

      <PromesaPagoDialog open={promesaOpen} onClose={() => setPromesaOpen(false)} />

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
        canValidarPago={isAdmin || isCashier}
        onFiltersChange={setFilters}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
