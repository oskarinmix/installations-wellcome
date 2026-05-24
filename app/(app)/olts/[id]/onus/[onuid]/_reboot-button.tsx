"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { rebootOnu } from "@/app/actions/onu";

export function RebootButton(props: { oltId: string; ponPort: string; onuIndex: number }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="destructive"
      disabled={pending}
      onClick={() => {
        if (!confirm("Reboot this ONU?")) return;
        start(async () => {
          const r = await rebootOnu(props);
          if (r.ok) toast.success("Reboot command sent");
          else toast.error(r.error);
        });
      }}
    >
      {pending ? "Sending..." : "Reboot ONU"}
    </Button>
  );
}
