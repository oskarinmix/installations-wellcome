import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOpticalInfo, getOnuDetail, getOnuSyslog } from "@/lib/vsol";
import { Card } from "@/components/ui/card";
import { RebootButton } from "./_reboot-button";
import { AlertTriangle, ArrowLeft, Radio, Activity } from "lucide-react";

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</span>
      <span className="font-mono text-sm">{value}</span>
    </div>
  );
}

function fmt(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleString("es-CO", { dateStyle: "short", timeStyle: "medium" });
}

const EVENT_STYLES: Record<string, string> = {
  "ONU Register": "text-primary",
  "ONU Finish": "text-primary",
  "ONU AUTH Success": "text-primary",
  "ONU Deregister": "text-destructive",
};

export default async function OnuDetailPage({
  params,
}: { params: Promise<{ id: string; onuid: string }> }) {
  const { id: oltId, onuid } = await params;
  const onu = await prisma.onu.findUnique({ where: { id: onuid } });
  if (!onu || onu.oltId !== oltId) notFound();

  const [opt, det, syslogResult] = await Promise.allSettled([
    getOpticalInfo(onu.oltId, onu.ponPort, onu.onuIndex),
    getOnuDetail(onu.oltId, onu.ponPort, onu.onuIndex),
    getOnuSyslog(onu.oltId, onu.serialNumber),
  ]);

  const online = onu.status === "online";
  const logs = syslogResult.status === "fulfilled" ? syslogResult.value : [];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link
          href={`/olts/${oltId}/onus`}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="size-3" />
          Back to ONUs
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-mono text-xl font-semibold tracking-wide">{onu.serialNumber}</h2>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs text-muted-foreground font-mono">{onu.ponPort}:{onu.onuIndex}</span>
              <span className="text-muted-foreground/40">·</span>
              <span className="inline-flex items-center gap-1.5">
                <span className={`size-1.5 rounded-full ${online ? "bg-primary" : "bg-destructive"}`} />
                <span className={`text-xs font-medium ${online ? "text-primary" : "text-destructive"}`}>
                  {onu.status}
                </span>
              </span>
              {det.status === "fulfilled" && det.value.model && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="text-xs text-muted-foreground font-mono">{det.value.model}</span>
                </>
              )}
            </div>
          </div>
          <RebootButton oltId={onu.oltId} ponPort={onu.ponPort} onuIndex={onu.onuIndex} />
        </div>
      </div>

      <Card className="border-border overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
          <Radio className="size-3.5 text-primary" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Optical (live)</h3>
        </div>
        <div className="px-4">
          {opt.status === "rejected" || opt.value == null ? (
            <div className="flex items-center gap-2 py-4 text-sm text-destructive">
              <AlertTriangle className="size-4 shrink-0" />
              {opt.status === "rejected" && opt.reason instanceof Error
                ? opt.reason.message
                : "Optical data unavailable"}
            </div>
          ) : (
            <>
              <DataRow label="ONU Rx" value={opt.value.rxOnuDbm != null ? `${opt.value.rxOnuDbm} dBm` : "—"} />
              <DataRow label="ONU Tx" value={opt.value.txOnuDbm != null ? `${opt.value.txOnuDbm} dBm` : "—"} />
              <DataRow label="TX Bias" value={opt.value.txBiasCurrentMa != null ? `${opt.value.txBiasCurrentMa} mA` : "—"} />
              <DataRow label="Temperature" value={opt.value.temperatureC != null ? `${opt.value.temperatureC} °C` : "—"} />
              <DataRow label="Voltage" value={opt.value.voltageV != null ? `${opt.value.voltageV} V` : "—"} />
            </>
          )}
        </div>
      </Card>

      <Card className="border-border overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
          <Radio className="size-3.5 text-primary" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Device Info (live)</h3>
        </div>
        <div className="px-4">
          {det.status === "rejected" ? (
            <div className="flex items-center gap-2 py-4 text-sm text-destructive">
              <AlertTriangle className="size-4 shrink-0" />
              {det.reason instanceof Error ? det.reason.message : "Could not read device details"}
            </div>
          ) : (
            <>
              <DataRow label="Model" value={det.value.model ?? "—"} />
              <DataRow label="Firmware" value={det.value.firmware ?? "—"} />
              <DataRow label="Distance" value={det.value.distance != null ? `${det.value.distance} m` : "—"} />
              <DataRow label="Last Online" value={fmt(det.value.lastRegAt)} />
              <DataRow label="Last Offline" value={fmt(det.value.lastDeregAt)} />
              <DataRow label="Offline Reason" value={det.value.deregReason ?? "—"} />
            </>
          )}
        </div>
      </Card>

      <Card className="border-border overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
          <Activity className="size-3.5 text-primary" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Events</h3>
        </div>
        {logs.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">No recent events for this ONU.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Time</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Event</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((e, i) => (
                  <tr key={i} className="hover:bg-muted/20">
                    <td className="px-4 py-2 font-mono whitespace-nowrap text-muted-foreground">
                      {e.timestamp.toLocaleString("es-CO", { dateStyle: "short", timeStyle: "medium" })}
                    </td>
                    <td className={`px-4 py-2 font-medium ${EVENT_STYLES[e.event] ?? ""}`}>{e.event}</td>
                    <td className="px-4 py-2 text-muted-foreground">{e.deregReason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
