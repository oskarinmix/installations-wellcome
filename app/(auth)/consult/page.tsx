"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  validateSellerPin,
  getSellerDetail,
  getSellerAvailableWeeks,
  generateSellerReport,
} from "@/lib/actions";
import { getAvailableWeeks, getLastCompleteWeek, type WeekRange } from "@/lib/week-utils";
import { Loader2, Download, ArrowLeft, LogIn } from "lucide-react";

type SellerDetailData = Awaited<ReturnType<typeof getSellerDetail>>;

export default function ConsultPage() {
  // Auth state
  const [sellerId, setSellerId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Authenticated state
  const [authenticated, setAuthenticated] = useState(false);
  const [authedSellerId, setAuthedSellerId] = useState<number | null>(null);
  const [sellerName, setSellerName] = useState("");

  // Report state
  const [weeks, setWeeks] = useState<WeekRange[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<WeekRange | null>(null);
  const [reportData, setReportData] = useState<SellerDetailData | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const loadReport = useCallback(async (sid: number, week: WeekRange) => {
    setReportLoading(true);
    try {
      const detail = await getSellerDetail(
        sid,
        week.start.toISOString(),
        week.end.toISOString()
      );
      setReportData(detail);
    } finally {
      setReportLoading(false);
    }
  }, []);

  // Load weeks after authentication
  useEffect(() => {
    if (!authedSellerId) return;
    getSellerAvailableWeeks(authedSellerId).then((dates) => {
      const available = getAvailableWeeks(dates.map((d) => new Date(d)));
      setWeeks(available);
      const lastWeek = getLastCompleteWeek(available);
      setSelectedWeek(lastWeek);
      if (lastWeek) {
        loadReport(authedSellerId, lastWeek);
      }
    });
  }, [authedSellerId, loadReport]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const id = parseInt(sellerId, 10);
    if (isNaN(id) || id <= 0) {
      setError("Please enter a valid seller ID.");
      return;
    }
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setError("PIN must be exactly 4 digits.");
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
        setError("Invalid seller ID or PIN.");
      }
    } catch {
      setError("An error occurred. Please try again.");
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

  const handleBack = () => {
    setAuthenticated(false);
    setAuthedSellerId(null);
    setSellerName("");
    setReportData(null);
    setWeeks([]);
    setSelectedWeek(null);
    setPin("");
    setError("");
  };

  // ── Login Form ──
  if (!authenticated) {
    return (
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Seller Consult</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter your seller ID and PIN to view your report.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="sellerId">Seller ID</Label>
              <Input
                id="sellerId"
                type="number"
                placeholder="e.g. 1"
                value={sellerId}
                onChange={(e) => setSellerId(e.target.value)}
                required
                autoFocus
                min={1}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pin">PIN</Label>
              <Input
                id="pin"
                type="password"
                placeholder="4-digit PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                required
                maxLength={4}
                inputMode="numeric"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full gap-2" disabled={verifying}>
              {verifying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              {verifying ? "Verifying..." : "View Report"}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  // ── Report View ──
  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{sellerName}</h1>
          <p className="text-sm text-muted-foreground">Seller ID: {authedSellerId}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleBack} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>

      {/* Week selector + PDF download */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="space-y-1">
          <Label className="text-xs">Week</Label>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={selectedWeek?.start.toISOString() ?? ""}
            onChange={(e) => handleWeekChange(e.target.value)}
          >
            <option value="">Select week...</option>
            {weeks.map((week) => (
              <option key={week.start.toISOString()} value={week.start.toISOString()}>
                {week.label}
              </option>
            ))}
          </select>
        </div>
        <div className="pt-5">
          <Button
            size="sm"
            onClick={handleDownloadPdf}
            disabled={pdfLoading || !reportData || reportData.totalSales === 0}
            className="gap-1.5"
          >
            {pdfLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {pdfLoading ? "Generating..." : "Download PDF"}
          </Button>
        </div>
        {reportLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mt-5" />}
      </div>

      {/* Report content */}
      {reportLoading ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mb-3" />
          <p className="text-sm">Loading report...</p>
        </div>
      ) : !reportData || reportData.totalSales === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <p className="text-sm">No sales for the selected week.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Total Sales</p>
                <p className="text-2xl font-bold">{reportData.totalSales}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Free</p>
                <p className="text-2xl font-bold text-green-600">{reportData.freeCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Paid</p>
                <p className="text-2xl font-bold text-purple-600">{reportData.paidCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Commission</p>
                <p className="text-sm font-bold">${reportData.commissionUSD.toFixed(2)} USD</p>
                <p className="text-sm font-bold">${reportData.commissionBCV.toFixed(2)} BCV</p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Revenue USD</p>
                <p className="text-lg font-bold">${reportData.revenueUSD.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Revenue BCV</p>
                <p className="text-lg font-bold">${reportData.revenueBCV.toFixed(2)}</p>
              </CardContent>
            </Card>
          </div>

          {/* By Plan & By Zone */}
          {(reportData.byPlan.length > 0 || reportData.byZone.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {reportData.byPlan.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">By Plan</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Table>
                      <TableBody>
                        {reportData.byPlan.map((p) => (
                          <TableRow key={p.name} className="text-sm">
                            <TableCell className="py-1.5">{p.name}</TableCell>
                            <TableCell className="py-1.5 text-right font-mono">{p.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
              {reportData.byZone.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">By Zone</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Table>
                      <TableBody>
                        {reportData.byZone.map((z) => (
                          <TableRow key={z.name} className="text-sm">
                            <TableCell className="py-1.5">{z.name}</TableCell>
                            <TableCell className="py-1.5 text-right font-mono">{z.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Transactions Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Transactions ({reportData.transactions.length})</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead className="py-1.5">Date</TableHead>
                      <TableHead className="py-1.5">Customer</TableHead>
                      <TableHead className="py-1.5">Plan</TableHead>
                      <TableHead className="py-1.5">Type</TableHead>
                      <TableHead className="py-1.5 text-right">Amount</TableHead>
                      <TableHead className="py-1.5 text-right">Commission</TableHead>
                      <TableHead className="py-1.5">Payment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.transactions.map((tx) => (
                      <TableRow key={tx.id} className="text-xs">
                        <TableCell className="py-1.5 whitespace-nowrap">
                          {new Date(tx.transactionDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="py-1.5 max-w-[160px] truncate">{tx.customerName}</TableCell>
                        <TableCell className="py-1.5 whitespace-nowrap">{tx.plan}</TableCell>
                        <TableCell className="py-1.5">
                          <span
                            className={`inline-block rounded px-1 py-0.5 text-[10px] font-medium ${
                              tx.installationType === "FREE"
                                ? "bg-gray-100 dark:bg-gray-800"
                                : "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                            }`}
                          >
                            {tx.installationType}
                          </span>
                        </TableCell>
                        <TableCell className="py-1.5 text-right font-mono">
                          ${tx.subscriptionAmount.toFixed(2)}
                        </TableCell>
                        <TableCell className="py-1.5 text-right font-mono">
                          ${tx.sellerCommission.toFixed(2)}
                        </TableCell>
                        <TableCell className="py-1.5">{tx.paymentMethod}</TableCell>
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
