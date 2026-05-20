"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateOlt } from "@/app/actions/olt";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Props = {
  id: string;
  initial: { name: string; host: string; port: number; username: string };
};

export function EditOltForm({ id, initial }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    name: initial.name,
    host: initial.host,
    port: String(initial.port),
    username: initial.username,
    password: "",
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <form
      className="space-y-4 max-w-sm"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const patch: Record<string, unknown> = {
            name: form.name,
            host: form.host,
            port: Number(form.port),
            username: form.username,
          };
          if (form.password) patch.password = form.password;
          const r = await updateOlt(id, patch);
          if (!r.ok) { toast.error(r.error); return; }
          toast.success("OLT updated");
          router.push("/olt/olts");
        });
      }}
    >
      {(
        [
          { key: "name" as const, label: "Name", placeholder: "Main OLT" },
          { key: "host" as const, label: "Host / IP", placeholder: "192.168.1.1" },
          { key: "port" as const, label: "SSH Port", placeholder: "22" },
          { key: "username" as const, label: "Username", placeholder: "admin" },
          { key: "password" as const, label: "Password", placeholder: "Leave blank to keep current" },
        ]
      ).map(({ key, label, placeholder }) => (
        <div key={key} className="space-y-1.5">
          <Label className="text-sm font-medium">{label}</Label>
          <Input
            type={key === "password" ? "password" : "text"}
            value={form[key]}
            onChange={set(key)}
            placeholder={placeholder}
            required={key !== "password"}
            className="font-mono text-sm h-9"
          />
        </div>
      ))}
      <Button type="submit" disabled={pending} className="w-full mt-2">
        {pending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
