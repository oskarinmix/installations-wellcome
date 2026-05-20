import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { listUnauthOnus } from "@/lib/vsol";
import { AuthorizeRow } from "./_authorize-row";
import { Card } from "@/components/ui/card";
import { AlertTriangle, ShieldAlert } from "lucide-react";

export default async function UnauthPage() {
  const olt = await prisma.olt.findFirst({ orderBy: { createdAt: "asc" } });
  if (!olt) return (
    <p className="text-muted-foreground text-sm">
      No OLTs configured.{" "}
      <Link href="/olt/olts/new" className="text-primary underline underline-offset-4">Add one</Link>.
    </p>
  );

  let rows: Awaited<ReturnType<typeof listUnauthOnus>> = [];
  let error: string | null = null;
  try { rows = await listUnauthOnus(olt.id); }
  catch (e) { error = (e as Error).message; }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Unauthorized ONUs</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Devices awaiting authorization on the network</p>
      </div>

      {error && (
        <Card className="p-4 flex items-start gap-3 border-destructive/40 bg-destructive/5">
          <AlertTriangle className="size-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </Card>
      )}

      {rows.length === 0 && !error && (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <ShieldAlert className="size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No unauthorized ONUs discovered.</p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">PON</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Serial Number</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Model</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={`${r.ponPort}-${r.serialNumber}`} className="hover:bg-muted/30 transition-colors duration-100">
                  <td className="px-4 py-3 font-mono text-xs">{r.ponPort}</td>
                  <td className="px-4 py-3 font-mono text-xs tracking-wide">{r.serialNumber}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.model ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <AuthorizeRow oltId={olt.id} ponPort={r.ponPort} serialNumber={r.serialNumber} />
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
