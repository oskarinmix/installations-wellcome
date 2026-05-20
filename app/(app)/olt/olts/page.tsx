import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Server, Pencil } from "lucide-react";
import { DeleteOltButton } from "./_delete-button";

export default async function OltsPage() {
  const olts = await prisma.olt.findMany({ orderBy: { createdAt: "asc" } });
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">OLTs</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{olts.length} device{olts.length !== 1 ? "s" : ""} configured</p>
        </div>
        <Link href="/olt/olts/new">
          <Button size="sm" className="gap-1.5">
            <Plus className="size-3.5" />
            Add OLT
          </Button>
        </Link>
      </div>

      {olts.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <Server className="size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No OLTs configured yet.</p>
          <Link href="/olt/olts/new" className="text-sm text-primary underline underline-offset-4 hover:text-primary/80 transition-colors">
            Add your first OLT →
          </Link>
        </div>
      )}

      <div className="grid gap-3">
        {olts.map((o) => (
          <Card key={o.id} className="p-4 flex items-center gap-4 border-border hover:bg-muted/20 transition-colors">
            <div className="size-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <Server className="size-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm">{o.name}</div>
              <div className="font-mono text-xs text-muted-foreground mt-0.5 truncate">
                {o.username}@{o.host}:{o.port}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Link href={`/olt/olts/${o.id}/edit`}>
                <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-foreground">
                  <Pencil className="size-3.5" />
                </Button>
              </Link>
              <DeleteOltButton id={o.id} name={o.name} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
