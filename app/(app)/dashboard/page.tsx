"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FilterBar } from "@/components/filter-bar";
import { KpiCard } from "@/components/kpi-card";
import { Label } from "@/components/ui/label";
import { getDashboardData, getGlobalFilterOptions, getAllAvailableWeeks, getCurrentUserRole } from "@/lib/actions";
import { getAvailableWeeks, type WeekRange } from "@/lib/week-utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = ["#2563eb", "#16a34a", "#ea580c", "#9333ea", "#dc2626", "#0891b2"];

const emptyFilters = { startDate: "", endDate: "", seller: "", zones: [] as string[], currency: "", installationType: "" };

export default function DashboardPage() {
  const router = useRouter();
  const [filters, setFilters] = useState(emptyFilters);
  const [filterOptions, setFilterOptions] = useState<{ sellers: string[]; zones: string[] }>({ sellers: [], zones: [] });
  const [data, setData] = useState<Awaited<ReturnType<typeof getDashboardData>> | null>(null);

  // Week filter
  const [weeks, setWeeks] = useState<WeekRange[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>("");

  useEffect(() => {
    getCurrentUserRole().then((res) => {
      if (res?.role !== "admin") {
        router.replace("/installations");
        return;
      }
    });
    getGlobalFilterOptions().then(setFilterOptions);
    getAllAvailableWeeks().then((dates) => {
      const available = getAvailableWeeks(dates.map((d) => new Date(d)));
      setWeeks(available);
    });
  }, []);

  const loadData = useCallback(async () => {
    let startDate = filters.startDate || undefined;
    let endDate = filters.endDate || undefined;
    if (selectedWeek) {
      const week = weeks.find((w) => w.start.toISOString() === selectedWeek);
      if (week) {
        startDate = week.start.toISOString();
        endDate = week.end.toISOString();
      }
    }

    const res = await getDashboardData({
      startDate,
      endDate,
      seller: filters.seller || undefined,
      zones: filters.zones.length > 0 ? filters.zones : undefined,
      currency: (filters.currency || undefined) as "USD" | "BCV" | undefined,
      installationType: (filters.installationType || undefined) as "FREE" | "PAID" | undefined,
    });
    setData(res);
  }, [filters, selectedWeek, weeks]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-3">
        <span>📊</span> Dashboard
      </h1>

      {/* Week selector + filters */}
      <div className="space-y-4">
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
        </div>

        <FilterBar
          sellers={filterOptions.sellers}
          zones={filterOptions.zones}
          filters={filters}
          onChange={(key, value) => {
            setFilters((f) => ({ ...f, [key]: value }));
            if (key === "startDate" || key === "endDate") setSelectedWeek("");
          }}
          onClear={() => { setFilters({ ...emptyFilters, zones: [] }); setSelectedWeek(""); }}
          disableDates={!!selectedWeek}
        />
      </div>

      {!data ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <span className="text-5xl mb-4">📁</span>
          <p className="text-lg">Loading dashboard data...</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard title="Total Sales" value={data.totalSales} icon="🛒" />
            <KpiCard title="Revenue USD" value={`$${data.totalRevenueUSD.toFixed(2)}`} icon="💵" />
            <KpiCard title="Revenue BCV" value={`$${data.totalRevenueBCV.toFixed(2)}`} icon="💰" />
            <KpiCard
              title="Seller Commissions"
              value={`$${data.totalSellerCommissionUSD.toFixed(2)} / $${data.totalSellerCommissionBCV.toFixed(2)}`}
              icon="🤝"
            />
            <KpiCard
              title="Installer Commission"
              value={`$${data.totalInstallerCommissionUSD.toFixed(2)} / $${data.totalInstallerCommissionBCV.toFixed(2)}`}
              icon="🔧"
            />
            <KpiCard title="Free Installations" value={data.freeCount} icon="🆓" />
            <KpiCard title="Paid Installations" value={data.paidCount} icon="💳" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <h3 className="mb-4 font-semibold flex items-center gap-2">
                <span>👤</span> Sales by Seller
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.salesBySeller}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <h3 className="mb-4 font-semibold flex items-center gap-2">
                <span>📍</span> Sales by Zone
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.salesByZone}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <h3 className="mb-4 font-semibold flex items-center gap-2">
                <span>💱</span> Revenue by Currency
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={data.revenueByCurrency} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {data.revenueByCurrency.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <h3 className="mb-4 font-semibold flex items-center gap-2">
                <span>⚡</span> Free vs Paid
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={data.installationDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {data.installationDistribution.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {data.salesByPlan && data.salesByPlan.length > 0 && (
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <h3 className="mb-4 font-semibold flex items-center gap-2">
                <span>📋</span> Sales by Plan
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={data.salesByPlan} layout="vertical" margin={{ left: 120 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={110} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#2563eb" name="Sales" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-left text-muted-foreground">
                      <th className="p-3">📋 Plan</th>
                      <th className="p-3 text-center">🛒 Sales</th>
                      <th className="p-3 text-right">💰 Revenue</th>
                      <th className="p-3 text-right">🏷️ Expected Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.salesByPlan.map((plan) => (
                      <tr key={plan.name} className="border-t hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-medium">{plan.name}</td>
                        <td className="p-3 text-center">{plan.count}</td>
                        <td className="p-3 text-right">${plan.revenue.toFixed(2)}</td>
                        <td className="p-3 text-right">
                          {plan.expectedPrice != null ? `$${plan.expectedPrice}` : <span className="text-muted-foreground">-</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
