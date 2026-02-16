# Sales & Commission Reporting System Specification  
### Stack: Next.js + PostgreSQL + Prisma

---

# 1. Project Overview

This application is a Sales & Commission Reporting System.

The system processes a monthly Excel file and generates:

- Seller commission reports
- Installer commission reports
- Revenue summaries
- Dashboard analytics

Reports are calculated per upload only.  
There is no accumulation across different months or uploads.

---

# 2. Technology Stack

Frontend:
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Recharts (for charts)

Backend:
- Next.js API routes or Server Actions

Database:
- PostgreSQL

ORM:
- Prisma

Excel Parsing:
- xlsx (SheetJS)

---

# 3. Data Source

The system receives a monthly Excel file (.xlsx).

Columns in the Excel file:

- Fecha
- Nombre
- Zona
- GRATIS
- Plan
- VENDEDOR
- EQUIPO
- DINERO RECIBIDO WELLCOMM
- PAGADO COMISION VENDEDORES
- PAGADA COMISION INSTALADORES
- MEDIO DE PAGO
- MONTO SUSCRIPCIÓN
- Quien RECIBE
- REFERENCIA DE REGISTRO
- MONTO SUSCRIPCIÓN (may appear duplicated)
- REVISION GABRIEL JOHALIS

The system must correctly map and normalize these columns.

---

# 4. Valid Row Rules

A row is valid ONLY if:

1. DINERO RECIBIDO WELLCOMM equals "PAGADO"
2. VENDEDOR is not empty
3. Fecha is a valid date

All other rows must be ignored.

---

# 5. Installation Type Logic

If GRATIS equals "GRATIS"  
→ Installation Type = FREE  

If not  
→ Installation Type = PAID  

---

# 6. Currency Detection Rules

Currency must be detected from MONTO SUSCRIPCIÓN:

If the value contains "$"  
→ Currency = USD  

Otherwise  
→ Currency = BCV  

USD and BCV are treated as equal value (1 USD = 1 BCV).

Commission currency must match transaction currency.

---

# 7. Seller Commission Rules

Two installation types exist:

FREE installation  
→ Seller commission = 8 (same currency as payment)

PAID installation  
→ Seller commission = 10 (same currency as payment)

Examples:

Free + USD → 8 USD  
Paid + BCV → 10 BCV  

---

# 8. Installer Commission Rules

There is ONE global installer account.

Installer commission is calculated from seller commission:

FREE  
→ 50% of seller commission  

PAID  
→ 70% of seller commission  

Examples:

FREE  
Seller = 8  
Installer = 4  

PAID  
Seller = 10  
Installer = 7  

Installer totals must be aggregated globally.

---

# 9. Database Requirements

The system must include:

Upload entity:
- id
- fileName
- uploadedAt
- relation to sales

Sale entity:
- transactionDate
- customerName
- sellerName
- zone
- paymentMethod
- referenceCode
- installationType
- currency
- subscriptionAmount
- sellerCommission
- installerCommission
- uploadId relation

Enums:
- InstallationType: FREE, PAID
- Currency: USD, BCV

Indexes required on:
- sellerName
- transactionDate
- zone

---

# 10. Duplicate Prevention

If REFERENCIA DE REGISTRO exists:
- Prevent duplicate entries within the same upload.

Ignore the duplicated MONTO SUSCRIPCIÓN column in Excel.

---

# 11. Reports Required

## Seller Report

Filterable by:
- Date range
- Seller
- Zone
- Currency
- Installation type

For each seller show:

- Total installations
- Free installations
- Paid installations
- Total revenue USD
- Total revenue BCV
- Total commission USD
- Total commission BCV
- Breakdown by zone
- Breakdown by payment method

---

## Installer Report

- Total installations
- Free installations
- Paid installations
- Total installer commission USD
- Total installer commission BCV

---

## Dashboard

Show:

- Total sales count
- Total revenue USD
- Total revenue BCV
- Total seller commissions
- Total installer commission
- Sales by seller (chart)
- Sales by zone (chart)
- Revenue by currency (chart)
- Free vs Paid distribution (chart)

---

# 12. Filtering Requirements

All reports must support:

- Start date
- End date
- Seller
- Zone
- Currency
- Installation type

Filtering must be dynamic.

---

# 13. Upload Behavior

For each uploaded file:

1. Create Upload record
2. Parse rows
3. Validate rows
4. Calculate commissions
5. Store normalized data
6. Reports must only use data from that upload

No cross-upload aggregation.

---

# 14. Commission Configuration

Commission values must be configurable in the future:

- Seller free commission (default 8)
- Seller paid commission (default 10)
- Installer free percentage (default 50%)
- Installer paid percentage (default 70%)

Values should not be permanently hardcoded.

---

# 15. System Behavior Summary

For each valid row:

1. Confirm payment = PAGADO
2. Determine installation type
3. Detect currency
4. Assign seller commission
5. Calculate installer commission
6. Store results
7. Aggregate dynamically in reports

---

# 16. Future Expansion (Not Required Now)

- Role-based access (Admin / Accountant / Seller)
- Editable commission values in admin panel
- Monthly comparisons
- Audit logs
- Multi-installer support

---

End of specification.