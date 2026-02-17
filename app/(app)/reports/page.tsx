"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  getCurrentUserRole,
  getAllAvailableWeeks,
  getSellersSummaryForWeek,
  generateSellerReport,
  generateAllSellerReports,
} from "@/lib/actions";
import { getAvailableWeeks, getLastCompleteWeek, type WeekRange } from "@/lib/week-utils";
import { FileText, Download, Loader2 } from "lucide-react";

type SellerSummary = { id: number; name: string; salesCount: number };

export default function ReportsPage() {
  const router = useRouter();
  const [weeks, setWeeks] = useState<WeekRange[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<WeekRange | null>(null);
  const [sellers, setSellers] = useState<SellerSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [zipLoading, setZipLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState<number | null>(null);

  useEffect(() => {
    getCurrentUserRole().then((res) => {
      if (res?.role !== "admin") {
        router.replace("/installations");
        return;
      }
    });
    getAllAvailableWeeks().then((dates) => {
      const available = getAvailableWeeks(dates.map((d) => new Date(d)));
      setWeeks(available);
      setSelectedWeek(getLastCompleteWeek(available));
    });
  }, [router]);

  const loadSellers = useCallback(async () => {
    if (!selectedWeek) return;
    setLoading(true);
    const data = await getSellersSummaryForWeek(
      selectedWeek.start.toISOString(),
      selectedWeek.end.toISOString()
    );
    setSellers(data);
    setLoading(false);
  }, [selectedWeek]);

  useEffect(() => {
    loadSellers();
  }, [loadSellers]);

  const handleDownloadOne = async (seller: SellerSummary) => {
    if (!selectedWeek) return;
    setPdfLoading(seller.id);
    try {
      const base64 = await generateSellerReport(
        seller.id,
        selectedWeek.start.toISOString(),
        selectedWeek.end.toISOString(),
        selectedWeek.label
      );
      downloadFile(
        base64,
        "application/pdf",
        `${seller.name.replace(/[^a-zA-Z0-9_-]/g, "_")}_${selectedWeek.label.replace(/\s/g, "_")}.pdf`
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al generar reporte");
    } finally {
      setPdfLoading(null);
    }
  };

  const handleDownloadAll = async () => {
    if (!selectedWeek) return;
    setZipLoading(true);
    try {
      const base64 = await generateAllSellerReports(
        selectedWeek.start.toISOString(),
        selectedWeek.end.toISOString(),
        selectedWeek.label
      );
      downloadFile(
        base64,
        "application/pdf",
        `All_Sellers_${selectedWeek.label.replace(/\s/g, "_")}.pdf`
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al generar reportes");
    } finally {
      setZipLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-3">
        <span>📊</span> Reportes
      </h1>

      <div className="flex flex-wrap gap-4 items-end">
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

        <Button
          onClick={handleDownloadAll}
          disabled={zipLoading || sellers.length === 0 || !selectedWeek}
          className="gap-2"
        >
          {zipLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {zipLoading ? "Generando..." : "Descargar Todos los Reportes (PDF)"}
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {loading
              ? "Cargando..."
              : sellers.length > 0
                ? `${sellers.length} vendedor${sellers.length !== 1 ? "es" : ""} con ventas`
                : "Sin vendedores con ventas"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-3" />
              <p className="text-sm">Cargando vendedores...</p>
            </div>
          ) : sellers.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <span className="text-4xl mb-3">📭</span>
              <p className="text-sm">
                {selectedWeek ? "No hay vendedores con ventas esta semana." : "Selecciona una semana para ver vendedores."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-center">Ventas</TableHead>
                  <TableHead className="w-32 text-center">Reporte</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sellers.map((seller) => (
                  <TableRow key={seller.id}>
                    <TableCell className="font-medium">{seller.name}</TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 text-sm font-semibold">
                        {seller.salesCount}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        disabled={pdfLoading === seller.id}
                        onClick={() => handleDownloadOne(seller)}
                      >
                        {pdfLoading === seller.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                        PDF
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function downloadFile(base64: string, mimeType: string, fileName: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
