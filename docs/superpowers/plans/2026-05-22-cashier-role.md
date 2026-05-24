# Cashier Role Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `cashier` role that can access Caja (view + create DEPOSITOs only), while blocking `agent` role from Caja entirely.

**Architecture:** Add `cashier` to the Prisma `Role` enum via migration, propagate the type through auth helpers and server actions, update sidebar navigation visibility logic, add a redirect guard on the Caja page, and expose the new role in the Settings user management UI.

**Tech Stack:** Next.js 15 App Router, Prisma ORM, PostgreSQL, TypeScript, better-auth, Tailwind CSS

---

## File Map

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `cashier` to `Role` enum |
| `lib/get-user-role.ts` | Return type `"admin" \| "agent" \| "cashier" \| null` |
| `lib/actions.ts` | Update role types in `getCurrentUserRole`, `getAuthUser`, `getAllUsers`, `updateUserRole` |
| `lib/actions/caja.ts` | Update `getAuthUser` return type usage; cashier allowed to create DEPOSITO |
| `components/sidebar-nav.tsx` | `cajaOnly` nav flag, cashier badge, cashier home redirect |
| `app/(app)/caja/page.tsx` | Redirect `agent` to `/installations`; detect `cashier` vs `admin` |
| `app/(app)/settings/page.tsx` | Add `cashier` option to role selector; update `UserRow` type |

---

### Task 1: Add `cashier` to Prisma schema and migrate

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Edit the Role enum**

In `prisma/schema.prisma`, change:
```prisma
enum Role {
  admin
  agent
}
```
to:
```prisma
enum Role {
  admin
  agent
  cashier
}
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add-cashier-role
```

Expected: Migration created and applied. Output ends with `Your database is now in sync with your schema.`

- [ ] **Step 3: Regenerate Prisma client**

```bash
npx prisma generate
```

Expected: `Generated Prisma Client` message, no errors.

- [ ] **Step 4: Verify TypeScript picks up new enum value**

```bash
npx tsc --noEmit
```

Expected: No errors (the new `cashier` value is now valid in the generated client).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add cashier to Role enum"
```

---

### Task 2: Propagate `cashier` through auth helpers

**Files:**
- Modify: `lib/get-user-role.ts`

- [ ] **Step 1: Update return types in `getUserRole` and `getAuthUser`**

Replace the entire file `lib/get-user-role.ts` with:

```typescript
import { cookies } from "next/headers";
import { prisma } from "./prisma";

export async function getUserRole(): Promise<"admin" | "agent" | "cashier" | null> {
  try {
    const cookieStore = await cookies();

    const rawToken =
      cookieStore.get("better-auth.session_token")?.value ??
      cookieStore.get("__Secure-better-auth.session_token")?.value;

    if (!rawToken) return null;

    const token = rawToken.split(".")[0];

    const session = await prisma.session.findUnique({
      where: { token },
      select: {
        expiresAt: true,
        user: { select: { role: true } },
      },
    });

    if (!session || session.expiresAt < new Date()) return null;

    return session.user.role as "admin" | "agent" | "cashier";
  } catch {
    return null;
  }
}

export async function getAuthUser(): Promise<{ id: string; role: "admin" | "agent" | "cashier" } | null> {
  try {
    const cookieStore = await cookies();

    const rawToken =
      cookieStore.get("better-auth.session_token")?.value ??
      cookieStore.get("__Secure-better-auth.session_token")?.value;

    if (!rawToken) return null;

    const token = rawToken.split(".")[0];

    const session = await prisma.session.findUnique({
      where: { token },
      select: {
        expiresAt: true,
        user: { select: { id: true, role: true } },
      },
    });

    if (!session || session.expiresAt < new Date()) return null;

    return {
      id: session.user.id,
      role: session.user.role as "admin" | "agent" | "cashier",
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/get-user-role.ts
git commit -m "feat: include cashier in auth role return types"
```

---

### Task 3: Update `lib/actions.ts` role-related functions

**Files:**
- Modify: `lib/actions.ts`

- [ ] **Step 1: Update `requireAdmin` — no change needed** (already checks `role !== "admin"`, cashier will be blocked correctly)

- [ ] **Step 2: Update `getCurrentUserRole` return type**

Find this in `lib/actions.ts`:
```typescript
export async function getCurrentUserRole() {
  const role = await getUserRole();
  if (!role) return null;
  return { role };
}
```

The return is already inferred from `getUserRole()` — after Task 2, it will automatically return `"cashier"` when applicable. No change needed here.

- [ ] **Step 3: Update `getAllUsers` type**

Find in `lib/actions.ts`:
```typescript
  return users.map((u) => ({
    ...u,
    role: u.role as "admin" | "agent",
  }));
```

Replace with:
```typescript
  return users.map((u) => ({
    ...u,
    role: u.role as "admin" | "agent" | "cashier",
  }));
```

- [ ] **Step 4: Update `updateUserRole` signature**

Find in `lib/actions.ts`:
```typescript
export async function updateUserRole(userId: string, role: "admin" | "agent") {
```

Replace with:
```typescript
export async function updateUserRole(userId: string, role: "admin" | "agent" | "cashier") {
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add lib/actions.ts
git commit -m "feat: update role types in actions to include cashier"
```

---

### Task 4: Update `lib/actions/caja.ts` for cashier awareness

**Files:**
- Modify: `lib/actions/caja.ts`

The existing logic already handles cashier correctly:
- `createCajaOperacion`: blocks RETIRO for non-admin → cashier can only create DEPOSITO ✓
- `updateCajaStatus`: blocks all non-admin → cashier cannot change status ✓

Only the type cast needs updating.

- [ ] **Step 1: Update type cast in `createCajaOperacion`**

Find in `lib/actions/caja.ts`:
```typescript
  if (data.type === "RETIRO" && user.role !== "admin") {
    return { success: false, error: "Solo el admin puede registrar retiros" };
  }
```

No logic change needed — `cashier` role will correctly be blocked here.

- [ ] **Step 2: Verify TypeScript (types now flow correctly from `getAuthUser`)**

```bash
npx tsc --noEmit
```

Expected: No errors.

---

### Task 5: Update sidebar navigation for cashier

**Files:**
- Modify: `components/sidebar-nav.tsx`

- [ ] **Step 1: Add `cajaOnly` flag to nav items and update role state type**

In `components/sidebar-nav.tsx`, replace the top of the file through the `navItems` definition:

```typescript
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
  Menu,
  X,
  UserSearch,
  Vault,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Panel", icon: LayoutDashboard, adminOnly: true },
  { href: "/installations", label: "Instalaciones", icon: Wrench },
  { href: "/caja", label: "Caja", icon: Vault, cajaOnly: true },
  { href: "/sellers", label: "Vendedores", icon: Users, adminOnly: true },
  { href: "/reports", label: "Reportes", icon: FileText, adminOnly: true },
  { href: "/check-user", label: "Consultar Cliente", icon: UserSearch, adminOnly: true },
  { href: "/settings", label: "Configuración", icon: Settings, adminOnly: true },
];
```

- [ ] **Step 2: Update role state type and home redirect**

Find:
```typescript
  const [role, setRole] = useState<"admin" | "agent" | null>(null);
```
Replace with:
```typescript
  const [role, setRole] = useState<"admin" | "agent" | "cashier" | null>(null);
```

Find:
```typescript
        <Link href={role === "agent" ? "/installations" : "/dashboard"} className="font-bold text-lg bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
```
Replace with:
```typescript
        <Link href={role === "cashier" ? "/caja" : role === "agent" ? "/installations" : "/dashboard"} className="font-bold text-lg bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
```

Do the same for the mobile top bar link (same pattern, second occurrence).

- [ ] **Step 3: Update nav filter logic**

Find:
```typescript
        {navItems
          .filter((item) => !item.adminOnly || role === "admin")
          .map((item) => {
```
Replace with:
```typescript
        {navItems
          .filter((item) => {
            if (item.adminOnly) return role === "admin";
            if (item.cajaOnly) return role === "admin" || role === "cashier";
            return true;
          })
          .map((item) => {
```

- [ ] **Step 4: Update role badge color for cashier**

Find:
```typescript
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
```
Replace with:
```typescript
            {role && (
              <span className={cn(
                "shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                role === "admin"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                  : role === "cashier"
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
              )}>
                {role}
              </span>
            )}
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add components/sidebar-nav.tsx
git commit -m "feat: add cajaOnly nav visibility and cashier role badge"
```

---

### Task 6: Add role guard to Caja page

**Files:**
- Modify: `app/(app)/caja/page.tsx`

Cashier sees Caja, can create DEPOSITO. Agent must be redirected. The existing `isAdmin` prop already gates RETIRO and status changes in child components.

- [ ] **Step 1: Update Caja page with role guard and cashier-aware state**

Replace `app/(app)/caja/page.tsx` with:

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BalanceCards } from "@/components/caja/balance-cards";
import { OperacionesTable } from "@/components/caja/operaciones-table";
import { NuevaOperacionDialog } from "@/components/caja/nueva-operacion-dialog";
import { getCajaBalance, getCajaOperaciones } from "@/lib/actions/caja";
import type { CajaOperacionRow, CajaFilters } from "@/lib/actions/caja";
import { getCurrentUserRole } from "@/lib/actions";

export default function CajaPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [balance, setBalance] = useState({ usd: 0, bcv: 0 });
  const [rows, setRows] = useState<CajaOperacionRow[]>([]);
  const [filters, setFilters] = useState<CajaFilters>({});

  useEffect(() => {
    getCurrentUserRole().then((res) => {
      const role = res?.role;
      if (!role || role === "agent") {
        router.replace("/installations");
        return;
      }
      if (role === "admin") setIsAdmin(true);
    });
  }, [router]);

  const loadBalance = useCallback(async () => {
    const b = await getCajaBalance();
    setBalance(b);
  }, []);

  const loadRows = useCallback(async () => {
    const data = await getCajaOperaciones(filters);
    setRows(data);
  }, [filters]);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  function handleCardSelect(currency: "USD" | "BCV" | null) {
    setFilters((f) => ({ ...f, currency: currency ?? undefined }));
  }

  function handleRefresh() {
    loadBalance();
    loadRows();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <span>🏦</span> Caja
        </h1>
        <NuevaOperacionDialog isAdmin={isAdmin} onSuccess={handleRefresh} />
      </div>

      <BalanceCards
        usd={balance.usd}
        bcv={balance.bcv}
        activeCurrency={filters.currency ?? null}
        onSelect={handleCardSelect}
      />

      <OperacionesTable
        rows={rows}
        filters={filters}
        isAdmin={isAdmin}
        onFiltersChange={setFilters}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/(app)/caja/page.tsx
git commit -m "feat: redirect agent from caja page, guard by role"
```

---

### Task 7: Add `cashier` to Settings user role selector

**Files:**
- Modify: `app/(app)/settings/page.tsx`

- [ ] **Step 1: Update `UserRow` type**

Find in `app/(app)/settings/page.tsx`:
```typescript
  type UserRow = { id: string; name: string; email: string; role: "admin" | "agent"; createdAt: Date };
```
Replace with:
```typescript
  type UserRow = { id: string; name: string; email: string; role: "admin" | "agent" | "cashier"; createdAt: Date };
```

- [ ] **Step 2: Update `handleRoleChange` signature**

Find:
```typescript
  const handleRoleChange = async (userId: string, newRole: "admin" | "agent") => {
```
Replace with:
```typescript
  const handleRoleChange = async (userId: string, newRole: "admin" | "agent" | "cashier") => {
```

- [ ] **Step 3: Update `onValueChange` cast**

Find:
```typescript
                        onValueChange={(v) => handleRoleChange(user.id, v as "admin" | "agent")}
```
Replace with:
```typescript
                        onValueChange={(v) => handleRoleChange(user.id, v as "admin" | "agent" | "cashier")}
```

- [ ] **Step 4: Add `cashier` option to SelectContent**

Find:
```typescript
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="agent">Agent</SelectItem>
                        </SelectContent>
```
Replace with:
```typescript
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="agent">Agent</SelectItem>
                          <SelectItem value="cashier">Cajero</SelectItem>
                        </SelectContent>
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add app/(app)/settings/page.tsx
git commit -m "feat: add cashier option to user role selector in settings"
```

---

### Task 8: Runtime verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify as admin**
  - Log in as admin
  - Sidebar shows all items including Caja
  - Badge shows "admin" (blue)
  - Settings → Users → role dropdown shows Admin / Agent / Cajero

- [ ] **Step 3: Assign cashier role**
  - In Settings → Users, change a test user to "Cajero"
  - Log in as that user
  - Sidebar shows only Instalaciones + Caja
  - Badge shows "cashier" (amber)
  - Home logo click goes to `/caja`
  - Caja page loads, balance visible, table visible
  - "Nueva Operación" dialog: RETIRO button disabled, shows "Solo admin puede registrar retiros"
  - Cannot change status of operations (no buttons shown)

- [ ] **Step 4: Verify agent cannot access Caja**
  - Log in as agent
  - Sidebar does NOT show Caja
  - Navigating to `/caja` directly redirects to `/installations`
