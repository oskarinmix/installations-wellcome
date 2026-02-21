"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { getAllSellers, getSellerDetail, generateSellerReport, getAllAvailableWeeks, createSeller, updateSeller, getCurrentUserRole, getBcvRate, getCommissionRules, assignRuleToSeller } from "@/lib/actions";
import { getAvailableWeeks, getLastCompleteWeek, type WeekRange } from "@/lib/week-utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Users, ChevronLeft, ChevronRight, FileText, Download, Loader2, Plus, Pencil } from "lucide-react";

type SellerRow = Awaited<ReturnType<typeof getAllSellers>>[number];
type SellerDetailData = Awaited<ReturnType<typeof getSellerDetail>>;
type SortKey = "id" | "sellerName" | "totalSales" | "commissionUSD" | "commissionBCV" | "lastActive";
type SortDir = "asc" | "desc";

export default function SellersPage() {
  const router = useRouter();
  const [sellers, setSellers] = useState<SellerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("totalSales");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [minSales, setMinSales] = useState("");

  // Week selection
  const [weeks, setWeeks] = useState<WeekRange[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<WeekRange | null>(null);

  // Report dialog
  const [reportOpen, setReportOpen] = useState(false);
  const [reportSellerId, setReportSellerId] = useState<number | null>(null);
  const [reportData, setReportData] = useState<SellerDetailData | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Create/Edit seller dialog
  const [sellerDialogOpen, setSellerDialogOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState<{ id: number; name: string; pin: string | null; commissionRuleId: number | null } | null>(null);
  const [sellerName, setSellerName] = useState("");
  const [sellerPin, setSellerPin] = useState("");
  const [sellerRuleId, setSellerRuleId] = useState<number | null>(null);
  const [sellerSaving, setSellerSaving] = useState(false);
  const [role, setRole] = useState<"admin" | "agent" | null>(null);
  const [bcvRate, setBcvRate] = useState<number>(0);

  type CommissionRuleOption = { id: number; name: string };
  const [commissionRules, setCommissionRules] = useState<CommissionRuleOption[]>([]);

  const loadSellers = useCallback(async (week?: WeekRange | null) => {
    setLoading(true);
    const data = await getAllSellers(
      week ? week.start.toISOString() : undefined,
      week ? week.end.toISOString() : undefined,
    );
    setSellers(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    getCurrentUserRole().then((res) => {
      const r = res?.role ?? null;
      setRole(r);
      if (r === "agent") {
        router.replace("/installations");
        return;
      }
      if (r === "admin") {
        getCommissionRules().then((data) =>
          setCommissionRules(data.map((r) => ({ id: r.id, name: r.name })))
        );
      }
    });
    getBcvRate().then((r) => setBcvRate(r.rate));
    getAllAvailableWeeks().then((dates) => {
      const available = getAvailableWeeks(dates.map((d) => new Date(d)));
      setWeeks(available);
      const lastWeek = getLastCompleteWeek(available);
      setSelectedWeek(lastWeek);
      loadSellers(lastWeek);
    });
  }, [loadSellers, router]);

  // Reload sellers when week changes
  useEffect(() => {
    if (weeks.length > 0) {
      loadSellers(selectedWeek);
    }
  }, [selectedWeek, weeks.length, loadSellers]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "sellerName" ? "asc" : "desc");
    }
  };

  const filtered = useMemo(() => {
    let result = sellers;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((s) => s.sellerName.toLowerCase().includes(q));
    }

    if (minSales) {
      const min = Number(minSales);
      if (!isNaN(min)) result = result.filter((s) => s.totalSales >= min);
    }

    const copy = [...result];
    copy.sort((a, b) => {
      let aVal: string | number = a[sortKey] as string | number;
      let bVal: string | number = b[sortKey] as string | number;

      if (sortKey === "lastActive") {
        aVal = a.lastActive ? new Date(a.lastActive).getTime() : 0;
        bVal = b.lastActive ? new Date(b.lastActive).getTime() : 0;
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        const cmp = aVal.localeCompare(bVal, undefined, { sensitivity: "base" });
        return sortDir === "asc" ? cmp : -cmp;
      }

      if ((aVal as number) < (bVal as number)) return sortDir === "asc" ? -1 : 1;
      if ((aVal as number) > (bVal as number)) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return copy;
  }, [sellers, search, minSales, sortKey, sortDir]);

  // Load report for a given seller + week
  const loadReportForSeller = useCallback(async (sellerId: number, week: WeekRange) => {
    setReportSellerId(sellerId);
    setReportLoading(true);
    const detail = await getSellerDetail(
      sellerId,
      week.start.toISOString(),
      week.end.toISOString()
    );
    setReportData(detail);
    setReportLoading(false);
  }, []);

  // Open report dialog for a seller
  const openReport = useCallback(async (sellerId: number) => {
    if (!selectedWeek) return;
    setReportOpen(true);
    loadReportForSeller(sellerId, selectedWeek);
  }, [selectedWeek, loadReportForSeller]);

  // Reload report when week changes inside dialog
  const reloadReport = useCallback(async (week: WeekRange) => {
    if (!reportSellerId) return;
    setSelectedWeek(week);
    loadReportForSeller(reportSellerId, week);
  }, [reportSellerId, loadReportForSeller]);

  // Navigate to prev/next seller in the filtered list
  const currentSellerIndex = filtered.findIndex((s) => s.id === reportSellerId);
  const prevSeller = currentSellerIndex > 0 ? filtered[currentSellerIndex - 1] : null;
  const nextSeller = currentSellerIndex >= 0 && currentSellerIndex < filtered.length - 1 ? filtered[currentSellerIndex + 1] : null;

  const goToSeller = useCallback((sellerId: number) => {
    if (!selectedWeek) return;
    loadReportForSeller(sellerId, selectedWeek);
  }, [selectedWeek, loadReportForSeller]);

  const handleDownloadPdf = async () => {
    if (!selectedWeek || !reportSellerId || !reportData) return;
    setPdfLoading(true);
    try {
      const base64 = await generateSellerReport(
        reportSellerId,
        selectedWeek.start.toISOString(),
        selectedWeek.end.toISOString(),
        selectedWeek.label
      );
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reportData.sellerName}_${selectedWeek.label.replace(/\s/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setPdfLoading(false);
    }
  };

  // Create/Edit seller handlers
  const openCreateSeller = () => {
    setEditingSeller(null);
    setSellerName("");
    setSellerPin("");
    setSellerRuleId(null);
    setSellerDialogOpen(true);
  };

  const openEditSeller = (seller: SellerRow) => {
    setEditingSeller({ id: seller.id, name: seller.sellerName, pin: seller.pin ?? null, commissionRuleId: seller.commissionRuleId ?? null });
    setSellerName(seller.sellerName);
    setSellerPin(seller.pin ?? "");
    setSellerRuleId(seller.commissionRuleId ?? null);
    setSellerDialogOpen(true);
  };

  const handleSaveSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellerName.trim()) return;
    setSellerSaving(true);
    try {
      if (editingSeller) {
        await updateSeller(editingSeller.id, sellerName, sellerPin || undefined);
        await assignRuleToSeller(editingSeller.id, sellerRuleId);
      } else {
        const newId = await createSeller(sellerName, sellerPin || undefined);
        if (sellerRuleId !== null) await assignRuleToSeller(newId, sellerRuleId);
      }
      setSellerDialogOpen(false);
      loadSellers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al guardar vendedor");
    } finally {
      setSellerSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <span>👥</span> Vendedores
        </h1>
        {role === "admin" && (
          <Button className="gap-1" onClick={openCreateSeller}>
            <Plus className="h-4 w-4" /> Nuevo Vendedor
          </Button>
        )}
      </div>

      {/* Search, Filters & Week */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 max-w-sm space-y-1">
          <Label className="text-xs flex items-center gap-1">
            <Search className="h-3 w-3" /> Buscar
          </Label>
          <Input
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-32 space-y-1">
          <Label className="text-xs">📊 Ventas Mín.</Label>
          <Input
            type="number"
            min="0"
            placeholder="0"
            value={minSales}
            onChange={(e) => setMinSales(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">📅 Semana</Label>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={selectedWeek?.start.toISOString() ?? ""}
            onChange={(e) => {
              const week = weeks.find((w) => w.start.toISOString() === e.target.value);
              setSelectedWeek(week ?? null);
            }}
          >
            <option value="">Seleccionar semana...</option>
            {weeks.map((week) => (
              <option key={week.start.toISOString()} value={week.start.toISOString()}>
                {week.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <span className="text-4xl mb-3 animate-pulse">⏳</span>
          <p>Cargando vendedores...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <span className="text-4xl mb-3">{sellers.length === 0 ? "📭" : "🔍"}</span>
          <p>{sellers.length === 0 ? "No se encontraron vendedores. Sube datos primero." : "Ningún vendedor coincide con los filtros."}</p>
        </div>
      ) : (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {filtered.length} Vendedor{filtered.length !== 1 ? "es" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortHead label="#" sortKey="id" current={sortKey} dir={sortDir} onSort={handleSort} className="w-16" />
                  <SortHead label="👤 Nombre" sortKey="sellerName" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <TableHead>Regla</TableHead>
                  <SortHead label="🛒 Ventas" sortKey="totalSales" current={sortKey} dir={sortDir} onSort={handleSort} className="text-center" />
                  <SortHead label="💵 Com. USD" sortKey="commissionUSD" current={sortKey} dir={sortDir} onSort={handleSort} className="text-right" />
                  <SortHead label="💰 Com. BCV" sortKey="commissionBCV" current={sortKey} dir={sortDir} onSort={handleSort} className="text-right" />
                  <SortHead label="📅 Última Act." sortKey="lastActive" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <TableHead className="w-20 text-center">📄 Reporte</TableHead>
                  {role === "admin" && <TableHead className="w-10" />}
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((seller) => (
                  <TableRow
                    key={seller.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => router.push(`/sellers/${seller.id}`)}
                  >
                    <TableCell className="text-muted-foreground font-mono text-xs">{seller.id}</TableCell>
                    <TableCell className="font-medium">{seller.sellerName}</TableCell>
                    <TableCell>
                      {seller.commissionRuleName ? (
                        <Badge variant="outline" className="text-xs font-normal">
                          {seller.commissionRuleName}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Global</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <span className="inline-flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 text-sm font-semibold">
                          {seller.totalSales}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 text-muted-foreground px-1.5 py-0.5 text-[10px] font-medium">
                          <span className="text-green-600 dark:text-green-400">{seller.freeCount}</span>
                          <span className="mx-0.5">|</span>
                          <span className="text-purple-600 dark:text-purple-400">{seller.paidCount}</span>
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">${seller.commissionUSD.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">${seller.commissionBCV.toFixed(2)}</TableCell>
                    <TableCell>
                      {seller.lastActive
                        ? new Date(seller.lastActive).toLocaleDateString("es", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        title={selectedWeek ? `Ver reporte de ${selectedWeek.label}` : "Selecciona una semana primero"}
                        className={`inline-flex items-center justify-center rounded-md p-1.5 transition-colors ${
                          selectedWeek
                            ? "hover:bg-blue-100 dark:hover:bg-blue-950 text-blue-600 dark:text-blue-400"
                            : "text-muted-foreground/40 cursor-not-allowed"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedWeek) openReport(seller.id);
                        }}
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                    </TableCell>
                    {role === "admin" && (
                      <TableCell>
                        <button
                          title="Editar vendedor"
                          className="inline-flex items-center justify-center rounded-md p-1.5 transition-colors hover:bg-muted text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditSeller(seller);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </TableCell>
                    )}
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <button
                disabled={!prevSeller || reportLoading}
                onClick={() => prevSeller && goToSeller(prevSeller.id)}
                className="inline-flex items-center justify-center rounded-md p-1 hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title={prevSeller ? `← ${prevSeller.sellerName}` : "No hay vendedor anterior"}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="flex-1">📊 {reportData?.sellerName ?? "Cargando..."}</span>
              <button
                disabled={!nextSeller || reportLoading}
                onClick={() => nextSeller && goToSeller(nextSeller.id)}
                className="inline-flex items-center justify-center rounded-md p-1 hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title={nextSeller ? `→ ${nextSeller.sellerName}` : "No hay siguiente vendedor"}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </DialogTitle>
            <DialogDescription asChild>
              <div className="flex items-center gap-3 pt-1">
                <select
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                  value={selectedWeek?.start.toISOString() ?? ""}
                  onChange={(e) => {
                    const week = weeks.find((w) => w.start.toISOString() === e.target.value);
                    if (week) reloadReport(week);
                  }}
                >
                  {weeks.map((week) => (
                    <option key={week.start.toISOString()} value={week.start.toISOString()}>
                      📅 {week.label}
                    </option>
                  ))}
                </select>
                {reportLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </div>
            </DialogDescription>
          </DialogHeader>

          {reportLoading ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-3" />
              <p className="text-sm">Cargando reporte...</p>
            </div>
          ) : !reportData || reportData.totalSales === 0 ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <span className="text-4xl mb-3">📭</span>
              <p className="text-sm">Sin ventas para este vendedor en la semana seleccionada.</p>
            </div>
          ) : (
            <div className="space-y-5 overflow-y-auto pr-1 flex-1 min-h-0">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-2">
                <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/20 p-2.5 text-center">
                  <p className="text-[10px] text-muted-foreground">🛒 Ventas</p>
                  <p className="text-xl font-bold">{reportData.totalSales}</p>
                </div>
                <div className="rounded-lg border bg-green-50 dark:bg-green-950/20 p-2.5 text-center">
                  <p className="text-[10px] text-muted-foreground">🆓 Gratis</p>
                  <p className="text-xl font-bold text-green-700 dark:text-green-400">{reportData.freeCount}</p>
                </div>
                <div className="rounded-lg border bg-purple-50 dark:bg-purple-950/20 p-2.5 text-center">
                  <p className="text-[10px] text-muted-foreground">💳 Pagadas</p>
                  <p className="text-xl font-bold text-purple-700 dark:text-purple-400">{reportData.paidCount}</p>
                </div>
                <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/20 p-2.5 text-center">
                  <p className="text-[10px] text-muted-foreground">🤝 Com.</p>
                  <p className="text-sm font-bold leading-tight mt-0.5">
                    ${reportData.commissionUSD.toFixed(2)} <span className="text-muted-foreground text-[10px]">USD</span>
                  </p>
                  <p className="text-sm font-bold leading-tight">
                    ${reportData.commissionBCV.toFixed(2)} <span className="text-muted-foreground text-[10px]">BCV</span>
                  </p>
                </div>
              </div>

              {/* Bs Conversion (only BCV) */}
              {bcvRate > 0 && reportData.commissionBCV > 0 && (
                <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span>🇻🇪</span>
                    <p className="text-xs font-semibold">Comisión BCV en Bolívares</p>
                    <span className="text-[10px] text-muted-foreground ml-auto">Tasa: {bcvRate.toFixed(2)} Bs/$</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Com. BCV</p>
                      <p className="text-sm font-bold">${reportData.commissionBCV.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Equivalente Bs</p>
                      <p className="text-sm font-bold text-amber-700 dark:text-amber-400">{(reportData.commissionBCV * bcvRate).toFixed(2)} Bs</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Plan & Zone side by side */}
              {(reportData.byPlan.length > 0 || reportData.byZone.length > 0) && (
                <div className="grid grid-cols-2 gap-3">
                  {reportData.byPlan.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold mb-1.5">📋 Por Plan</h4>
                      <div className="rounded-lg border overflow-hidden">
                        <Table>
                          <TableBody>
                            {reportData.byPlan.map((p) => (
                              <TableRow key={p.name} className="text-xs">
                                <TableCell className="py-1.5 px-2">{p.name}</TableCell>
                                <TableCell className="py-1.5 px-2 text-right font-mono">{p.count}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                  {reportData.byZone.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold mb-1.5">📍 Por Zona</h4>
                      <div className="rounded-lg border overflow-hidden">
                        <Table>
                          <TableBody>
                            {reportData.byZone.map((z) => (
                              <TableRow key={z.name} className="text-xs">
                                <TableCell className="py-1.5 px-2">{z.name}</TableCell>
                                <TableCell className="py-1.5 px-2 text-right font-mono">{z.count}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Transactions */}
              <div>
                <h4 className="text-xs font-semibold mb-1.5">📝 Transacciones ({reportData.transactions.length})</h4>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 text-[11px]">
                        <TableHead className="py-1.5 px-2">Fecha</TableHead>
                        <TableHead className="py-1.5 px-2">Cliente</TableHead>
                        <TableHead className="py-1.5 px-2">Plan</TableHead>
                        <TableHead className="py-1.5 px-2">Tipo</TableHead>
                        <TableHead className="py-1.5 px-2 text-right">Monto</TableHead>
                        <TableHead className="py-1.5 px-2 text-right">Com.</TableHead>
                        <TableHead className="py-1.5 px-2">Pago</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.transactions.map((tx) => (
                        <TableRow key={tx.id} className="text-xs">
                          <TableCell className="py-1.5 px-2 whitespace-nowrap">
                            {new Date(tx.transactionDate).toLocaleDateString("es", {
                              month: "short", day: "numeric",
                            })}
                          </TableCell>
                          <TableCell className="py-1.5 px-2 max-w-[140px] truncate">{tx.customerName}</TableCell>
                          <TableCell className="py-1.5 px-2 whitespace-nowrap">{tx.plan}</TableCell>
                          <TableCell className="py-1.5 px-2">
                            <span className={`inline-block rounded px-1 py-0.5 text-[10px] font-medium ${tx.installationType === "FREE" ? "bg-gray-100 dark:bg-gray-800" : "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"}`}>
                              {tx.installationType}
                            </span>
                          </TableCell>
                          <TableCell className="py-1.5 px-2 text-right font-mono">${tx.subscriptionAmount.toFixed(2)}</TableCell>
                          <TableCell className="py-1.5 px-2 text-right font-mono">${tx.sellerCommission.toFixed(2)}</TableCell>
                          <TableCell className="py-1.5 px-2">{tx.paymentMethod}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-3 border-t">
            <Button variant="outline" size="sm" onClick={() => setReportOpen(false)}>
              Cerrar
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadPdf}
              disabled={pdfLoading || !reportData || reportData.totalSales === 0}
              className="gap-1.5"
            >
              {pdfLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {pdfLoading ? "Generando..." : "📥 Descargar PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Seller Dialog */}
      <Dialog open={sellerDialogOpen} onOpenChange={setSellerDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSeller ? "Editar Vendedor" : "Nuevo Vendedor"}</DialogTitle>
            <DialogDescription>
              {editingSeller ? "Actualizar el nombre del vendedor." : "Agregar un nuevo vendedor al sistema."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveSeller} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="sellerName">Nombre del Vendedor</Label>
              <Input
                id="sellerName"
                placeholder="Ingresa el nombre del vendedor"
                value={sellerName}
                onChange={(e) => setSellerName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sellerPin">PIN (4 dígitos)</Label>
              <Input
                id="sellerPin"
                type="password"
                placeholder="e.g. 1234"
                value={sellerPin}
                onChange={(e) => setSellerPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                maxLength={4}
                inputMode="numeric"
              />
              <p className="text-xs text-muted-foreground">
                Usado por el vendedor para acceder a la página de consulta pública.
              </p>
            </div>
            {commissionRules.length > 0 && (
              <div className="space-y-1">
                <Label htmlFor="sellerRule">Regla de Comisión</Label>
                <Select
                  value={sellerRuleId !== null ? String(sellerRuleId) : "global"}
                  onValueChange={(v) => setSellerRuleId(v === "global" ? null : Number(v))}
                >
                  <SelectTrigger id="sellerRule">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global (por defecto)</SelectItem>
                    {commissionRules.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setSellerDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={sellerSaving || !sellerName.trim()}>
                {sellerSaving ? "Guardando..." : editingSeller ? "Guardar Cambios" : "Crear Vendedor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SortHead({
  label,
  sortKey,
  current,
  dir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const arrow = current === sortKey ? (dir === "asc" ? " ↑" : " ↓") : "";
  return (
    <TableHead
      className={`cursor-pointer select-none hover:text-foreground ${className ?? ""}`}
      onClick={() => onSort(sortKey)}
    >
      {label}{arrow}
    </TableHead>
  );
}
