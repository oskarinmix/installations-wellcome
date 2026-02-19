"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  validateSellerPin,
  getSellerDetail,
  getSellerAvailableWeeks,
  generateSellerReport,
  getBcvRate,
} from "@/lib/actions";
import { getAvailableWeeks, getLastCompleteWeek, type WeekRange } from "@/lib/week-utils";
import { Loader2, Download, LogOut, KeyRound, ShieldCheck, CalendarDays, TrendingUp } from "lucide-react";

type SellerDetailData = Awaited<ReturnType<typeof getSellerDetail>>;

export default function ConsultPage() {
  // Auth
  const [sellerId, setSellerId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Session
  const [authenticated, setAuthenticated] = useState(false);
  const [authedSellerId, setAuthedSellerId] = useState<number | null>(null);
  const [sellerName, setSellerName] = useState("");

  // Report
  const [weeks, setWeeks] = useState<WeekRange[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<WeekRange | null>(null);
  const [reportData, setReportData] = useState<SellerDetailData | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [bcvRate, setBcvRate] = useState<number>(0);

  const loadReport = useCallback(async (sid: number, week: WeekRange) => {
    setReportLoading(true);
    try {
      const detail = await getSellerDetail(sid, week.start.toISOString(), week.end.toISOString());
      setReportData(detail);
    } finally {
      setReportLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    getBcvRate().then((r) => setBcvRate(r.rate));
  }, [authenticated]);

  useEffect(() => {
    if (!authedSellerId) return;
    getSellerAvailableWeeks(authedSellerId).then((dates) => {
      const available = getAvailableWeeks(dates.map((d) => new Date(d)));
      setWeeks(available);
      const lastWeek = getLastCompleteWeek(available);
      setSelectedWeek(lastWeek);
      if (lastWeek) loadReport(authedSellerId, lastWeek);
    });
  }, [authedSellerId, loadReport]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const id = parseInt(sellerId, 10);
    if (isNaN(id) || id <= 0) {
      setError("Ingresa un ID de vendedor válido.");
      return;
    }
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setError("El PIN debe tener exactamente 4 dígitos.");
      return;
    }
    setVerifying(true);
    try {
      const result = await validateSellerPin(id, pin);
      if (result.valid) {
        setAuthedSellerId(id);
        setSellerName(result.sellerName!);
        setAuthenticated(true);
      } else {
        setError("ID o PIN incorrecto.");
      }
    } catch {
      setError("Ocurrió un error. Intenta de nuevo.");
    } finally {
      setVerifying(false);
    }
  };

  const handleWeekChange = (weekIso: string) => {
    const week = weeks.find((w) => w.start.toISOString() === weekIso);
    if (week && authedSellerId) {
      setSelectedWeek(week);
      loadReport(authedSellerId, week);
    }
  };

  const handleDownloadPdf = async () => {
    if (!selectedWeek || !authedSellerId || !reportData) return;
    setPdfLoading(true);
    try {
      const base64 = await generateSellerReport(
        authedSellerId,
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

  const handleLogout = () => {
    setAuthenticated(false);
    setAuthedSellerId(null);
    setSellerName("");
    setReportData(null);
    setWeeks([]);
    setSelectedWeek(null);
    setPin("");
    setError("");
  };

  // ── Login ──
  if (!authenticated) {
    return (
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Consulta de Vendedor</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ingresa tus credenciales para ver tu reporte semanal.
          </p>
        </div>

        <Card className="shadow-lg border-0 bg-card/80 backdrop-blur">
          <CardContent className="pt-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="sellerId" className="text-sm font-medium">ID de Vendedor</Label>
                <Input
                  id="sellerId"
                  type="number"
                  placeholder="Ej: 1"
                  value={sellerId}
                  onChange={(e) => setSellerId(e.target.value)}
                  required
                  autoFocus
                  min={1}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pin" className="text-sm font-medium flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5" /> PIN
                </Label>
                <Input
                  id="pin"
                  type="password"
                  placeholder="4 dígitos"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  required
                  maxLength={4}
                  inputMode="numeric"
                  className="h-11 tracking-[0.5em] text-center text-lg"
                />
              </div>
              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
              <Button type="submit" className="w-full h-11 gap-2 text-base" disabled={verifying}>
                {verifying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                {verifying ? "Verificando..." : "Ingresar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Report ──
  const totalCommission = (reportData?.commissionUSD ?? 0) + (reportData?.commissionBCV ?? 0);

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary font-bold text-lg">
            {sellerName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">{sellerName}</h1>
            <p className="text-xs text-muted-foreground">ID: {authedSellerId}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5 text-muted-foreground hover:text-foreground">
          <LogOut className="h-4 w-4" /> Salir
        </Button>
      </div>

      {/* Week selector + PDF */}
      <Card className="shadow-sm">
        <CardContent className="py-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm font-medium"
              value={selectedWeek?.start.toISOString() ?? ""}
              onChange={(e) => handleWeekChange(e.target.value)}
            >
              <option value="">Seleccionar semana...</option>
              {weeks.map((week) => (
                <option key={week.start.toISOString()} value={week.start.toISOString()}>
                  {week.label}
                </option>
              ))}
            </select>
            {reportLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <Button
            size="sm"
            onClick={handleDownloadPdf}
            disabled={pdfLoading || !reportData || reportData.totalSales === 0}
            className="gap-1.5"
          >
            {pdfLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {pdfLoading ? "Generando..." : "Descargar PDF"}
          </Button>
        </CardContent>
      </Card>

      {/* Content */}
      {reportLoading ? (
        <div className="flex flex-col items-center py-20 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mb-3" />
          <p className="text-sm">Cargando reporte...</p>
        </div>
      ) : !reportData || reportData.totalSales === 0 ? (
        <div className="flex flex-col items-center py-20 text-muted-foreground">
          <span className="text-5xl mb-4">📭</span>
          <p className="text-base font-medium">Sin ventas esta semana</p>
          <p className="text-xs mt-1">Selecciona otra semana para ver tu reporte.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="border-0 shadow-sm bg-blue-50 dark:bg-blue-950/30">
              <CardContent className="p-4 text-center">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Ventas</p>
                <p className="text-3xl font-bold mt-1">{reportData.totalSales}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-green-50 dark:bg-green-950/30">
              <CardContent className="p-4 text-center">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Gratis</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">{reportData.freeCount}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-purple-50 dark:bg-purple-950/30">
              <CardContent className="p-4 text-center">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Pagadas</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-1">{reportData.paidCount}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-amber-50 dark:bg-amber-950/30">
              <CardContent className="p-4 text-center">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Comisiones</p>
                <div className="mt-1">
                  {reportData.commissionUSD > 0 && (
                    <p className="text-lg font-bold">${reportData.commissionUSD.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">USD</span></p>
                  )}
                  {reportData.commissionBCV > 0 && (
                    <p className="text-lg font-bold">${reportData.commissionBCV.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">BCV</span></p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bs Conversion */}
          {bcvRate > 0 && reportData.commissionBCV > 0 && (
            <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/20 shadow-sm">
              <CardContent className="py-4 px-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🇻🇪</span>
                    <div>
                      <p className="text-sm font-semibold">Comisión BCV en Bolívares</p>
                      <p className="text-[11px] text-muted-foreground">Tasa BCV: {bcvRate.toFixed(2)} Bs/$</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                      {(reportData.commissionBCV * bcvRate).toFixed(2)} <span className="text-sm">Bs</span>
                    </p>
                    <p className="text-xs text-muted-foreground">(${reportData.commissionBCV.toFixed(2)} BCV)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Total commission highlight */}
          {totalCommission > 0 && (
            <Card className="border-0 shadow-sm bg-gradient-to-r from-primary/5 to-primary/10">
              <CardContent className="py-4 px-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <p className="text-sm font-semibold">Total Comisiones (USD)</p>
                </div>
                <p className="text-2xl font-bold text-primary">${totalCommission.toFixed(2)}</p>
              </CardContent>
            </Card>
          )}

          {/* Plan & Zone */}
          {(reportData.byPlan.length > 0 || reportData.byZone.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {reportData.byPlan.length > 0 && (
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-1.5">
                      <span>📋</span> Por Plan
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Table>
                      <TableBody>
                        {reportData.byPlan.map((p) => (
                          <TableRow key={p.name} className="text-sm">
                            <TableCell className="py-2">{p.name}</TableCell>
                            <TableCell className="py-2 text-right">
                              <Badge variant="secondary" className="font-mono">{p.count}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
              {reportData.byZone.length > 0 && (
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-1.5">
                      <span>📍</span> Por Zona
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Table>
                      <TableBody>
                        {reportData.byZone.map((z) => (
                          <TableRow key={z.name} className="text-sm">
                            <TableCell className="py-2">{z.name}</TableCell>
                            <TableCell className="py-2 text-right">
                              <Badge variant="secondary" className="font-mono">{z.count}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Transactions */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <span>📝</span> Transacciones
                <Badge variant="outline" className="ml-1 font-mono">{reportData.transactions.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs bg-muted/40">
                      <TableHead className="py-2">Fecha</TableHead>
                      <TableHead className="py-2">Cliente</TableHead>
                      <TableHead className="py-2">Plan</TableHead>
                      <TableHead className="py-2">Tipo</TableHead>
                      <TableHead className="py-2 text-right">Monto</TableHead>
                      <TableHead className="py-2 text-right">Cobro Inst.</TableHead>
                      <TableHead className="py-2 text-right">Comisión</TableHead>
                      <TableHead className="py-2">Pago</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.transactions.map((tx) => (
                      <TableRow key={tx.id} className="text-xs hover:bg-muted/30 transition-colors">
                        <TableCell className="py-2 whitespace-nowrap">
                          {new Date(tx.transactionDate).toLocaleDateString("es", {
                            month: "short",
                            day: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="py-2 max-w-[160px] truncate">{tx.customerName}</TableCell>
                        <TableCell className="py-2 whitespace-nowrap">{tx.plan}</TableCell>
                        <TableCell className="py-2">
                          <Badge variant={tx.installationType === "FREE" ? "secondary" : "default"} className="text-[10px]">
                            {tx.installationType === "FREE" ? "GRATIS" : "PAGADA"}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 text-right font-mono">
                          ${tx.subscriptionAmount.toFixed(2)}
                        </TableCell>
                        <TableCell className="py-2 text-right font-mono">
                          {tx.installationFee != null ? `$${tx.installationFee.toFixed(2)}` : "—"}
                        </TableCell>
                        <TableCell className="py-2 text-right font-mono font-semibold text-primary">
                          ${tx.sellerCommission.toFixed(2)}
                        </TableCell>
                        <TableCell className="py-2">{tx.paymentMethod}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
