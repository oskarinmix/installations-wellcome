"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createOlt, testConnection } from "@/app/actions/olt";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function OltForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({ name: "", host: "", port: "22", username: "", password: "" });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const fields: { key: keyof typeof form; label: string; placeholder: string }[] = [
    { key: "name", label: "Name", placeholder: "Main OLT" },
    { key: "host", label: "Host / IP", placeholder: "192.168.1.1" },
    { key: "port", label: "SSH Port", placeholder: "22" },
    { key: "username", label: "Username", placeholder: "admin" },
    { key: "password", label: "Password", placeholder: "••••••••" },
  ];

  return (
    <form
      className="space-y-4 max-w-sm"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await createOlt({ ...form, port: Number(form.port) });
          if (!r.ok) { toast.error(r.error); return; }
          toast.success("OLT created");
          const t = await testConnection(r.data.id);
          if (t.ok) toast.success(`Connected — version: ${t.data.version ?? "unknown"}`);
          else toast.error(`Connection test failed: ${t.error}`);
          router.push("/olt/olts");
        });
      }}
    >
      {fields.map(({ key, label, placeholder }) => (
        <div key={key} className="space-y-1.5">
          <Label className="text-sm font-medium">{label}</Label>
          <Input
            type={key === "password" ? "password" : "text"}
            value={form[key]}
            onChange={set(key)}
            placeholder={placeholder}
            required
            className="font-mono text-sm h-9"
          />
        </div>
      ))}
      <Button type="submit" disabled={pending} className="w-full mt-2">
        {pending ? "Connecting..." : "Save & Test Connection"}
      </Button>
    </form>
  );
}
