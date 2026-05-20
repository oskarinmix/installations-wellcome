import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSystemInfo } from "@/lib/vsol";
import { Card } from "@/components/ui/card";
import { AlertTriangle, Cpu, Tag, Server, Hash } from "lucide-react";

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <Card className="p-5 flex flex-col gap-3 border-border">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-3.5" />
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className="font-mono text-xl font-semibold">{value}</div>
    </Card>
  );
}

export default async function OltOverviewPage() {
  const olt = await prisma.olt.findFirst({ orderBy: { createdAt: "asc" } });
  if (!olt) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-muted-foreground text-sm">No OLTs configured.</p>
        <Link
          href="/olt/olts/new"
          className="text-sm text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
        >
          Add your first OLT →
        </Link>
      </div>
    );
  }

  let info: Awaited<ReturnType<typeof getSystemInfo>> | null = null;
  let error: string | null = null;
  try { info = await getSystemInfo(olt.id); }
  catch (e) { error = (e as Error).message; }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{olt.name}</h2>
        <p className="text-sm text-muted-foreground mt-0.5 font-mono">
          {olt.username}@{olt.host}:{olt.port}
        </p>
      </div>

      {error && (
        <Card className="p-4 flex items-start gap-3 border-destructive/40 bg-destructive/5">
          <AlertTriangle className="size-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </Card>
      )}

      {info && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MetricCard label="SW Version" value={info.swVersion ?? "—"} icon={Tag} />
          <MetricCard label="HW Version" value={info.hwVersion ?? "—"} icon={Cpu} />
          <MetricCard label="Model" value={info.model ?? "—"} icon={Server} />
          <MetricCard label="Serial" value={info.serial ?? "—"} icon={Hash} />
        </div>
      )}
    </div>
  );
}
