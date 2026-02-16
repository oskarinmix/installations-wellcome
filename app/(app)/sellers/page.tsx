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
import { getAllSellers, getSellerDetail, generateSellerReport, getAllAvailableWeeks, createSeller, updateSeller, getCurrentUserRole } from "@/lib/actions";
import { getAvailableWeeks, getLastCompleteWeek, type WeekRange } from "@/lib/week-utils";
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
  const [editingSeller, setEditingSeller] = useState<{ id: number; name: string; pin: string | null } | null>(null);
  const [sellerName, setSellerName] = useState("");
  const [sellerPin, setSellerPin] = useState("");
  const [sellerSaving, setSellerSaving] = useState(false);
  const [role, setRole] = useState<"admin" | "agent" | null>(null);

  const loadSellers = useCallback(async () => {
    const data = await getAllSellers();
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
    });
    loadSellers();
    getAllAvailableWeeks().then((dates) => {
      const available = getAvailableWeeks(dates.map((d) => new Date(d)));
      setWeeks(available);
      setSelectedWeek(getLastCompleteWeek(available));
    });
  }, [loadSellers]);

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
    setSellerDialogOpen(true);
  };

  const openEditSeller = (seller: SellerRow) => {
    setEditingSeller({ id: seller.id, name: seller.sellerName, pin: seller.pin ?? null });
    setSellerName(seller.sellerName);
    setSellerPin(seller.pin ?? "");
    setSellerDialogOpen(true);
  };

  const handleSaveSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellerName.trim()) return;
    setSellerSaving(true);
    try {
      if (editingSeller) {
        await updateSeller(editingSeller.id, sellerName, sellerPin || undefined);
      } else {
        await createSeller(sellerName, sellerPin || undefined);
      }
      setSellerDialogOpen(false);
      loadSellers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save seller");
    } finally {
      setSellerSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <span>👥</span> Sellers
        </h1>
        {role === "admin" && (
          <Button className="gap-1" onClick={openCreateSeller}>
            <Plus className="h-4 w-4" /> New Seller
          </Button>
        )}
      </div>

      {/* Search, Filters & Week */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 max-w-sm space-y-1">
          <Label className="text-xs flex items-center gap-1">
            <Search className="h-3 w-3" /> Search
          </Label>
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-32 space-y-1">
          <Label className="text-xs">📊 Min. Sales</Label>
          <Input
            type="number"
            min="0"
            placeholder="0"
            value={minSales}
            onChange={(e) => setMinSales(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">📅 Week</Label>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={selectedWeek?.start.toISOString() ?? ""}
            onChange={(e) => {
              const week = weeks.find((w) => w.start.toISOString() === e.target.value);
              setSelectedWeek(week ?? null);
            }}
          >
            <option value="">Select week...</option>
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
          <p>Loading sellers...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <span className="text-4xl mb-3">{sellers.length === 0 ? "📭" : "🔍"}</span>
          <p>{sellers.length === 0 ? "No sellers found. Upload data first." : "No sellers match your filters."}</p>
        </div>
      ) : (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {filtered.length} Seller{filtered.length !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <SortHead label="#" sortKey="id" current={sortKey} dir={sortDir} onSort={handleSort} className="w-16" />
                  <SortHead label="👤 Seller Name" sortKey="sellerName" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortHead label="🛒 Total Sales" sortKey="totalSales" current={sortKey} dir={sortDir} onSort={handleSort} className="text-center" />
                  <SortHead label="💵 Comm. USD" sortKey="commissionUSD" current={sortKey} dir={sortDir} onSort={handleSort} className="text-right" />
                  <SortHead label="💰 Comm. BCV" sortKey="commissionBCV" current={sortKey} dir={sortDir} onSort={handleSort} className="text-right" />
                  <SortHead label="📅 Last Active" sortKey="lastActive" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <TableHead className="w-20 text-center">📄 Report</TableHead>
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
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 text-sm font-semibold">
                        {seller.totalSales}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono">${seller.commissionUSD.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">${seller.commissionBCV.toFixed(2)}</TableCell>
                    <TableCell>
                      {seller.lastActive
                        ? new Date(seller.lastActive).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        title={selectedWeek ? `View report for ${selectedWeek.label}` : "Select a week first"}
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
                          title="Edit seller"
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
                title={prevSeller ? `← ${prevSeller.sellerName}` : "No previous seller"}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="flex-1">📊 {reportData?.sellerName ?? "Loading..."}</span>
              <button
                disabled={!nextSeller || reportLoading}
                onClick={() => nextSeller && goToSeller(nextSeller.id)}
                className="inline-flex items-center justify-center rounded-md p-1 hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title={nextSeller ? `→ ${nextSeller.sellerName}` : "No next seller"}
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
              <p className="text-sm">Loading report...</p>
            </div>
          ) : !reportData || reportData.totalSales === 0 ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <span className="text-4xl mb-3">📭</span>
              <p className="text-sm">No sales for this seller in the selected week.</p>
            </div>
          ) : (
            <div className="space-y-5 overflow-y-auto pr-1 flex-1 min-h-0">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-2">
                <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/20 p-2.5 text-center">
                  <p className="text-[10px] text-muted-foreground">🛒 Sales</p>
                  <p className="text-xl font-bold">{reportData.totalSales}</p>
                </div>
                <div className="rounded-lg border bg-green-50 dark:bg-green-950/20 p-2.5 text-center">
                  <p className="text-[10px] text-muted-foreground">🆓 Free</p>
                  <p className="text-xl font-bold text-green-700 dark:text-green-400">{reportData.freeCount}</p>
                </div>
                <div className="rounded-lg border bg-purple-50 dark:bg-purple-950/20 p-2.5 text-center">
                  <p className="text-[10px] text-muted-foreground">💳 Paid</p>
                  <p className="text-xl font-bold text-purple-700 dark:text-purple-400">{reportData.paidCount}</p>
                </div>
                <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/20 p-2.5 text-center">
                  <p className="text-[10px] text-muted-foreground">🤝 Comm.</p>
                  <p className="text-sm font-bold leading-tight mt-0.5">
                    ${reportData.commissionUSD.toFixed(2)} <span className="text-muted-foreground text-[10px]">USD</span>
                  </p>
                  <p className="text-sm font-bold leading-tight">
                    ${reportData.commissionBCV.toFixed(2)} <span className="text-muted-foreground text-[10px]">BCV</span>
                  </p>
                </div>
              </div>

              {/* Revenue row */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border p-2.5 text-center">
                  <p className="text-[10px] text-muted-foreground">💵 Revenue USD</p>
                  <p className="text-lg font-bold">${reportData.revenueUSD.toFixed(2)}</p>
                </div>
                <div className="rounded-lg border p-2.5 text-center">
                  <p className="text-[10px] text-muted-foreground">💰 Revenue BCV</p>
                  <p className="text-lg font-bold">${reportData.revenueBCV.toFixed(2)}</p>
                </div>
              </div>

              {/* Plan & Zone side by side */}
              {(reportData.byPlan.length > 0 || reportData.byZone.length > 0) && (
                <div className="grid grid-cols-2 gap-3">
                  {reportData.byPlan.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold mb-1.5">📋 By Plan</h4>
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
                      <h4 className="text-xs font-semibold mb-1.5">📍 By Zone</h4>
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
                <h4 className="text-xs font-semibold mb-1.5">📝 Transactions ({reportData.transactions.length})</h4>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 text-[11px]">
                        <TableHead className="py-1.5 px-2">Date</TableHead>
                        <TableHead className="py-1.5 px-2">Customer</TableHead>
                        <TableHead className="py-1.5 px-2">Plan</TableHead>
                        <TableHead className="py-1.5 px-2">Type</TableHead>
                        <TableHead className="py-1.5 px-2 text-right">Amount</TableHead>
                        <TableHead className="py-1.5 px-2 text-right">Comm.</TableHead>
                        <TableHead className="py-1.5 px-2">Pay</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.transactions.map((tx) => (
                        <TableRow key={tx.id} className="text-xs">
                          <TableCell className="py-1.5 px-2 whitespace-nowrap">
                            {new Date(tx.transactionDate).toLocaleDateString("en-US", {
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
              Close
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadPdf}
              disabled={pdfLoading || !reportData || reportData.totalSales === 0}
              className="gap-1.5"
            >
              {pdfLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {pdfLoading ? "Generating..." : "📥 Download PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Seller Dialog */}
      <Dialog open={sellerDialogOpen} onOpenChange={setSellerDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSeller ? "Edit Seller" : "New Seller"}</DialogTitle>
            <DialogDescription>
              {editingSeller ? "Update the seller's name." : "Add a new seller to the system."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveSeller} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="sellerName">Seller Name</Label>
              <Input
                id="sellerName"
                placeholder="Enter seller name"
                value={sellerName}
                onChange={(e) => setSellerName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sellerPin">PIN (4 digits)</Label>
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
                Used by the seller to access the public consult page.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setSellerDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={sellerSaving || !sellerName.trim()}>
                {sellerSaving ? "Saving..." : editingSeller ? "Save Changes" : "Create Seller"}
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
