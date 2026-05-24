import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSystemInfo } from "@/lib/vsol";
import { Card } from "@/components/ui/card";
import { AlertTriangle, Network, WifiOff, Server, Tag, Cpu, Hash, RefreshCw } from "lucide-react";

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: React.ElementType; color?: string;
}) {
  return (
    <Card className="p-5 flex flex-col gap-3 border-border">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className={`size-3.5 ${color ?? ""}`} />
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className={`font-mono text-2xl font-bold ${color ?? ""}`}>{value}</div>
    </Card>
  );
}

export default async function OltDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const olt = await prisma.olt.findUnique({ where: { id } });
  if (!olt) notFound();

  const [onuStats, refresh, ponRows] = await Promise.all([
    prisma.onu.groupBy({
      by: ["status"],
      where: { oltId: id },
      _count: { status: true },
    }),
    prisma.listRefresh.findUnique({ where: { oltId: id } }),
    prisma.onu.groupBy({
      by: ["ponPort"],
      where: { oltId: id },
      _count: { id: true },
      orderBy: { ponPort: "asc" },
    }),
  ]);

  const total = onuStats.reduce((s, r) => s + r._count.status, 0);
  const online = onuStats.find(r => r.status === "online")?._count.status ?? 0;
  const offline = total - online;

  let sysInfo: Awaited<ReturnType<typeof getSystemInfo>> | null = null;
  let sysError: string | null = null;
  try { sysInfo = await getSystemInfo(id); }
  catch (e) { sysError = (e as Error).message; }

  return (
    <div className="space-y-6">
      {sysError && (
        <Card className="p-4 flex items-start gap-3 border-destructive/40 bg-destructive/5">
          <AlertTriangle className="size-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{sysError}</p>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Total ONUs" value={total} icon={Network} />
        <StatCard label="Online" value={online} icon={Network} color="text-primary" />
        <StatCard label="Offline" value={offline} icon={WifiOff} color={offline > 0 ? "text-destructive" : undefined} />
      </div>

      {sysInfo && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="SW Version" value={sysInfo.swVersion ?? "—"} icon={Tag} />
          <StatCard label="HW Version" value={sysInfo.hwVersion ?? "—"} icon={Cpu} />
          <StatCard label="Model" value={sysInfo.model ?? "—"} icon={Server} />
          <StatCard label="Serial" value={sysInfo.serial ?? "—"} icon={Hash} />
        </div>
      )}

      {ponRows.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">ONUs by PON port</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {ponRows.map(r => (
              <Link key={r.ponPort} href={`/olts/${id}/onus`} className="block">
                <Card className="p-3 flex items-center justify-between border-border hover:bg-muted/30 transition-colors">
                  <span className="font-mono text-sm">{r.ponPort}</span>
                  <span className="text-sm font-semibold text-primary">{r._count.id}</span>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {refresh && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <RefreshCw className="size-3" />
          Last ONU sync: {refresh.refreshedAt.toLocaleString()} · {refresh.onuCount} ONUs
        </p>
      )}

      {total === 0 && (
        <p className="text-sm text-muted-foreground">
          No ONUs in database.{" "}
          <Link href={`/olts/${id}/onus`} className="text-primary underline underline-offset-4">
            Go to ONUs and hit Refresh →
          </Link>
        </p>
      )}
    </div>
  );
}
