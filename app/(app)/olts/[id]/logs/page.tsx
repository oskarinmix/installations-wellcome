import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAllSyslog } from "@/lib/vsol";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { SyslogEntry } from "@/lib/vsol/types";

const EVENT_COLOR: Record<string, string> = {
  "ONU Register": "text-primary",
  "ONU Finish": "text-primary",
  "ONU AUTH Success": "text-primary",
  "ONU Deregister": "text-destructive",
  "User Login": "text-yellow-500",
  "User Logout": "text-yellow-500",
};

function OnuLink({ entry, onuMap, oltId }: { entry: SyslogEntry; onuMap: Map<string, string>; oltId: string }) {
  if (!entry.mac) return <span className="text-muted-foreground">—</span>;
  const onuId = onuMap.get(entry.mac);
  if (!onuId) return <span className="font-mono text-xs text-muted-foreground">{entry.mac}</span>;
  return (
    <Link
      href={`/olts/${oltId}/onus/${onuId}`}
      className="font-mono text-xs text-primary hover:underline underline-offset-2"
    >
      {entry.mac}
    </Link>
  );
}

export default async function LogsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const olt = await prisma.olt.findUnique({ where: { id } });
  if (!olt) notFound();

  let entries: SyslogEntry[] = [];
  let error: string | null = null;
  try { entries = await getAllSyslog(id); }
  catch (e) { error = (e as Error).message; }

  const onus = await prisma.onu.findMany({
    where: { oltId: id },
    select: { id: true, serialNumber: true },
  });
  const onuMap = new Map(onus.map(o => [o.serialNumber, o.id]));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">System Logs</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {error ? "Error loading logs" : `${entries.length} entries`}
        </p>
      </div>

      {error ? (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="size-4 shrink-0" />
          {error}
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground uppercase tracking-wider">Time</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground uppercase tracking-wider">Level</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground uppercase tracking-wider">Event</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground uppercase tracking-wider">ONU</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground uppercase tracking-wider">PON</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground uppercase tracking-wider">Reason / Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No log entries.</td>
                </tr>
              )}
              {entries.map((e, i) => (
                <tr key={i} className="hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2 font-mono whitespace-nowrap text-muted-foreground">
                    {e.timestamp.toLocaleString("es-CO", { dateStyle: "short", timeStyle: "medium" })}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{e.level}</td>
                  <td className={`px-3 py-2 font-medium ${EVENT_COLOR[e.event] ?? "text-foreground"}`}>{e.event}</td>
                  <td className="px-3 py-2"><OnuLink entry={e} onuMap={onuMap} oltId={id} /></td>
                  <td className="px-3 py-2 font-mono text-muted-foreground">
                    {e.ponPort ? `${e.ponPort}:${e.onuIndex}` : "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground max-w-xs truncate" title={e.deregReason ?? e.message}>
                    {e.deregReason ?? (e.mac ? "—" : e.message)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
