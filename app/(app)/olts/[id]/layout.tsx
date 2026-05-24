import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { OltSubNav } from "./_sub-nav";

export default async function OltLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const olt = await prisma.olt.findUnique({ where: { id } });
  if (!olt) notFound();

  return (
    <div className="flex flex-col min-h-0">
      <div className="px-8 pt-6 pb-0">
        <p className="text-xs text-muted-foreground font-mono mb-0.5">{olt.username}@{olt.host}:{olt.port}</p>
        <h1 className="text-2xl font-bold tracking-tight">{olt.name}</h1>
      </div>
      <OltSubNav id={id} />
      <div className="p-8">{children}</div>
    </div>
  );
}
