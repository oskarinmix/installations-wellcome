"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/kpi-card";
import { WeekSelector } from "@/components/week-selector";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { getSellerDetail, getSellerAvailableWeeks, generateSellerReport, getCurrentUserRole } from "@/lib/actions";
import { getAvailableWeeks, getLastCompleteWeek, type WeekRange } from "@/lib/week-utils";
import { ArrowLeft, FileText, Download, Loader2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer,
} from "recharts";

type SellerDetailData = Awaited<ReturnType<typeof getSellerDetail>>;

export default function SellerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sellerId = Number(params.id);

  const [weeks, setWeeks] = useState<WeekRange[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<WeekRange | null>(null);
  const [data, setData] = useState<SellerDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    getCurrentUserRole().then((res) => {
      if (res?.role !== "admin") {
        router.replace("/installations");
      }
    });
  }, [router]);

  useEffect(() => {
    getSellerAvailableWeeks(sellerId).then((dates) => {
      const available = getAvailableWeeks(dates.map((d) => new Date(d)));
      setWeeks(available);
      setSelectedWeek(getLastCompleteWeek(available));
    });
  }, [sellerId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const detail = await getSellerDetail(
      sellerId,
      selectedWeek ? selectedWeek.start.toISOString() : undefined,
      selectedWeek ? selectedWeek.end.toISOString() : undefined
    );
    setData(detail);
    setLoading(false);
  }, [sellerId, selectedWeek]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDownloadPdf = async () => {
    if (!selectedWeek || !data) return;
    setPdfLoading(true);
    try {
      const base64 = await generateSellerReport(
        sellerId,
        selectedWeek.start.toISOString(),
        selectedWeek.end.toISOString(),
        selectedWeek.label
      );
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.sellerName}_${selectedWeek.label.replace(/\s/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/sellers"
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <span>👤</span> {data?.sellerName ?? "Cargando..."}
        </h1>
      </div>

      {/* Week selector + action buttons */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <WeekSelector weeks={weeks} selectedWeek={selectedWeek} onSelect={setSelectedWeek} />
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setReportOpen(true)}
            disabled={!selectedWeek || !data || data.totalSales === 0}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            📄 Ver Reporte
          </Button>
          <Button
            onClick={handleDownloadPdf}
            disabled={!selectedWeek || pdfLoading}
            className="gap-2"
          >
            {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {pdfLoading ? "Generando..." : "📥 Descargar PDF"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <span className="text-4xl mb-3 animate-pulse">⏳</span>
          <p>Cargando...</p>
        </div>
      ) : !data || data.totalSales === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <span className="text-4xl mb-3">📭</span>
          <p>Sin datos de ventas para esta selección.</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
            <KpiCard title="Ventas Totales" value={data.totalSales} icon="🛒" />
            <KpiCard title="Gratis" value={data.freeCount} icon="🆓" />
            <KpiCard title="Pagadas" value={data.paidCount} icon="💳" />
            <KpiCard title="Ingresos USD" value={`$${data.revenueUSD.toFixed(2)}`} icon="💵" />
            <KpiCard title="Ingresos BCV" value={`$${data.revenueBCV.toFixed(2)}`} icon="💰" />
            <KpiCard title="Comisión USD" value={`$${data.commissionUSD.toFixed(2)}`} icon="🤝" />
            <KpiCard title="Comisión BCV" value={`$${data.commissionBCV.toFixed(2)}`} icon="🤝" />
          </div>

          {/* Charts */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {data.byPlan.length > 0 && (
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">📋 Ventas por Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={data.byPlan}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {data.byZone.length > 0 && (
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">📍 Ventas por Zona</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={data.byZone}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#16a34a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">⚡ Gratis vs Pagadas</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Gratis", value: data.freeCount },
                        { name: "Pagadas", value: data.paidCount },
                      ]}
                      cx="50%" cy="50%" outerRadius={80}
                      label={({ name, value }) => `${name}: ${value}`}
                      dataKey="value"
                    >
                      <Cell fill="#2563eb" />
                      <Cell fill="#16a34a" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Transactions Table */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📝 Transacciones ({data.transactions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>📅 Fecha</TableHead>
                      <TableHead>👤 Cliente</TableHead>
                      <TableHead>📍 Zona</TableHead>
                      <TableHead>📋 Plan</TableHead>
                      <TableHead>⚡ Tipo</TableHead>
                      <TableHead>💱 Moneda</TableHead>
                      <TableHead className="text-right">💰 Monto</TableHead>
                      <TableHead className="text-right">🤝 Comisión</TableHead>
                      <TableHead>💳 Pago</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.transactions.map((tx) => (
                      <TableRow key={tx.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="whitespace-nowrap">
                          {new Date(tx.transactionDate).toLocaleDateString("es", {
                            month: "short", day: "numeric", year: "numeric",
                          })}
                        </TableCell>
                        <TableCell>{tx.customerName}</TableCell>
                        <TableCell>{tx.zone}</TableCell>
                        <TableCell>{tx.plan}</TableCell>
                        <TableCell>
                          <Badge variant={tx.installationType === "FREE" ? "secondary" : "default"}>
                            {tx.installationType === "FREE" ? "🆓 GRATIS" : "💳 PAGADA"}
                          </Badge>
                        </TableCell>
                        <TableCell>{tx.currency}</TableCell>
                        <TableCell className="text-right font-mono">${tx.subscriptionAmount.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono">${tx.sellerCommission.toFixed(2)}</TableCell>
                        <TableCell>{tx.paymentMethod}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Report Dialog */}
          <Dialog open={reportOpen} onOpenChange={setReportOpen}>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  📊 Reporte Semanal — {data.sellerName}
                </DialogTitle>
                <DialogDescription asChild>
                  <div className="flex items-center gap-3 pt-1">
                    <select
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                      value={selectedWeek?.start.toISOString() ?? ""}
                      onChange={(e) => {
                        const week = weeks.find((w) => w.start.toISOString() === e.target.value);
                        if (week) setSelectedWeek(week);
                      }}
                    >
                      {weeks.map((week) => (
                        <option key={week.start.toISOString()} value={week.start.toISOString()}>
                          📅 {week.label}
                        </option>
                      ))}
                    </select>
                    {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                  </div>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 overflow-y-auto pr-1 flex-1 min-h-0">
                {/* Summary */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/20 p-2.5 text-center">
                    <p className="text-[10px] text-muted-foreground">🛒 Ventas</p>
                    <p className="text-xl font-bold">{data.totalSales}</p>
                  </div>
                  <div className="rounded-lg border bg-green-50 dark:bg-green-950/20 p-2.5 text-center">
                    <p className="text-[10px] text-muted-foreground">🆓 Gratis</p>
                    <p className="text-xl font-bold text-green-700 dark:text-green-400">{data.freeCount}</p>
                  </div>
                  <div className="rounded-lg border bg-purple-50 dark:bg-purple-950/20 p-2.5 text-center">
                    <p className="text-[10px] text-muted-foreground">💳 Pagadas</p>
                    <p className="text-xl font-bold text-purple-700 dark:text-purple-400">{data.paidCount}</p>
                  </div>
                  <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/20 p-2.5 text-center">
                    <p className="text-[10px] text-muted-foreground">🤝 Com.</p>
                    <p className="text-sm font-bold leading-tight mt-0.5">
                      ${data.commissionUSD.toFixed(2)} <span className="text-muted-foreground text-[10px]">USD</span>
                    </p>
                    <p className="text-sm font-bold leading-tight">
                      ${data.commissionBCV.toFixed(2)} <span className="text-muted-foreground text-[10px]">BCV</span>
                    </p>
                  </div>
                </div>

                {/* Revenue row */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border p-2.5 text-center">
                    <p className="text-[10px] text-muted-foreground">💵 Ingresos USD</p>
                    <p className="text-lg font-bold">${data.revenueUSD.toFixed(2)}</p>
                  </div>
                  <div className="rounded-lg border p-2.5 text-center">
                    <p className="text-[10px] text-muted-foreground">💰 Ingresos BCV</p>
                    <p className="text-lg font-bold">${data.revenueBCV.toFixed(2)}</p>
                  </div>
                </div>

                {/* Plan & Zone side by side */}
                {(data.byPlan.length > 0 || data.byZone.length > 0) && (
                  <div className="grid grid-cols-2 gap-3">
                    {data.byPlan.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold mb-1.5">📋 Por Plan</h4>
                        <div className="rounded-lg border overflow-hidden">
                          <Table>
                            <TableBody>
                              {data.byPlan.map((p) => (
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
                    {data.byZone.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold mb-1.5">📍 Por Zona</h4>
                        <div className="rounded-lg border overflow-hidden">
                          <Table>
                            <TableBody>
                              {data.byZone.map((z) => (
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

                {/* Transactions - compact */}
                <div>
                  <h4 className="text-xs font-semibold mb-1.5">📝 Transacciones ({data.transactions.length})</h4>
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
                        {data.transactions.map((tx) => (
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

              <DialogFooter className="pt-3 border-t">
                <Button variant="outline" size="sm" onClick={() => setReportOpen(false)}>
                  Cerrar
                </Button>
                <Button size="sm" onClick={handleDownloadPdf} disabled={pdfLoading} className="gap-1.5">
                  {pdfLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  {pdfLoading ? "Generando..." : "📥 Descargar PDF"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
