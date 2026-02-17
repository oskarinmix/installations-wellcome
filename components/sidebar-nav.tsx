"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { getCurrentUserRole } from "@/lib/actions";
import {
  LayoutDashboard,
  Wrench,
  Users,
  FileText,
  Sun,
  Moon,
  Settings,
  LogOut,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Panel", icon: LayoutDashboard, adminOnly: true },
  { href: "/installations", label: "Instalaciones", icon: Wrench },
  { href: "/sellers", label: "Vendedores", icon: Users, adminOnly: true },
  { href: "/reports", label: "Reportes", icon: FileText, adminOnly: true },
  { href: "/settings", label: "Configuración", icon: Settings, adminOnly: true },
];

export function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { data: session } = authClient.useSession();
  const [role, setRole] = useState<"admin" | "agent" | null>(null);

  useEffect(() => {
    getCurrentUserRole().then((res) => setRole(res?.role ?? null));
  }, []);

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-10 w-56 border-r bg-card flex flex-col">
      <div className="flex h-14 items-center border-b px-4 gap-2">
        <span className="text-xl">📡</span>
        <Link href={role === "agent" ? "/installations" : "/dashboard"} className="font-bold text-lg bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
          Wellcomm
        </Link>
      </div>
      <nav className="flex flex-col gap-1 p-3 flex-1">
        {navItems
          .filter((item) => !item.adminOnly || role === "admin")
          .map((item) => {
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
      <div className="p-3 border-t flex flex-col gap-1">
        {session?.user && (
          <div className="px-3 py-2 text-xs text-muted-foreground truncate flex items-center gap-1.5">
            <span className="truncate">{session.user.email}</span>
            {role && (
              <span className={cn(
                "shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                role === "admin"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
              )}>
                {role}
              </span>
            )}
          </div>
        )}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-accent text-muted-foreground hover:text-foreground w-full"
        >
          <Sun className="h-4 w-4 hidden dark:block" />
          <Moon className="h-4 w-4 block dark:hidden" />
          <span className="dark:hidden">Modo Oscuro</span>
          <span className="hidden dark:inline">Modo Claro</span>
        </button>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-accent text-muted-foreground hover:text-foreground w-full"
        >
          <LogOut className="h-4 w-4" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
