"use client";

import { useState, useEffect, useCallback } from "react";
import { UploadSelector } from "@/components/upload-selector";
import { FilterBar } from "@/components/filter-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getUploads, getSales, getFilterOptions } from "@/lib/actions";
import { Receipt } from "lucide-react";

const emptyFilters = { startDate: "", endDate: "", seller: "", zone: "", currency: "", installationType: "" };

interface Upload {
  id: number;
  fileName: string;
  uploadedAt: Date;
  _count: { sales: number };
}

type Sale = Awaited<ReturnType<typeof getSales>>[number];

export default function SalesPage() {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [selectedUpload, setSelectedUpload] = useState("");
  const [filters, setFilters] = useState(emptyFilters);
  const [filterOptions, setFilterOptions] = useState<{ sellers: string[]; zones: string[] }>({ sellers: [], zones: [] });
  const [sales, setSales] = useState<Sale[]>([]);

  useEffect(() => {
    getUploads().then((u) => {
      setUploads(u);
      if (u.length > 0) setSelectedUpload(String(u[0].id));
    });
  }, []);

  useEffect(() => {
    if (selectedUpload) getFilterOptions(Number(selectedUpload)).then(setFilterOptions);
  }, [selectedUpload]);

  const loadData = useCallback(async () => {
    if (!selectedUpload) return;
    const res = await getSales({
      uploadId: Number(selectedUpload),
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      seller: filters.seller || undefined,
      zone: filters.zone || undefined,
      currency: (filters.currency || undefined) as "USD" | "BCV" | undefined,
      installationType: (filters.installationType || undefined) as "FREE" | "PAID" | undefined,
    });
    setSales(res);
  }, [selectedUpload, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <span>🧾</span> Sales Detail
        </h1>
        <UploadSelector uploads={uploads} selectedId={selectedUpload} onSelect={setSelectedUpload} />
      </div>

      <FilterBar
        sellers={filterOptions.sellers}
        zones={filterOptions.zones}
        filters={filters}
        onChange={(key, value) => setFilters((f) => ({ ...f, [key]: value }))}
        onClear={() => setFilters(emptyFilters)}
      />

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Sales ({sales.length} records)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <span className="text-4xl mb-3">📭</span>
              <p className="text-sm">No sales data available.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>📅 Date</TableHead>
                    <TableHead>👤 Customer</TableHead>
                    <TableHead>🤝 Seller</TableHead>
                    <TableHead>📍 Zone</TableHead>
                    <TableHead>📋 Plan</TableHead>
                    <TableHead className="text-right">🏷️ Plan Price</TableHead>
                    <TableHead>⚡ Type</TableHead>
                    <TableHead>💱 Currency</TableHead>
                    <TableHead className="text-right">💰 Amount</TableHead>
                    <TableHead>💳 Payment</TableHead>
                    <TableHead>🔗 Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="whitespace-nowrap">
                        {new Date(sale.transactionDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell>{sale.customerName}</TableCell>
                      <TableCell>{sale.sellerName}</TableCell>
                      <TableCell>{sale.zone}</TableCell>
                      <TableCell>{sale.plan}</TableCell>
                      <TableCell className="text-right font-mono">
                        {sale.expectedPrice != null ? `$${sale.expectedPrice}` : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={sale.installationType === "FREE" ? "secondary" : "default"}>
                          {sale.installationType === "FREE" ? "🆓 FREE" : "💳 PAID"}
                        </Badge>
                      </TableCell>
                      <TableCell>{sale.currency}</TableCell>
                      <TableCell className="text-right font-mono">
                        ${sale.subscriptionAmount.toFixed(2)}
                      </TableCell>
                      <TableCell>{sale.paymentMethod}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{sale.referenceCode || "-"}</TableCell>
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
