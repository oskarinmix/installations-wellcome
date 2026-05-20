import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { EditOltForm } from "../../_edit-form";

export default async function EditOltPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const olt = await prisma.olt.findUnique({ where: { id } });
  if (!olt) notFound();

  return (
    <div className="space-y-6 max-w-sm">
      <div>
        <Link
          href="/olt/olts"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="size-3" />
          Back to OLTs
        </Link>
        <h2 className="text-xl font-semibold">Edit OLT</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Update connection settings for {olt.name}</p>
      </div>
      <EditOltForm
        id={olt.id}
        initial={{ name: olt.name, host: olt.host, port: olt.port, username: olt.username }}
      />
    </div>
  );
}
