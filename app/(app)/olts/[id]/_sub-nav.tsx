"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Network, ShieldAlert, ScrollText } from "lucide-react";

export function OltSubNav({ id }: { id: string }) {
  const path = usePathname();
  const base = `/olts/${id}`;
  const links = [
    { href: base, label: "Overview", icon: LayoutDashboard, exact: true },
    { href: `${base}/onus`, label: "ONUs", icon: Network },
    { href: `${base}/onus/unauth`, label: "Unauthorized", icon: ShieldAlert },
    { href: `${base}/logs`, label: "Logs", icon: ScrollText },
  ];
  return (
    <nav className="flex gap-0.5 border-b border-border px-8 bg-background">
      {links.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? path === href : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
