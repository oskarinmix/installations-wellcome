"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { deleteOlt } from "@/app/actions/olt";
import { Button } from "@/components/ui/button";

export function DeleteOltButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7 text-muted-foreground hover:text-destructive"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Delete "${name}"? This will remove all associated ONUs.`)) return;
        start(async () => {
          const r = await deleteOlt(id);
          if (!r.ok) { toast.error(r.error); return; }
          toast.success("OLT deleted");
          router.refresh();
        });
      }}
    >
      <Trash2 className="size-3.5" />
    </Button>
  );
}
