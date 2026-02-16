"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { UploadSelector } from "@/components/upload-selector";
import { FilterBar } from "@/components/filter-bar";
import { KpiCard } from "@/components/kpi-card";
import { getUploads, getInstallerReport, getFilterOptions, getCurrentUserRole } from "@/lib/actions";

const emptyFilters = { startDate: "", endDate: "", seller: "", zones: [] as string[], currency: "", installationType: "" };

interface Upload {
  id: number;
  fileName: string;
  uploadedAt: Date;
  _count: { sales: number };
}

export default function InstallersPage() {
  const router = useRouter();
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [selectedUpload, setSelectedUpload] = useState("");
  const [filters, setFilters] = useState(emptyFilters);
  const [filterOptions, setFilterOptions] = useState<{ sellers: string[]; zones: string[] }>({ sellers: [], zones: [] });
  const [data, setData] = useState<Awaited<ReturnType<typeof getInstallerReport>> | null>(null);

  useEffect(() => {
    getCurrentUserRole().then((res) => {
      if (res?.role !== "admin") {
        router.replace("/installations");
        return;
      }
    });
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
    const res = await getInstallerReport({
      uploadId: Number(selectedUpload),
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      seller: filters.seller || undefined,
      zones: filters.zones.length > 0 ? filters.zones : undefined,
      currency: (filters.currency || undefined) as "USD" | "BCV" | undefined,
      installationType: (filters.installationType || undefined) as "FREE" | "PAID" | undefined,
    });
    setData(res);
  }, [selectedUpload, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <span>🔧</span> Installer Report
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

      {!data ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <span className="text-5xl mb-4">📁</span>
          <p className="text-lg">Select an upload to view the installer report.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <KpiCard title="Total Installations" value={data.totalInstallations} icon="🔧" />
          <KpiCard title="Free Installations" value={data.freeInstallations} icon="🆓" />
          <KpiCard title="Paid Installations" value={data.paidInstallations} icon="💳" />
          <KpiCard title="Installer Commission USD" value={`$${data.commissionUSD.toFixed(2)}`} icon="💵" />
          <KpiCard title="Installer Commission BCV" value={`$${data.commissionBCV.toFixed(2)}`} icon="💰" />
        </div>
      )}
    </div>
  );
}
