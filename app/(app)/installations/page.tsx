"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getAllInstallations,
  getGlobalFilterOptions,
  getAllSellers,
  getAllAvailableWeeks,
  getPlanPrices,
  getZones,
  createInstallation,
  updateInstallation,
  deleteInstallation,
  getCurrentUserRole,
} from "@/lib/actions";
import { getAvailableWeeks, getLastCompleteWeek, type WeekRange } from "@/lib/week-utils";
import { Combobox } from "@/components/ui/combobox";
import { Search, Wrench, X, Plus, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

type Installation = Awaited<ReturnType<typeof getAllInstallations>>[number];
type SortKey = "transactionDate" | "customerName" | "sellerName" | "zone" | "plan" | "subscriptionAmount" | "installationType" | "currency" | "paymentMethod";
type SortDir = "asc" | "desc";

const emptyFilters = {
  search: "",
  startDate: "",
  endDate: "",
  seller: "",
  zones: [] as string[],
  currency: "",
  installationType: "",
};

const today = new Date().toISOString().slice(0, 10);

const emptyForm = {
  transactionDate: today,
  customerName: "",
  sellerId: "",
  zone: "",
  customZone: "",
  planId: "",
  installationType: "PAID" as "FREE" | "PAID",
  paymentMethod: "",
  referenceCode: "",
};

type Seller = { id: number; sellerName: string };
type Plan = { id: number; name: string; price: number };

export default function InstallationsPage() {
  const [data, setData] = useState<Installation[]>([]);
  const [filterOptions, setFilterOptions] = useState<{ sellers: string[]; zones: string[] }>({ sellers: [], zones: [] });
  const [filters, setFilters] = useState(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("transactionDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Week filter
  const [weeks, setWeeks] = useState<WeekRange[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>(""); // ISO string of week start, "" = all

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [zoneOptions, setZoneOptions] = useState<string[]>([]);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Installation | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [role, setRole] = useState<"admin" | "agent" | null>(null);

  useEffect(() => {
    getCurrentUserRole().then((res) => setRole(res?.role ?? null));
    getGlobalFilterOptions().then(setFilterOptions);
    getAllAvailableWeeks().then((dates) => {
      const available = getAvailableWeeks(dates.map((d) => new Date(d)));
      setWeeks(available);
    });
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);

    // If a week is selected, use its date range instead of manual dates
    let startDate = filters.startDate || undefined;
    let endDate = filters.endDate || undefined;
    if (selectedWeek) {
      const week = weeks.find((w) => w.start.toISOString() === selectedWeek);
      if (week) {
        startDate = week.start.toISOString();
        endDate = week.end.toISOString();
      }
    }

    const res = await getAllInstallations({
      search: filters.search || undefined,
      startDate,
      endDate,
      seller: filters.seller || undefined,
      zones: filters.zones.length > 0 ? filters.zones : undefined,
      currency: (filters.currency || undefined) as "USD" | "BCV" | undefined,
      installationType: (filters.installationType || undefined) as "FREE" | "PAID" | undefined,
    });
    setData(res);
    setLoading(false);
  }, [filters, selectedWeek, weeks]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(() => {
    const copy = [...data];
    copy.sort((a, b) => {
      let aVal: string | number | Date = a[sortKey];
      let bVal: string | number | Date = b[sortKey];

      if (sortKey === "transactionDate") {
        aVal = new Date(aVal as Date).getTime();
        bVal = new Date(bVal as Date).getTime();
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        const cmp = aVal.localeCompare(bVal, undefined, { sensitivity: "base" });
        return sortDir === "asc" ? cmp : -cmp;
      }

      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [data, sortKey, sortDir]);

  const summary = useMemo(() => {
    let total = 0, free = 0, paid = 0;
    let revenueUSD = 0, revenueBCV = 0;
    let commUSD = 0, commBCV = 0;
    let instCommUSD = 0, instCommBCV = 0;
    for (const row of data) {
      total++;
      if (row.installationType === "FREE") free++; else paid++;
      const amount = row.expectedPrice ?? row.subscriptionAmount;
      if (row.currency === "USD") {
        revenueUSD += amount;
        commUSD += row.sellerCommission;
        instCommUSD += row.installerCommission;
      } else {
        revenueBCV += amount;
        commBCV += row.sellerCommission;
        instCommBCV += row.installerCommission;
      }
    }
    return { total, free, paid, revenueUSD, revenueBCV, commUSD, commBCV, instCommUSD, instCommBCV };
  }, [data]);

  const onChange = (key: string, value: string | string[]) => setFilters((f) => ({ ...f, [key]: value }));

  // Dialog helpers
  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const selectedPlan = plans.find((p) => p.id === Number(form.planId));

  const ensureDialogData = async () => {
    if (sellers.length === 0) {
      setDialogLoading(true);
      const [s, p, z] = await Promise.all([getAllSellers(), getPlanPrices(), getZones()]);
      setSellers(s.map((sel) => ({ id: sel.id, sellerName: sel.sellerName })));
      setPlans(p);
      setZoneOptions(z);
      setDialogLoading(false);
    }
  };

  const handleOpenDialog = async () => {
    setEditingId(null);
    setDialogOpen(true);
    setForm({ ...emptyForm, transactionDate: new Date().toISOString().slice(0, 10) });
    await ensureDialogData();
  };

  const handleOpenEdit = async (row: Installation) => {
    setEditingId(row.id);
    setDialogOpen(true);
    setForm({
      transactionDate: new Date(row.transactionDate).toISOString().slice(0, 10),
      customerName: row.customerName,
      sellerId: String(row.sellerId),
      zone: row.zone,
      customZone: "",
      planId: String(row.planId),
      installationType: row.installationType as "FREE" | "PAID",
      paymentMethod: row.paymentMethod,
      referenceCode: row.referenceCode || "",
    });
    await ensureDialogData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteInstallation(deleteTarget.id);
      setDeleteTarget(null);
      loadData();
      getGlobalFilterOptions().then(setFilterOptions);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete installation");
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const zone = form.zone === "__custom" ? form.customZone.trim() : form.zone;
      const payload = {
        transactionDate: form.transactionDate,
        customerName: form.customerName.trim(),
        sellerId: Number(form.sellerId),
        zone,
        planId: Number(form.planId),
        installationType: form.installationType,
        currency: "USD" as const,
        subscriptionAmount: selectedPlan?.price ?? 0,
        paymentMethod: form.paymentMethod,
        referenceCode: form.referenceCode.trim() || undefined,
      };

      if (editingId) {
        await updateInstallation(editingId, payload);
      } else {
        await createInstallation(payload);
      }

      setDialogOpen(false);
      setEditingId(null);
      setForm({ ...emptyForm, transactionDate: new Date().toISOString().slice(0, 10) });
      loadData();
      getGlobalFilterOptions().then(setFilterOptions);
    } catch (err) {
      alert(err instanceof Error ? err.message : editingId ? "Failed to update installation" : "Failed to create installation");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <span>🔧</span> Installations
        </h1>
        <Button className="gap-1" onClick={handleOpenDialog}>
          <Plus className="h-4 w-4" /> New
        </Button>
      </div>

      {/* Summary Cards */}
      {!loading && data.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/20 p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{summary.total}</p>
          </div>
          <div className="rounded-lg border bg-green-50 dark:bg-green-950/20 p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Free</p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">{summary.free}</p>
          </div>
          <div className="rounded-lg border bg-purple-50 dark:bg-purple-950/20 p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Paid</p>
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{summary.paid}</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Revenue</p>
            <p className="text-sm font-bold">${summary.revenueUSD.toFixed(2)} <span className="text-[10px] text-muted-foreground">USD</span></p>
            <p className="text-sm font-bold">${summary.revenueBCV.toFixed(2)} <span className="text-[10px] text-muted-foreground">BCV</span></p>
          </div>
          <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/20 p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Seller Comm.</p>
            <p className="text-sm font-bold">${summary.commUSD.toFixed(2)} <span className="text-[10px] text-muted-foreground">USD</span></p>
            <p className="text-sm font-bold">${summary.commBCV.toFixed(2)} <span className="text-[10px] text-muted-foreground">BCV</span></p>
          </div>
          <div className="rounded-lg border bg-orange-50 dark:bg-orange-950/20 p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Installer Comm.</p>
            <p className="text-sm font-bold">${summary.instCommUSD.toFixed(2)} <span className="text-[10px] text-muted-foreground">USD</span></p>
            <p className="text-sm font-bold">${summary.instCommBCV.toFixed(2)} <span className="text-[10px] text-muted-foreground">BCV</span></p>
          </div>
        </div>
      )}

      {/* Search + Filters */}
      <div className="space-y-4">
        <div className="flex gap-3 items-end">
          <div className="flex-1 max-w-md space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <Search className="h-3 w-3" /> Search
            </Label>
            <Input
              placeholder="Search by customer, seller, zone, plan, reference..."
              value={filters.search}
              onChange={(e) => onChange("search", e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1">
            <Label className="text-xs">📅 Week</Label>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={selectedWeek}
              onChange={(e) => {
                setSelectedWeek(e.target.value);
                if (e.target.value) {
                  setFilters((f) => ({ ...f, startDate: "", endDate: "" }));
                }
              }}
            >
              <option value="">All weeks</option>
              {weeks.map((week) => (
                <option key={week.start.toISOString()} value={week.start.toISOString()}>
                  {week.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">📅 Start Date</Label>
            <Input
              type="date"
              value={filters.startDate}
              onChange={(e) => { onChange("startDate", e.target.value); setSelectedWeek(""); }}
              className="w-[160px]"
              disabled={!!selectedWeek}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">📅 End Date</Label>
            <Input
              type="date"
              value={filters.endDate}
              onChange={(e) => { onChange("endDate", e.target.value); setSelectedWeek(""); }}
              className="w-[160px]"
              disabled={!!selectedWeek}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">👤 Seller</Label>
            <Select value={filters.seller || "all"} onValueChange={(v) => onChange("seller", v === "all" ? "" : v)}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Sellers" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sellers</SelectItem>
                {filterOptions.sellers.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">📍 Zone</Label>
            <MultiSelect
              options={filterOptions.zones}
              value={filters.zones}
              onValueChange={(v) => setFilters((f) => ({ ...f, zones: v }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">💱 Currency</Label>
            <Select value={filters.currency || "all"} onValueChange={(v) => onChange("currency", v === "all" ? "" : v)}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="BCV">BCV</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">⚡ Type</Label>
            <Select value={filters.installationType || "all"} onValueChange={(v) => onChange("installationType", v === "all" ? "" : v)}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="FREE">🆓 FREE</SelectItem>
                <SelectItem value="PAID">💳 PAID</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={() => { setFilters({ ...emptyFilters, zones: [] }); setSelectedWeek(""); }} className="gap-1">
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            {loading ? "Loading..." : `${sorted.length} record${sorted.length !== 1 ? "s" : ""}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!loading && sorted.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <span className="text-4xl mb-3">📭</span>
              <p className="text-sm">No installations found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead label="📅 Date" sortKey="transactionDate" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortableHead label="👤 Customer" sortKey="customerName" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortableHead label="🤝 Seller" sortKey="sellerName" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortableHead label="📍 Zone" sortKey="zone" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortableHead label="📋 Plan" sortKey="plan" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortableHead label="⚡ Type" sortKey="installationType" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortableHead label="💳 Payment" sortKey="paymentMethod" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortableHead label="💱 Currency" sortKey="currency" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortableHead label="💰 Amount" sortKey="subscriptionAmount" currentKey={sortKey} dir={sortDir} onSort={handleSort} className="text-right" />
                    <TableHead>🤝 Seller Comm.</TableHead>
                    <TableHead>🔧 Inst. Comm.</TableHead>
                    <TableHead>🔗 Reference</TableHead>
                    {role === "admin" && <TableHead className="w-20 text-center">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((row) => (
                    <TableRow key={row.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="whitespace-nowrap">
                        {new Date(row.transactionDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell>{row.customerName}</TableCell>
                      <TableCell>
                        <Link href={`/sellers/${row.sellerId}`} className="text-primary underline-offset-4 hover:underline">
                          {row.sellerName}
                        </Link>
                      </TableCell>
                      <TableCell>{row.zone}</TableCell>
                      <TableCell>{row.plan}</TableCell>
                      <TableCell>
                        <Badge variant={row.installationType === "FREE" ? "secondary" : "default"}>
                          {row.installationType === "FREE" ? "🆓 FREE" : "💳 PAID"}
                        </Badge>
                      </TableCell>
                      <TableCell>{row.paymentMethod || "—"}</TableCell>
                      <TableCell>{row.currency}</TableCell>
                      <TableCell className="text-right font-mono">${(row.expectedPrice ?? row.subscriptionAmount).toFixed(2)}</TableCell>
                      <TableCell className="font-mono">${row.sellerCommission.toFixed(2)}</TableCell>
                      <TableCell className="font-mono">${row.installerCommission.toFixed(2)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row.referenceCode || "—"}</TableCell>
                      {role === "admin" && (
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              title="Edit installation"
                              className="inline-flex items-center justify-center rounded-md p-1.5 transition-colors hover:bg-muted text-muted-foreground hover:text-foreground"
                              onClick={() => handleOpenEdit(row)}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              title="Delete installation"
                              className="inline-flex items-center justify-center rounded-md p-1.5 transition-colors hover:bg-red-100 dark:hover:bg-red-950 text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
                              onClick={() => setDeleteTarget(row)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Installation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Installation" : "New Installation"}</DialogTitle>
            <DialogDescription>{editingId ? "Update the installation record." : "Create a new installation record."}</DialogDescription>
          </DialogHeader>

          {dialogLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.transactionDate}
                  onChange={(e) => set("transactionDate", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label>Customer Name</Label>
                <Input
                  placeholder="Customer name"
                  value={form.customerName}
                  onChange={(e) => set("customerName", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label>Seller</Label>
                <Combobox
                  options={sellers.map((s) => ({ value: String(s.id), label: s.sellerName }))}
                  value={form.sellerId}
                  onValueChange={(v) => set("sellerId", v)}
                  placeholder="Select a seller"
                  searchPlaceholder="Search sellers..."
                  emptyMessage="No sellers found."
                />
              </div>

              <div className="space-y-1">
                <Label>Zone</Label>
                <Combobox
                  options={[
                    ...zoneOptions.map((z) => ({ value: z, label: z })),
                    { value: "__custom", label: "+ New zone..." },
                  ]}
                  value={form.zone}
                  onValueChange={(v) => set("zone", v)}
                  placeholder="Select a zone"
                  searchPlaceholder="Search zones..."
                  emptyMessage="No zones found."
                />
                {form.zone === "__custom" && (
                  <Input
                    placeholder="Enter new zone name"
                    value={form.customZone}
                    onChange={(e) => set("customZone", e.target.value)}
                    required
                    className="mt-2"
                  />
                )}
              </div>

              <div className="space-y-1">
                <Label>Plan</Label>
                <Select value={form.planId} onValueChange={(v) => set("planId", v)} required>
                  <SelectTrigger><SelectValue placeholder="Select a plan" /></SelectTrigger>
                  <SelectContent>
                    {plans.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}{p.price > 0 ? ` — $${p.price.toFixed(2)}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPlan && selectedPlan.price > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Plan price: ${selectedPlan.price.toFixed(2)}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={form.installationType} onValueChange={(v) => set("installationType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FREE">FREE</SelectItem>
                    <SelectItem value="PAID">PAID</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Payment Method</Label>
                <Select value={form.paymentMethod} onValueChange={(v) => set("paymentMethod", v)} required>
                  <SelectTrigger><SelectValue placeholder="Select payment method" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ZELLE">ZELLE</SelectItem>
                    <SelectItem value="EFECTIVO">EFECTIVO</SelectItem>
                    <SelectItem value="EFECTIVO BS">EFECTIVO BS</SelectItem>
                    <SelectItem value="PAGO MOVIL">PAGO MOVIL</SelectItem>
                    <SelectItem value="MIXTO">MIXTO</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Reference Code (optional)</Label>
                <Input
                  placeholder="Reference code"
                  value={form.referenceCode}
                  onChange={(e) => set("referenceCode", e.target.value)}
                />
              </div>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Saving..." : editingId ? "Save Changes" : "Create Installation"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Installation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the installation for <strong>{deleteTarget?.customerName}</strong>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SortableHead({
  label,
  sortKey,
  currentKey,
  dir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const isActive = currentKey === sortKey;
  const arrow = isActive ? (dir === "asc" ? " ↑" : " ↓") : "";
  return (
    <TableHead
      className={`cursor-pointer select-none hover:text-foreground ${className ?? ""}`}
      onClick={() => onSort(sortKey)}
    >
      {label}{arrow}
    </TableHead>
  );
}
