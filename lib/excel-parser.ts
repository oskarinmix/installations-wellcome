import * as XLSX from "xlsx";

export interface ParsedSale {
  transactionDate: Date;
  customerName: string;
  sellerName: string;
  zone: string;
  plan: string;
  paymentMethod: string;
  referenceCode: string | null;
  installationType: "FREE" | "PAID";
  currency: "USD" | "BCV";
  subscriptionAmount: number;
}

export interface DuplicateInfo {
  rowNumber: number;
  customerName: string;
  sellerName: string;
  plan: string;
  zone: string;
  date: string;
}

export interface ParseResult {
  sales: ParsedSale[];
  totalRows: number;
  validRows: number;
  skippedRows: number;
  duplicateRows: number;
  duplicates: DuplicateInfo[];
  detectedHeaders: string[];
  mappedColumns: Record<string, number>;
}

const COLUMN_MAP: Record<string, string> = {
  "fecha": "fecha",
  "nombre": "nombre",
  "zona": "zona",
  "gratis": "gratis",
  "plan": "plan",
  "vendedor": "vendedor",
  "equipo": "equipo",
  "dinero recibido wellcomm": "dineroRecibido",
  "pagado comision vendedores": "pagadoComisionVendedores",
  "pagada comision instaladores": "pagadaComisionInstaladores",
  "medio de pago": "medioPago",
  "metodo de pago": "medioPago",
  "forma de pago": "medioPago",
  "tipo de pago": "medioPago",
  "pago": "medioPago",
  "monto suscripcion": "montoSuscripcion",
  "quien recibe": "quienRecibe",
  "referencia de registro": "referenciaRegistro",
  "revision gabriel johalis": "revisionGabriel",
};

const KNOWN_PAYMENT_VALUES = new Set([
  "zelle", "efectivo", "efectivo bs", "efectivo bolivares", "efectivo bolívares",
  "pago movil", "pago móvil", "mixto",
]);

function normalizeKey(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeHeaders(headers: string[]): Map<string, number> {
  const map = new Map<string, number>();
  let montoFound = false;

  for (let i = 0; i < headers.length; i++) {
    const raw = normalizeKey((headers[i] || "").toString());
    const mapped = COLUMN_MAP[raw];
    if (mapped) {
      if (mapped === "montoSuscripcion" && montoFound) continue;
      if (mapped === "montoSuscripcion") montoFound = true;
      map.set(mapped, i);
    }
  }
  return map;
}

function parseDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) return new Date(date.y, date.m - 1, date.d);
  }

  const str = String(value).trim();
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed;

  const parts = str.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const [d, m, y] = parts.map(Number);
    const date = new Date(y, m - 1, d);
    if (!isNaN(date.getTime())) return date;
  }

  return null;
}

function detectCurrency(paymentMethod: string): "USD" | "BCV" {
  const n = normalizeKey(paymentMethod);
  if (n === "zelle" || n === "efectivo") return "USD";
  if (n === "efectivo bs" || n === "pago movil" || n === "mixto") return "BCV";
  return "USD";
}

function parseAmount(montoValue: unknown): number {
  if (typeof montoValue === "number") return montoValue;
  const str = String(montoValue || "0");
  const cleaned = str.replace(/[^0-9.,]/g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
}

export function parseExcelFile(buffer: Buffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });

  if (rows.length < 2) {
    return { sales: [], totalRows: 0, validRows: 0, skippedRows: 0, duplicateRows: 0, duplicates: [], detectedHeaders: [], mappedColumns: {} };
  }

  const headers = (rows[0] as unknown[]).map(String);
  const colMap = normalizeHeaders(headers);
  const dataRows = rows.slice(1);
  const totalRows = dataRows.length;

  // The payment method values live in an unnamed column right after "Zona".
  // Override any header-based match with the actual data column.
  const zonaIdx = colMap.get("zona");
  if (zonaIdx !== undefined && dataRows.length > 0) {
    const nextCol = zonaIdx + 1;
    // Check if this unnamed column has known payment values
    const samplesToCheck = Math.min(10, dataRows.length);
    for (let r = 0; r < samplesToCheck; r++) {
      const cell = normalizeKey(String((dataRows[r] as unknown[])[nextCol] || ""));
      if (KNOWN_PAYMENT_VALUES.has(cell)) {
        colMap.set("medioPago", nextCol);
        break;
      }
    }
  }

  const sales: ParsedSale[] = [];
  let skippedRows = 0;
  let duplicateRows = 0;
  const duplicates: DuplicateInfo[] = [];
  const seenKeys = new Set<string>();

  const getCell = (row: unknown[], key: string): unknown => {
    const idx = colMap.get(key);
    if (idx === undefined) return null;
    return (row as unknown[])[idx];
  };

  for (const row of dataRows) {
    const rowArr = row as unknown[];

    const dinero = String(getCell(rowArr, "dineroRecibido") || "").trim().toUpperCase();
    if (dinero !== "PAGADO") {
      skippedRows++;
      continue;
    }

    const vendedor = String(getCell(rowArr, "vendedor") || "").trim();
    if (!vendedor) {
      skippedRows++;
      continue;
    }

    const fecha = parseDate(getCell(rowArr, "fecha"));
    if (!fecha) {
      skippedRows++;
      continue;
    }

    const customerName = String(getCell(rowArr, "nombre") || "").trim();
    const zone = String(getCell(rowArr, "zona") || "").trim();
    const plan = String(getCell(rowArr, "plan") || "").trim();
    const dateKey = fecha.toISOString().slice(0, 10);

    const dedupKey = `${customerName}|${plan}|${vendedor}|${zone}|${dateKey}`;
    if (seenKeys.has(dedupKey)) {
      duplicateRows++;
      duplicates.push({
        rowNumber: dataRows.indexOf(row) + 2,
        customerName,
        sellerName: vendedor,
        plan,
        zone,
        date: dateKey,
      });
      continue;
    }
    seenKeys.add(dedupKey);

    const refCode = String(getCell(rowArr, "referenciaRegistro") || "").trim() || null;

    const gratisValue = String(getCell(rowArr, "gratis") || "").trim().toUpperCase();
    const installationType = gratisValue === "GRATIS" ? "FREE" : "PAID";

    const paymentMethod = String(getCell(rowArr, "medioPago") || "").trim();
    const currency = detectCurrency(paymentMethod);

    const montoRaw = getCell(rowArr, "montoSuscripcion");
    const subscriptionAmount = parseAmount(montoRaw);

    sales.push({
      transactionDate: fecha,
      customerName,
      sellerName: vendedor,
      zone,
      plan,
      paymentMethod,
      referenceCode: refCode,
      installationType,
      currency,
      subscriptionAmount,
    });
  }

  return {
    sales,
    totalRows,
    validRows: sales.length,
    skippedRows,
    duplicateRows,
    duplicates,
    detectedHeaders: headers,
    mappedColumns: Object.fromEntries(colMap),
  };
}
