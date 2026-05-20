import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOpticalInfo, getOnuDetail } from "@/lib/vsol";
import { Card } from "@/components/ui/card";
import { RebootButton } from "./_reboot-button";
import { AlertTriangle, ArrowLeft, Radio } from "lucide-react";

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</span>
      <span className="font-mono text-sm">{value}</span>
    </div>
  );
}

export default async function OnuDetailPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const onu = await prisma.onu.findUnique({ where: { id } });
  if (!onu) notFound();

  const [opt, det] = await Promise.allSettled([
    getOpticalInfo(onu.oltId, onu.ponPort, onu.onuIndex),
    getOnuDetail(onu.oltId, onu.ponPort, onu.onuIndex),
  ]);

  const online = onu.status === "online";

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link
          href="/olt/onus"
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
                : "Optical data unavailable (ONU offline?)"}
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
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Device Details (live)</h3>
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
              <DataRow label="Uptime" value={det.value.uptimeSec != null ? `${det.value.uptimeSec} s` : "—"} />
              <DataRow label="Distance" value={det.value.distance != null ? `${det.value.distance} m` : "—"} />
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
