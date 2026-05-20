"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { authorizeOnu } from "@/app/actions/onu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AuthorizeRow(props: { oltId: string; ponPort: string; serialNumber: string }) {
  const [idx, setIdx] = useState("1");
  const [profile, setProfile] = useState("default");
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2 items-center">
      <Input className="w-20" value={idx} onChange={(e) => setIdx(e.target.value)} placeholder="idx" />
      <Input className="w-40" value={profile} onChange={(e) => setProfile(e.target.value)} placeholder="profile" />
      <Button
        disabled={pending}
        onClick={() => start(async () => {
          const r = await authorizeOnu({
            oltId: props.oltId,
            ponPort: props.ponPort,
            onuIndex: Number(idx),
            serialNumber: props.serialNumber,
            profile,
          });
          if (r.ok) toast.success("Authorized");
          else toast.error(r.error);
        })}
      >
        {pending ? "..." : "Authorize"}
      </Button>
    </div>
  );
}
