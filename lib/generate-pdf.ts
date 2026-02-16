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
  byPlan: { name: string; count: number }[];
  byZone: { name: string; count: number }[];
  transactions: PdfTransaction[];
}

export function generateSellerPdf(data: PdfData): Buffer {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // Title
  doc.setFontSize(18);
  doc.text(`Seller Report: ${data.sellerName}`, 14, y);
  y += 8;

  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Week: ${data.weekLabel}`, 14, y);
  y += 10;

  // KPI Summary
  doc.setFontSize(13);
  doc.setTextColor(0);
  doc.text("Summary", 14, y);
  y += 7;

  doc.setFontSize(10);
  const kpis = [
    [`Total Sales: ${data.totalSales}`, `Free: ${data.freeCount}`, `Paid: ${data.paidCount}`],
    [`Revenue USD: $${data.revenueUSD.toFixed(2)}`, `Revenue BCV: $${data.revenueBCV.toFixed(2)}`],
    [`Commission USD: $${data.commissionUSD.toFixed(2)}`, `Commission BCV: $${data.commissionBCV.toFixed(2)}`],
  ];

  for (const row of kpis) {
    doc.text(row.join("    |    "), 14, y);
    y += 6;
  }
  y += 4;

  // Plan breakdown
  if (data.byPlan.length > 0) {
    doc.setFontSize(13);
    doc.text("Sales by Plan", 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [["Plan", "Count"]],
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
    doc.text("Sales by Zone", 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [["Zone", "Count"]],
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
    doc.text("Transactions", 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [["Date", "Customer", "Zone", "Plan", "Type", "Currency", "Amount", "Payment"]],
      body: data.transactions.map((t) => {
        const date = t.transactionDate instanceof Date ? t.transactionDate : new Date(t.transactionDate);
        return [
          date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          t.customerName,
          t.zone,
          t.plan,
          t.installationType,
          t.currency,
          t.subscriptionAmount.toFixed(2),
          t.paymentMethod,
        ];
      }),
      margin: { left: 14, right: 14 },
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185], fontSize: 8 },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 30 },
      },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Generated on ${new Date().toLocaleDateString()} | Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  return Buffer.from(doc.output("arraybuffer"));
}
