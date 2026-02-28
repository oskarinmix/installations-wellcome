import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface PdfTransaction {
  transactionDate: Date | string;
  customerName: string;
  zone: string;
  plan: string;
  installationType: string;
  currency: string;
  subscriptionAmount: number;
  sellerCommission: number;
  paymentMethod: string;
}

interface PdfData {
  sellerName: string;
  weekLabel: string;
  totalSales: number;
  freeCount: number;
  paidCount: number;
  revenueUSD: number;
  revenueBCV: number;
  commissionUSD: number;
  commissionBCV: number;
  bcvRate?: number;
  byPlan: { name: string; count: number }[];
  byZone: { name: string; count: number }[];
  transactions: PdfTransaction[];
}

function addSellerToDoc(doc: jsPDF, data: PdfData, isFirst: boolean) {
  if (!isFirst) doc.addPage();
  let y = 15;

  // Title
  doc.setFontSize(18);
  doc.setTextColor(0);
  doc.text(`Reporte del Vendedor: ${data.sellerName}`, 14, y);
  y += 8;

  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Semana: ${data.weekLabel}`, 14, y);
  y += 10;

  // KPI Summary
  doc.setFontSize(13);
  doc.setTextColor(0);
  doc.text("Resumen", 14, y);
  y += 7;

  doc.setFontSize(10);
  const kpis = [
    [`Ventas Totales: ${data.totalSales}`, `Gratis: ${data.freeCount}`, `Pagadas: ${data.paidCount}`],
    [`Comisión USD: $${data.commissionUSD.toFixed(2)}`, `Comisión BCV: $${data.commissionBCV.toFixed(2)}`],
  ];

  for (const row of kpis) {
    doc.text(row.join("    |    "), 14, y);
    y += 6;
  }

  // Bs conversion (only BCV commissions)
  if (data.bcvRate && data.bcvRate > 0 && data.commissionBCV > 0) {
    y += 2;
    doc.setFontSize(10);
    doc.setTextColor(150, 100, 0);
    const commBs = data.commissionBCV * data.bcvRate;
    doc.text(`Tasa BCV: ${data.bcvRate.toFixed(2)} Bs/$    |    Comisión BCV en Bs: ${commBs.toFixed(2)} Bs ($${data.commissionBCV.toFixed(2)})`, 14, y);
    doc.setTextColor(0);
    y += 6;
  }

  y += 4;

  // Plan breakdown
  if (data.byPlan.length > 0) {
    doc.setFontSize(13);
    doc.text("Ventas por Plan", 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [["Plan", "Cantidad"]],
      body: data.byPlan.map((p) => [p.name, String(p.count)]),
      margin: { left: 14 },
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 9 },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  // Zone breakdown
  if (data.byZone.length > 0) {
    doc.setFontSize(13);
    doc.text("Ventas por Zona", 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [["Zona", "Cantidad"]],
      body: data.byZone.map((z) => [z.name, String(z.count)]),
      margin: { left: 14 },
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 9 },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  // Transactions table
  if (data.transactions.length > 0) {
    if (y > 220) {
      doc.addPage();
      y = 15;
    }
    doc.setFontSize(13);
    doc.text("Transacciones", 14, y);
    y += 2;

    let totalCommUSD = 0;
    let totalCommBCV = 0;
    const txRows = data.transactions.map((t) => {
      const date = t.transactionDate instanceof Date ? t.transactionDate : new Date(t.transactionDate);
      if (t.currency === "USD") totalCommUSD += t.sellerCommission;
      else totalCommBCV += t.sellerCommission;
      return [
        date.toLocaleDateString("es", { month: "short", day: "numeric", year: "numeric" }),
        t.customerName,
        t.zone,
        t.plan,
        t.installationType,
        t.currency,
        t.subscriptionAmount.toFixed(2),
        `$${t.sellerCommission.toFixed(2)}`,
        t.paymentMethod,
      ];
    });

    // Totals row
    txRows.push([
      "", "", "", "", "", "TOTAL",
      "",
      `USD: $${totalCommUSD.toFixed(2)}  BCV: $${totalCommBCV.toFixed(2)}`,
      "",
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Fecha", "Cliente", "Zona", "Plan", "Tipo", "Moneda", "Monto", "Com.", "Pago"]],
      body: txRows,
      margin: { left: 14, right: 14 },
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185], fontSize: 8 },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 28 },
        7: { cellWidth: 28 },
      },
      didParseCell(hookData) {
        if (hookData.section === "body" && hookData.row.index === txRows.length - 1) {
          hookData.cell.styles.fontStyle = "bold";
          hookData.cell.styles.fillColor = [240, 240, 240];
        }
      },
    });
  }
}

function addFooters(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Generado el ${new Date().toLocaleDateString()} | Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }
}

export function generateSellerPdf(data: PdfData): Buffer {
  const doc = new jsPDF();
  addSellerToDoc(doc, data, true);
  addFooters(doc);
  return Buffer.from(doc.output("arraybuffer"));
}

export function generateAllSellersPdf(sellers: PdfData[]): Buffer {
  const doc = new jsPDF();
  sellers.forEach((data, i) => addSellerToDoc(doc, data, i === 0));
  addFooters(doc);
  return Buffer.from(doc.output("arraybuffer"));
}

interface WeeklySummaryData {
  weekLabel: string;
  bcvRate: number;
  installerCommissionUSD: number;
  installerCommissionBCV: number;
  sellers: {
    sellerName: string;
    freeCountUSD: number;
    freeCountBCV: number;
    paidCountUSD: number;
    paidCountBCV: number;
    commissionUSD: number;
    commissionBCV: number;
  }[];
}

export function generateWeeklySummaryPdf(data: WeeklySummaryData): Buffer {
  const doc = new jsPDF();
  let y = 15;

  // Title
  doc.setFontSize(18);
  doc.setTextColor(0);
  doc.text("Resumen Semanal de Ventas", 14, y);
  y += 8;

  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Semana: ${data.weekLabel}`, 14, y);
  y += 6;
  if (data.bcvRate > 0) {
    doc.text(`Tasa BCV: ${data.bcvRate.toFixed(2)} Bs/$`, 14, y);
  }
  y += 10;

  // Totals
  let totalFreeUSD = 0, totalFreeBCV = 0, totalPaidUSD = 0, totalPaidBCV = 0;
  let totalCommUSD = 0, totalCommBCV = 0;
  for (const s of data.sellers) {
    totalFreeUSD += s.freeCountUSD;
    totalFreeBCV += s.freeCountBCV;
    totalPaidUSD += s.paidCountUSD;
    totalPaidBCV += s.paidCountBCV;
    totalCommUSD += s.commissionUSD;
    totalCommBCV += s.commissionBCV;
  }

  doc.setFontSize(13);
  doc.setTextColor(0);
  doc.text("Totales Generales", 14, y);
  y += 7;

  doc.setFontSize(10);
  doc.text(`Com. Vendedores USD: $${totalCommUSD.toFixed(2)}    |    Com. Vendedores BCV: $${totalCommBCV.toFixed(2)}`, 14, y);
  y += 6;
  if (data.bcvRate > 0 && totalCommBCV > 0) {
    doc.setTextColor(150, 100, 0);
    const totalBs = totalCommBCV * data.bcvRate;
    doc.text(`Com. Vendedores BCV en Bs: ${totalBs.toFixed(2)} Bs ($${totalCommBCV.toFixed(2)})`, 14, y);
    doc.setTextColor(0);
    y += 6;
  }
  y += 4;

  // Installer commissions
  doc.setFontSize(13);
  doc.text("Comisiones Instaladores", 14, y);
  y += 7;
  doc.setFontSize(10);
  doc.text(`Com. Instalador USD: $${data.installerCommissionUSD.toFixed(2)}    |    Com. Instalador BCV: $${data.installerCommissionBCV.toFixed(2)}`, 14, y);
  y += 6;
  if (data.bcvRate > 0 && data.installerCommissionBCV > 0) {
    doc.setTextColor(150, 100, 0);
    const instBs = data.installerCommissionBCV * data.bcvRate;
    doc.text(`Com. Instalador BCV en Bs: ${instBs.toFixed(2)} Bs ($${data.installerCommissionBCV.toFixed(2)})`, 14, y);
    doc.setTextColor(0);
    y += 6;
  }
  y += 6;

  // Sellers table
  doc.setFontSize(13);
  doc.text("Detalle por Vendedor", 14, y);
  y += 2;

  const hasBcvRate = data.bcvRate > 0;
  const head = hasBcvRate
    ? [["Vendedor", "Gratis USD", "Gratis BCV", "Pagas USD", "Pagas BCV", "Total", "Com. USD", "Com. BCV", "Com. BCV (Bs)"]]
    : [["Vendedor", "Gratis USD", "Gratis BCV", "Pagas USD", "Pagas BCV", "Total", "Com. USD", "Com. BCV"]];

  const body = data.sellers.map((s) => {
    const total = s.freeCountUSD + s.freeCountBCV + s.paidCountUSD + s.paidCountBCV;
    const row = [
      s.sellerName,
      String(s.freeCountUSD),
      String(s.freeCountBCV),
      String(s.paidCountUSD),
      String(s.paidCountBCV),
      String(total),
      `$${s.commissionUSD.toFixed(2)}`,
      `$${s.commissionBCV.toFixed(2)}`,
    ];
    if (hasBcvRate) row.push(`${(s.commissionBCV * data.bcvRate).toFixed(2)} Bs`);
    return row;
  });

  // Totals row
  const grandTotal = totalFreeUSD + totalFreeBCV + totalPaidUSD + totalPaidBCV;
  const totalsRow = [
    "TOTAL",
    String(totalFreeUSD),
    String(totalFreeBCV),
    String(totalPaidUSD),
    String(totalPaidBCV),
    String(grandTotal),
    `$${totalCommUSD.toFixed(2)}`,
    `$${totalCommBCV.toFixed(2)}`,
  ];
  if (hasBcvRate) totalsRow.push(`${(totalCommBCV * data.bcvRate).toFixed(2)} Bs`);
  body.push(totalsRow);

  autoTable(doc, {
    startY: y,
    head,
    body,
    margin: { left: 14, right: 14 },
    theme: "grid",
    headStyles: { fillColor: [41, 128, 185], fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 2.5 },
    didParseCell(hookData) {
      if (hookData.section === "body" && hookData.row.index === body.length - 1) {
        hookData.cell.styles.fontStyle = "bold";
        hookData.cell.styles.fillColor = [240, 240, 240];
      }
    },
  });

  addFooters(doc);
  return Buffer.from(doc.output("arraybuffer"));
}
