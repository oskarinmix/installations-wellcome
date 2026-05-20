import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RefreshButton } from "./_refresh-button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

function StatusDot({ status }: { status: string }) {
  const online = status === "online";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block size-1.5 rounded-full ${online ? "bg-primary" : "bg-destructive"}`} />
      <span className={`text-xs font-medium ${online ? "text-primary" : "text-destructive"}`}>
        {status}
      </span>
    </span>
  );
}

function Dbm({ val }: { val: number | null }) {
  if (val == null) return <span className="text-muted-foreground">—</span>;
  const color = val < -25 ? "text-destructive" : val < -22 ? "text-yellow-500" : "text-primary";
  return <span className={`font-mono text-xs ${color}`}>{val.toFixed(1)}</span>;
}

function Num({ val, unit }: { val: number | null; unit: string }) {
  if (val == null) return <span className="text-muted-foreground">—</span>;
  return <span className="font-mono text-xs">{val.toFixed(1)} {unit}</span>;
}

export default async function OnusPage({
  searchParams,
}: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const olt = await prisma.olt.findFirst({ orderBy: { createdAt: "asc" } });
  if (!olt) return (
    <p className="text-muted-foreground text-sm">
      No OLTs configured.{" "}
      <Link href="/olt/olts/new" className="text-primary underline underline-offset-4">Add one</Link>.
    </p>
  );

  const [onus, refresh] = await Promise.all([
    prisma.onu.findMany({
      where: {
        oltId: olt.id,
        ...(q ? {
          OR: [
            { serialNumber: { contains: q } },
            { name: { contains: q } },
          ],
        } : {}),
      },
      orderBy: [{ ponPort: "asc" }, { onuIndex: "asc" }],
    }),
    prisma.listRefresh.findUnique({ where: { oltId: olt.id } }),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">ONUs</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{onus.length} devices</p>
        </div>
        <div className="flex items-center gap-3">
          {refresh && (
            <span className="text-xs text-muted-foreground hidden sm:block">
              Updated {refresh.refreshedAt.toLocaleString()}
            </span>
          )}
          <RefreshButton oltId={olt.id} />
        </div>
      </div>

      <form action="/olt/onus" className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
        <Input
          name="q"
          placeholder="Search by MAC or name..."
          defaultValue={q ?? ""}
          className="pl-8 h-8 text-sm"
        />
      </form>

      <div className="rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">PON</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Dist</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">RX (dBm)</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">TX (dBm)</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Bias (mA)</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Temp (°C)</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">V</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {onus.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {q ? `No ONUs matching "${q}"` : "No ONUs found. Hit Refresh."}
                </td>
              </tr>
            )}
            {onus.map((o) => (
              <tr key={o.id} className="hover:bg-muted/30 transition-colors duration-100">
                <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap">{o.ponPort}:{o.onuIndex}</td>
                <td className="px-3 py-2.5 text-xs max-w-[180px] truncate" title={o.name ?? undefined}>
                  {o.name ?? <span className="text-muted-foreground font-mono">{o.serialNumber}</span>}
                </td>
                <td className="px-3 py-2.5"><StatusDot status={o.status} /></td>
                <td className="px-3 py-2.5 font-mono text-xs">{o.distance != null ? `${o.distance}m` : "—"}</td>
                <td className="px-3 py-2.5"><Dbm val={o.rxPowerDbm} /></td>
                <td className="px-3 py-2.5"><Dbm val={o.txPowerDbm} /></td>
                <td className="px-3 py-2.5"><Num val={o.txBiasCurrentMa} unit="mA" /></td>
                <td className="px-3 py-2.5"><Num val={o.temperatureC} unit="°C" /></td>
                <td className="px-3 py-2.5"><Num val={o.voltageV} unit="V" /></td>
                <td className="px-3 py-2.5 text-right">
                  <Link
                    href={`/olt/onus/${o.id}`}
                    className="text-xs text-primary hover:text-primary/80 transition-colors underline underline-offset-4"
                  >
                    Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
