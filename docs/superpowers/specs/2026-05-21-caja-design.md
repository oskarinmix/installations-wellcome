# Caja — Design Spec

**Date:** 2026-05-21  
**Status:** Approved

---

## Overview

Caja is a dual-currency cash ledger (USD and BCV) for tracking internal expenses, payments, and general cash movements. It is completely independent from the sales/installations system. Any user can register a deposit; only admins can register withdrawals, validate operations, or cancel them.

---

## Data Model

### New Enums

```prisma
enum CajaOperationType {
  DEPOSITO
  RETIRO
}

enum CajaOperationStatus {
  CARGADO
  REGISTRADO
  CANCELADO
}
```

### New Model: `CajaOperacion`

```prisma
model CajaOperacion {
  id          Int                  @id @default(autoincrement())
  type        CajaOperationType
  status      CajaOperationStatus  @default(CARGADO)
  currency    Currency             // USD | BCV (existing enum)
  amount      Float                // always positive
  description String
  createdAt   DateTime             @default(now())
  updatedAt   DateTime             @updatedAt
  createdById String
  createdBy   User                 @relation("CajaCreatedBy", fields: [createdById], references: [id])
  updatedById String?
  updatedBy   User?                @relation("CajaUpdatedBy", fields: [updatedById], references: [id])

  @@index([currency])
  @@index([status])
  @@index([createdAt])
  @@index([type])
}
```

### Rules

- Operations are **never deleted** from DB.
- `amount` is always stored as a positive number. Sign is derived from `type`.
- `updatedById` is set when status changes.

---

## Balance Calculation

```
balance(currency) =
  SUM(amount WHERE type=DEPOSITO AND status != CANCELADO AND currency=X)
  - SUM(amount WHERE type=RETIRO AND status != CANCELADO AND currency=X)
```

Both `CARGADO` and `REGISTRADO` operations count toward the balance. Only `CANCELADO` is excluded.

---

## Permissions

| Action | Admin | Agent |
|--------|-------|-------|
| View Caja page | ✓ | ✓ |
| Create DEPOSITO | ✓ | ✓ |
| Create RETIRO | ✓ | ✗ |
| Change CARGADO → REGISTRADO | ✓ | ✗ |
| Cancel operation | ✓ | ✗ |

---

## Status Transitions

```
CARGADO → REGISTRADO  (admin only)
CARGADO → CANCELADO   (admin only)
REGISTRADO → CANCELADO (admin only)
```

No other transitions allowed.

---

## Server Actions (`lib/actions/caja.ts`)

| Action | Auth | Description |
|--------|------|-------------|
| `getCajaBalance()` | any | Returns `{ usd: number, bcv: number }` |
| `getCajaOperaciones(filters)` | any | Paginated list with filters + search |
| `createCajaOperacion(data)` | any (RETIRO = admin only) | Creates with status `CARGADO` |
| `updateCajaStatus(id, status)` | admin only | Changes status, sets `updatedById` |

All actions verify session. Unauthorized actions return an error object (never throw to client).

---

## Page: `/caja`

### Layout

```
┌─────────────────────────────────────────┐
│  💵 Saldo USD          💰 Saldo BCV     │
│  $1,250.00             Bs. 45,000.00    │
│  [click to filter]     [click to filter]│
└─────────────────────────────────────────┘

[+ Nueva Operación]

┌── Filtros ──────────────────────────────┐
│ [Buscar descripción] [Moneda] [Tipo]    │
│ [Estado] [Fecha inicio] [Fecha fin]     │
└─────────────────────────────────────────┘

┌── Tabla ────────────────────────────────┐
│ Fecha | Tipo | Descripción | Monto      │
│       | Estado | Creado por | Acciones  │
└─────────────────────────────────────────┘
```

### Balance Cards

- Two cards: USD and BCV
- Each shows current balance
- Clicking a card sets the currency filter on the table
- Active card highlighted

### Operations Table

Columns:
- Fecha (createdAt)
- Tipo (DEPOSITO / RETIRO badge)
- Descripción
- Monto (green for DEPOSITO, red for RETIRO)
- Moneda
- Estado (badge: CARGADO=yellow, REGISTRADO=green, CANCELADO=red/muted)
- Creado por (user name)
- Acciones (admin only: Registrar button if CARGADO, Cancelar button if not CANCELADO)

### Filters

- Text search: matches `description` (case-insensitive)
- Moneda: USD | BCV | Todas
- Tipo: DEPOSITO | RETIRO | Todos
- Estado: CARGADO | REGISTRADO | CANCELADO | Todos
- Fecha inicio / Fecha fin

Clicking a balance card sets Moneda filter to that currency.

### "Nueva Operación" Modal/Dialog

Fields:
- Tipo: DEPOSITO | RETIRO (RETIRO disabled for non-admin)
- Moneda: USD | BCV
- Monto: number input (positive only)
- Descripción: text input (required)

On submit: calls `createCajaOperacion`, refreshes balance and table.

---

## Navigation

Add **Caja** entry to `SidebarNav`, visible to all roles. Route: `/caja`.

---

## Files to Create / Modify

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Add enums + model |
| `lib/actions/caja.ts` | New server actions |
| `app/(app)/caja/page.tsx` | New page |
| `components/caja/balance-cards.tsx` | Balance display |
| `components/caja/operaciones-table.tsx` | Table + filters |
| `components/caja/nueva-operacion-dialog.tsx` | Create form dialog |
| `components/sidebar-nav.tsx` | Add Caja nav entry |

---

## Out of Scope

- Multi-caja (one global caja only)
- Export to Excel/PDF
- Audit log beyond `createdBy` / `updatedBy`
- Cross-currency conversion
