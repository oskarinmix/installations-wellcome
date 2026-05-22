"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getCurrentUserRole } from "@/lib/actions";

export function CashierRouteGuard() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    getCurrentUserRole().then((res) => {
      if (res?.role === "cashier" && !pathname.startsWith("/caja")) {
        router.replace("/caja");
      }
    });
  }, [pathname, router]);

  return null;
}
