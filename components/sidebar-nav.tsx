"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Upload,
  Wrench,
  Users,
  HardHat,
  Receipt,
  Sun,
  Moon,
  Settings,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/installations", label: "Installations", icon: Wrench },
  { href: "/sellers", label: "Sellers", icon: Users },
  { href: "/installers", label: "Installer Report", icon: HardHat },
  { href: "/sales", label: "Sales Detail", icon: Receipt },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  return (
    <aside className="fixed inset-y-0 left-0 z-10 w-56 border-r bg-card flex flex-col">
      <div className="flex h-14 items-center border-b px-4 gap-2">
        <span className="text-xl">📡</span>
        <Link href="/dashboard" className="font-bold text-lg bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
          Wellcomm
        </Link>
      </div>
      <nav className="flex flex-col gap-1 p-3 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-accent",
                isActive
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-accent text-muted-foreground hover:text-foreground w-full"
        >
          <Sun className="h-4 w-4 hidden dark:block" />
          <Moon className="h-4 w-4 block dark:hidden" />
          <span className="dark:hidden">Dark Mode</span>
          <span className="hidden dark:inline">Light Mode</span>
        </button>
      </div>
    </aside>
  );
}
