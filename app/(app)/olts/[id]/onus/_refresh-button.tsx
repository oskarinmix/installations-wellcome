"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { refreshOnuList } from "@/app/actions/onu";

export function RefreshButton({ oltId }: { oltId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await refreshOnuList(oltId);
          if (r.ok) toast.success(`Refreshed ${r.data.count} ONUs`);
          else toast.error(r.error);
        })
      }
    >
      {pending ? "Refreshing..." : "Refresh"}
    </Button>
  );
}
