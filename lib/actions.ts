"use server";

import { prisma } from "./prisma";
import { parseExcelFile, type ParseResult } from "./excel-parser";
import type { Currency, InstallationType } from "@/lib/generated/prisma/client";

// ── Commission Config ──

type CommissionConfigData = {
  sellerFreeCommission: number;
  sellerPaidCommission: number;
  installerFreePercentage: number;
  installerPaidPercentage: number;
};

export async function getCommissionConfig(): Promise<CommissionConfigData> {
  const config = await prisma.commissionConfig.findFirst();
  if (config) return config;
  return prisma.commissionConfig.create({
    data: {},
  });
}

export async function updateCommissionConfig(data: {
  sellerFreeCommission: number;
  sellerPaidCommission: number;
  installerFreePercentage: number;
  installerPaidPercentage: number;
}) {
  const existing = await prisma.commissionConfig.findFirst();
  if (existing) {
    await prisma.commissionConfig.update({ where: { id: existing.id }, data });
  } else {
    await prisma.commissionConfig.create({ data });
  }
}

// ── Commission Helpers ──

function getSellerCommission(installationType: "FREE" | "PAID", config: CommissionConfigData): number {
  return installationType === "FREE"
    ? config.sellerFreeCommission
    : config.sellerPaidCommission;
}

function getInstallerCommission(installationType: "FREE" | "PAID", planPrice: number, config: CommissionConfigData): number {
  return installationType === "FREE"
    ? planPrice * config.installerFreePercentage
    : planPrice * config.installerPaidPercentage;
}

// ── Seller / Plan Helpers ──

async function findOrCreateSeller(name: string): Promise<number> {
  const seller = await prisma.seller.upsert({
    where: { name },
    update: {},
    create: { name },
    select: { id: true },
  });
  return seller.id;
}

async function findOrCreatePlan(name: string): Promise<number> {
  const existing = await prisma.plan.findUnique({ where: { name }, select: { id: true } });
  if (existing) return existing.id;
  const plan = await prisma.plan.create({
    data: { name, price: 0 },
    select: { id: true },
  });
  return plan.id;
}

// ── Upload Actions ──

export async function uploadFile(formData: FormData): Promise<ParseResult & { uploadId: number; dbDuplicates: number }> {
  const file = formData.get("file") as File;
  if (!file) throw new Error("No file provided");

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = parseExcelFile(buffer);

  // Check against existing DB records for duplicates
  const existingKeys = new Set<string>();
  if (result.sales.length > 0) {
    const existing = await prisma.sale.findMany({
      select: {
        customerName: true,
        plan: true,
        sellerName: true,
        zone: true,
        transactionDate: true,
      },
    });
    for (const row of existing) {
      const key = `${row.customerName}|${row.plan}|${row.sellerName}|${row.zone}|${row.transactionDate.toISOString().slice(0, 10)}`;
      existingKeys.add(key);
    }
  }

  const newSales = [];
  let dbDuplicates = 0;
  for (const sale of result.sales) {
    const key = `${sale.customerName}|${sale.plan}|${sale.sellerName}|${sale.zone}|${sale.transactionDate.toISOString().slice(0, 10)}`;
    if (existingKeys.has(key)) {
      dbDuplicates++;
    } else {
      newSales.push(sale);
      existingKeys.add(key);
    }
  }

  // Pre-resolve all unique sellers and plans
  const uniqueSellerNames = [...new Set(newSales.map((s) => s.sellerName))];
  const uniquePlanNames = [...new Set(newSales.map((s) => s.plan))];

  const sellerIdMap = new Map<string, number>();
  const planIdMap = new Map<string, number>();

  await Promise.all(
    uniqueSellerNames.map(async (name) => {
      sellerIdMap.set(name, await findOrCreateSeller(name));
    })
  );
  await Promise.all(
    uniquePlanNames.map(async (name) => {
      planIdMap.set(name, await findOrCreatePlan(name));
    })
  );

  const upload = await prisma.upload.create({
    data: {
      fileName: file.name,
      sales: {
        create: newSales.map((sale) => ({
          transactionDate: sale.transactionDate,
          customerName: sale.customerName,
          sellerName: sale.sellerName,
          zone: sale.zone,
          plan: sale.plan,
          paymentMethod: sale.paymentMethod,
          referenceCode: sale.referenceCode,
          installationType: sale.installationType,
          currency: sale.currency,
          subscriptionAmount: sale.subscriptionAmount,
          sellerId: sellerIdMap.get(sale.sellerName)!,
          planId: planIdMap.get(sale.plan)!,
        })),
      },
    },
  });

  return { ...result, validRows: newSales.length, uploadId: upload.id, dbDuplicates };
}

export async function getUploads() {
  return prisma.upload.findMany({
    orderBy: { uploadedAt: "desc" },
    select: {
      id: true,
      fileName: true,
      uploadedAt: true,
      _count: { select: { sales: true } },
    },
  });
}

export async function deleteUpload(uploadId: number) {
  await prisma.upload.delete({ where: { id: uploadId } });
}

// ── Filter Types ──

export interface SalesFilters {
  uploadId?: number;
  startDate?: string;
  endDate?: string;
  seller?: string;
  zone?: string;
  currency?: Currency;
  installationType?: InstallationType;
}

function buildWhere(filters: SalesFilters) {
  const where: Record<string, unknown> = {};
  if (filters.uploadId !== undefined) where.uploadId = filters.uploadId;

  if (filters.startDate || filters.endDate) {
    const dateFilter: Record<string, Date> = {};
    if (filters.startDate) dateFilter.gte = new Date(filters.startDate);
    if (filters.endDate) dateFilter.lte = new Date(filters.endDate);
    where.transactionDate = dateFilter;
  }
  if (filters.seller) where.sellerName = filters.seller;
  if (filters.zone) where.zone = filters.zone;
  if (filters.currency) where.currency = filters.currency;
  if (filters.installationType) where.installationType = filters.installationType;

  return where;
}

// ── Sales Actions ──

export async function getSales(filters: SalesFilters) {
  const where = buildWhere(filters);
  const sales = await prisma.sale.findMany({
    where,
    orderBy: { transactionDate: "desc" },
    include: { planRef: { select: { price: true } } },
  });

  return sales.map((sale) => ({
    ...sale,
    expectedPrice: sale.planRef.price ?? null,
    planRef: undefined,
  }));
}

// ── Plan Prices (from DB) ──

export async function getPlanPrices() {
  return prisma.plan.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, price: true },
  });
}

export async function createPlan(name: string, price: number) {
  const plan = await prisma.plan.create({ data: { name: name.trim(), price } });
  return plan.id;
}

export async function updatePlan(id: number, name: string, price: number) {
  await prisma.plan.update({
    where: { id },
    data: { name: name.trim(), price },
  });
  // Sync denormalized plan name on sales
  await prisma.sale.updateMany({
    where: { planId: id },
    data: { plan: name.trim() },
  });
}

export async function deletePlan(id: number) {
  // Only allow deleting plans with no sales
  const count = await prisma.sale.count({ where: { planId: id } });
  if (count > 0) throw new Error("Cannot delete a plan that has sales associated with it");
  await prisma.plan.delete({ where: { id } });
}

// ── Filter Options ──

export async function getFilterOptions(uploadId: number) {
  const [sellers, zones] = await Promise.all([
    prisma.sale.findMany({
      where: { uploadId },
      select: { sellerName: true },
      distinct: ["sellerName"],
      orderBy: { sellerName: "asc" },
    }),
    prisma.sale.findMany({
      where: { uploadId },
      select: { zone: true },
      distinct: ["zone"],
      orderBy: { zone: "asc" },
    }),
  ]);

  return {
    sellers: sellers.map((s) => s.sellerName),
    zones: zones.map((z) => z.zone),
  };
}

// ── Dashboard Actions ──

export async function getDashboardData(filters: SalesFilters) {
  const where = buildWhere(filters);
  const [sales, config] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: { planRef: { select: { price: true } } },
    }),
    getCommissionConfig(),
  ]);

  const totalSales = sales.length;
  let totalRevenueUSD = 0;
  let totalRevenueBCV = 0;
  let totalSellerCommissionUSD = 0;
  let totalSellerCommissionBCV = 0;
  let totalInstallerCommissionUSD = 0;
  let totalInstallerCommissionBCV = 0;
  let freeCount = 0;
  let paidCount = 0;

  const salesBySeller: Record<string, number> = {};
  const salesByZone: Record<string, number> = {};
  const salesByPlan: Record<string, { count: number; revenue: number; price: number }> = {};

  for (const sale of sales) {
    const planPrice = sale.planRef.price;
    const sellerComm = getSellerCommission(sale.installationType as "FREE" | "PAID", config);
    const installerComm = getInstallerCommission(sale.installationType as "FREE" | "PAID", planPrice, config);

    if (sale.currency === "USD") {
      totalRevenueUSD += planPrice;
      totalSellerCommissionUSD += sellerComm;
      totalInstallerCommissionUSD += installerComm;
    } else {
      totalRevenueBCV += planPrice;
      totalSellerCommissionBCV += sellerComm;
      totalInstallerCommissionBCV += installerComm;
    }

    if (sale.installationType === "FREE") freeCount++;
    else paidCount++;

    salesBySeller[sale.sellerName] = (salesBySeller[sale.sellerName] || 0) + 1;
    salesByZone[sale.zone] = (salesByZone[sale.zone] || 0) + 1;

    const planKey = sale.plan || "Unknown";
    if (!salesByPlan[planKey]) salesByPlan[planKey] = { count: 0, revenue: 0, price: planPrice };
    salesByPlan[planKey].count++;
    salesByPlan[planKey].revenue += planPrice;
  }

  return {
    totalSales,
    totalRevenueUSD,
    totalRevenueBCV,
    totalSellerCommissionUSD,
    totalSellerCommissionBCV,
    totalInstallerCommissionUSD,
    totalInstallerCommissionBCV,
    freeCount,
    paidCount,
    salesBySeller: Object.entries(salesBySeller).map(([name, count]) => ({ name, count })),
    salesByZone: Object.entries(salesByZone).map(([name, count]) => ({ name, count })),
    salesByPlan: Object.entries(salesByPlan)
      .map(([name, data]) => ({
        name,
        count: data.count,
        revenue: data.revenue,
        expectedPrice: data.price ?? null,
      }))
      .sort((a, b) => b.count - a.count),
    revenueByCurrency: [
      { name: "USD", value: totalRevenueUSD },
      { name: "BCV", value: totalRevenueBCV },
    ],
    installationDistribution: [
      { name: "FREE", value: freeCount },
      { name: "PAID", value: paidCount },
    ],
  };
}

// ── Seller Report Actions ──

export async function getSellerReport(filters: SalesFilters) {
  const where = buildWhere(filters);
  const [sales, config] = await Promise.all([
    prisma.sale.findMany({ where, include: { planRef: { select: { price: true } } } }),
    getCommissionConfig(),
  ]);

  const sellerMap: Record<string, {
    sellerName: string;
    totalInstallations: number;
    freeInstallations: number;
    paidInstallations: number;
    revenueUSD: number;
    revenueBCV: number;
    commissionUSD: number;
    commissionBCV: number;
    byZone: Record<string, number>;
    byPaymentMethod: Record<string, number>;
    byPlan: Record<string, number>;
  }> = {};

  for (const sale of sales) {
    if (!sellerMap[sale.sellerName]) {
      sellerMap[sale.sellerName] = {
        sellerName: sale.sellerName,
        totalInstallations: 0,
        freeInstallations: 0,
        paidInstallations: 0,
        revenueUSD: 0,
        revenueBCV: 0,
        commissionUSD: 0,
        commissionBCV: 0,
        byZone: {},
        byPaymentMethod: {},
        byPlan: {},
      };
    }

    const s = sellerMap[sale.sellerName];
    const sellerComm = getSellerCommission(sale.installationType as "FREE" | "PAID", config);
    s.totalInstallations++;

    if (sale.installationType === "FREE") s.freeInstallations++;
    else s.paidInstallations++;

    const planPrice = sale.planRef.price;
    if (sale.currency === "USD") {
      s.revenueUSD += planPrice;
      s.commissionUSD += sellerComm;
    } else {
      s.revenueBCV += planPrice;
      s.commissionBCV += sellerComm;
    }

    s.byZone[sale.zone] = (s.byZone[sale.zone] || 0) + 1;
    s.byPaymentMethod[sale.paymentMethod] = (s.byPaymentMethod[sale.paymentMethod] || 0) + 1;
    const planKey = sale.plan || "Unknown";
    s.byPlan[planKey] = (s.byPlan[planKey] || 0) + 1;
  }

  return Object.values(sellerMap).sort((a, b) => b.totalInstallations - a.totalInstallations);
}

// ── Seller CRUD ──

export async function createSeller(name: string) {
  const seller = await prisma.seller.create({ data: { name: name.trim() } });
  return seller.id;
}

export async function updateSeller(id: number, name: string) {
  await prisma.seller.update({
    where: { id },
    data: { name: name.trim() },
  });
  // Also update denormalized sellerName on all sales
  await prisma.sale.updateMany({
    where: { sellerId: id },
    data: { sellerName: name.trim() },
  });
}

// ── Global Sellers List ──

export async function getAllSellers() {
  const sellers = await prisma.seller.findMany({
    include: {
      _count: { select: { sales: true } },
      sales: {
        select: {
          installationType: true,
          currency: true,
          transactionDate: true,
          planRef: { select: { price: true } },
        },
      },
    },
  });

  const config = await getCommissionConfig();

  return sellers
    .map((seller) => {
      let commissionUSD = 0;
      let commissionBCV = 0;
      let totalRevenue = 0;
      let lastActive: Date | null = null;

      for (const sale of seller.sales) {
        const comm = getSellerCommission(sale.installationType as "FREE" | "PAID", config);
        if (sale.currency === "USD") commissionUSD += comm;
        else commissionBCV += comm;
        totalRevenue += sale.planRef.price;
        if (!lastActive || sale.transactionDate > lastActive) {
          lastActive = sale.transactionDate;
        }
      }

      return {
        id: seller.id,
        sellerName: seller.name,
        totalSales: seller._count.sales,
        totalRevenue,
        commissionUSD,
        commissionBCV,
        lastActive,
      };
    })
    .sort((a, b) => b.totalSales - a.totalSales);
}

// ── Seller Detail (week-filtered) ──

export async function getSellerDetail(sellerId: number, weekStart?: string, weekEnd?: string) {
  const seller = await prisma.seller.findUnique({ where: { id: sellerId }, select: { name: true } });
  if (!seller) throw new Error("Seller not found");

  const where: Record<string, unknown> = { sellerId };
  if (weekStart && weekEnd) {
    where.transactionDate = {
      gte: new Date(weekStart),
      lte: new Date(weekEnd),
    };
  }

  const [sales, config] = await Promise.all([
    prisma.sale.findMany({
      where,
      orderBy: { transactionDate: "desc" },
      include: { planRef: { select: { price: true } } },
    }),
    getCommissionConfig(),
  ]);

  let totalSales = 0;
  let freeCount = 0;
  let paidCount = 0;
  let revenueUSD = 0;
  let revenueBCV = 0;
  let commissionUSD = 0;
  let commissionBCV = 0;
  const byPlan: Record<string, number> = {};
  const byZone: Record<string, number> = {};

  for (const sale of sales) {
    totalSales++;
    const comm = getSellerCommission(sale.installationType as "FREE" | "PAID", config);
    if (sale.installationType === "FREE") freeCount++;
    else paidCount++;
    const planPrice = sale.planRef.price;
    if (sale.currency === "USD") {
      revenueUSD += planPrice;
      commissionUSD += comm;
    } else {
      revenueBCV += planPrice;
      commissionBCV += comm;
    }
    const planKey = sale.plan || "Unknown";
    byPlan[planKey] = (byPlan[planKey] || 0) + 1;
    byZone[sale.zone] = (byZone[sale.zone] || 0) + 1;
  }

  return {
    sellerName: seller.name,
    totalSales,
    freeCount,
    paidCount,
    revenueUSD,
    revenueBCV,
    commissionUSD,
    commissionBCV,
    byPlan: Object.entries(byPlan).map(([name, count]) => ({ name, count })),
    byZone: Object.entries(byZone).map(([name, count]) => ({ name, count })),
    transactions: sales.map((s) => ({
      id: s.id,
      transactionDate: s.transactionDate,
      customerName: s.customerName,
      zone: s.zone,
      plan: s.plan,
      paymentMethod: s.paymentMethod,
      referenceCode: s.referenceCode,
      installationType: s.installationType,
      currency: s.currency,
      subscriptionAmount: s.subscriptionAmount,
      sellerCommission: getSellerCommission(s.installationType as "FREE" | "PAID", config),
      installerCommission: getInstallerCommission(s.installationType as "FREE" | "PAID", s.planRef.price, config),
      expectedPrice: s.planRef.price ?? null,
    })),
  };
}

// ── Seller Available Weeks ──

export async function getSellerAvailableWeeks(sellerId: number) {
  const sales = await prisma.sale.findMany({
    where: { sellerId },
    select: { transactionDate: true },
    orderBy: { transactionDate: "desc" },
  });
  return sales.map((s) => s.transactionDate);
}

export async function getAllAvailableWeeks() {
  const sales = await prisma.sale.findMany({
    select: { transactionDate: true },
    orderBy: { transactionDate: "desc" },
  });
  return sales.map((s) => s.transactionDate);
}

// ── Seller PDF Report ──

export async function generateSellerReport(
  sellerId: number,
  weekStart: string,
  weekEnd: string,
  weekLabel: string
) {
  const { generateSellerPdf } = await import("./generate-pdf");
  const detail = await getSellerDetail(sellerId, weekStart, weekEnd);
  const pdfBuffer = generateSellerPdf({
    ...detail,
    weekLabel,
  });
  return pdfBuffer.toString("base64");
}

// ── All Installations ──

export interface InstallationsFilters {
  search?: string;
  seller?: string;
  zone?: string;
  currency?: Currency;
  installationType?: InstallationType;
  startDate?: string;
  endDate?: string;
}

export async function getAllInstallations(filters: InstallationsFilters) {
  const where: Record<string, unknown> = {};

  if (filters.seller) where.sellerName = filters.seller;
  if (filters.zone) where.zone = filters.zone;
  if (filters.currency) where.currency = filters.currency;
  if (filters.installationType) where.installationType = filters.installationType;

  if (filters.startDate || filters.endDate) {
    const dateFilter: Record<string, Date> = {};
    if (filters.startDate) dateFilter.gte = new Date(filters.startDate);
    if (filters.endDate) dateFilter.lte = new Date(filters.endDate);
    where.transactionDate = dateFilter;
  }

  if (filters.search) {
    where.OR = [
      { customerName: { contains: filters.search, mode: "insensitive" } },
      { sellerName: { contains: filters.search, mode: "insensitive" } },
      { zone: { contains: filters.search, mode: "insensitive" } },
      { plan: { contains: filters.search, mode: "insensitive" } },
      { referenceCode: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const [sales, config] = await Promise.all([
    prisma.sale.findMany({
      where,
      orderBy: { transactionDate: "desc" },
      include: { planRef: { select: { price: true } } },
    }),
    getCommissionConfig(),
  ]);

  return sales.map((sale) => ({
    ...sale,
    sellerCommission: getSellerCommission(sale.installationType as "FREE" | "PAID", config),
    installerCommission: getInstallerCommission(sale.installationType as "FREE" | "PAID", sale.planRef.price, config),
    expectedPrice: sale.planRef.price ?? null,
    planRef: undefined,
  }));
}

export async function getGlobalFilterOptions() {
  const [sellers, zones] = await Promise.all([
    prisma.seller.findMany({
      where: { sales: { some: {} } },
      select: { name: true },
      orderBy: { name: "asc" },
    }),
    prisma.sale.findMany({
      select: { zone: true },
      distinct: ["zone"],
      orderBy: { zone: "asc" },
    }),
  ]);

  return {
    sellers: sellers.map((s) => s.name),
    zones: zones.map((z) => z.zone),
  };
}

// ── Zones ──

export async function getZones(): Promise<string[]> {
  const zones = await prisma.sale.findMany({
    select: { zone: true },
    distinct: ["zone"],
    orderBy: { zone: "asc" },
  });
  return zones.map((z) => z.zone);
}

// ── Create Installation ──

export async function createInstallation(data: {
  transactionDate: string;
  customerName: string;
  sellerId: number;
  zone: string;
  planId: number;
  installationType: "FREE" | "PAID";
  currency: "USD" | "BCV";
  subscriptionAmount: number;
  paymentMethod: string;
  referenceCode?: string;
}) {
  const seller = await prisma.seller.findUnique({ where: { id: data.sellerId }, select: { name: true } });
  if (!seller) throw new Error("Seller not found");

  const plan = await prisma.plan.findUnique({ where: { id: data.planId }, select: { name: true } });
  if (!plan) throw new Error("Plan not found");

  const sale = await prisma.sale.create({
    data: {
      transactionDate: new Date(data.transactionDate),
      customerName: data.customerName,
      sellerName: seller.name,
      zone: data.zone,
      plan: plan.name,
      paymentMethod: data.paymentMethod,
      referenceCode: data.referenceCode || null,
      installationType: data.installationType,
      currency: data.currency,
      subscriptionAmount: data.subscriptionAmount,
      sellerRef: { connect: { id: data.sellerId } },
      planRef: { connect: { id: data.planId } },
    },
  });

  return sale.id;
}

// ── Installer Report Actions ──

export async function getInstallerReport(filters: SalesFilters) {
  const where = buildWhere(filters);
  const [sales, config] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: { planRef: { select: { price: true } } },
    }),
    getCommissionConfig(),
  ]);

  let totalInstallations = 0;
  let freeInstallations = 0;
  let paidInstallations = 0;
  let commissionUSD = 0;
  let commissionBCV = 0;

  for (const sale of sales) {
    const installerComm = getInstallerCommission(sale.installationType as "FREE" | "PAID", sale.planRef.price, config);
    totalInstallations++;
    if (sale.installationType === "FREE") freeInstallations++;
    else paidInstallations++;

    if (sale.currency === "USD") commissionUSD += installerComm;
    else commissionBCV += installerComm;
  }

  return {
    totalInstallations,
    freeInstallations,
    paidInstallations,
    commissionUSD,
    commissionBCV,
  };
}

// ── Update / Delete Installation ──

export async function updateInstallation(
  id: number,
  data: {
    transactionDate: string;
    customerName: string;
    sellerId: number;
    zone: string;
    planId: number;
    installationType: "FREE" | "PAID";
    currency: "USD" | "BCV";
    subscriptionAmount: number;
    paymentMethod: string;
    referenceCode?: string;
  }
) {
  const seller = await prisma.seller.findUnique({ where: { id: data.sellerId }, select: { name: true } });
  if (!seller) throw new Error("Seller not found");

  const plan = await prisma.plan.findUnique({ where: { id: data.planId }, select: { name: true } });
  if (!plan) throw new Error("Plan not found");

  await prisma.sale.update({
    where: { id },
    data: {
      transactionDate: new Date(data.transactionDate),
      customerName: data.customerName,
      sellerName: seller.name,
      zone: data.zone,
      plan: plan.name,
      paymentMethod: data.paymentMethod,
      referenceCode: data.referenceCode || null,
      installationType: data.installationType,
      currency: data.currency,
      subscriptionAmount: data.subscriptionAmount,
      sellerId: data.sellerId,
      planId: data.planId,
    },
  });
}

export async function deleteInstallation(id: number) {
  await prisma.sale.delete({ where: { id } });
}
