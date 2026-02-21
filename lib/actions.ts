"use server";

import { prisma } from "./prisma";
import { parseExcelFile, type ParseResult } from "./excel-parser";
import type { Currency, InstallationType } from "@/lib/generated/prisma/client";
import { getUserRole } from "./get-user-role";

// ── BCV Rate ──

let cachedBcvRate: { rate: number; fetchedAt: number } | null = null;
const BCV_CACHE_MS = 10 * 60 * 1000; // 10 minutes

export async function getBcvRate(): Promise<{ rate: number; date: string }> {
  if (cachedBcvRate && Date.now() - cachedBcvRate.fetchedAt < BCV_CACHE_MS) {
    return { rate: cachedBcvRate.rate, date: new Date().toISOString().slice(0, 10) };
  }
  try {
    const res = await fetch("https://bcv-api.rafnixg.dev/rates/", { next: { revalidate: 600 } });
    if (!res.ok) throw new Error("BCV API error");
    const data = await res.json();
    cachedBcvRate = { rate: data.dollar, fetchedAt: Date.now() };
    return { rate: data.dollar, date: data.date };
  } catch {
    return { rate: cachedBcvRate?.rate ?? 0, date: "" };
  }
}

// ── Role Helpers ──

export async function getCurrentUserRole() {
  const role = await getUserRole();
  if (!role) return null;
  return { role };
}

async function requireAdmin() {
  const role = await getUserRole();
  if (role !== "admin") {
    throw new Error("Unauthorized: admin access required");
  }
}

// ── User Management ──

export async function getAllUsers() {
  await requireAdmin();
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
  return users.map((u) => ({
    ...u,
    role: u.role as "admin" | "agent",
  }));
}

export async function updateUserRole(userId: string, role: "admin" | "agent") {
  await requireAdmin();
  await prisma.user.update({
    where: { id: userId },
    data: { role },
  });
}

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
  await requireAdmin();
  const existing = await prisma.commissionConfig.findFirst();
  if (existing) {
    await prisma.commissionConfig.update({ where: { id: existing.id }, data });
  } else {
    await prisma.commissionConfig.create({ data });
  }
}

// ── Commission Helpers ──

type CommissionRuleData = {
  sellerFreeType: "FIXED" | "PERCENTAGE";
  sellerFreeValue: number;
  sellerPaidType: "FIXED" | "PERCENTAGE";
  sellerPaidValue: number;
  installerFreeType: "FIXED" | "PERCENTAGE";
  installerFreeValue: number;
  installerPaidType: "FIXED" | "PERCENTAGE";
  installerPaidValue: number;
};

function resolveCommissions(
  installationType: "FREE" | "PAID",
  planPrice: number,
  rule: CommissionRuleData | null,
  config: CommissionConfigData
): { sellerComm: number; installerComm: number } {
  if (rule) {
    const sType = installationType === "FREE" ? rule.sellerFreeType : rule.sellerPaidType;
    const sVal  = installationType === "FREE" ? rule.sellerFreeValue : rule.sellerPaidValue;
    const iType = installationType === "FREE" ? rule.installerFreeType : rule.installerPaidType;
    const iVal  = installationType === "FREE" ? rule.installerFreeValue : rule.installerPaidValue;
    return {
      sellerComm:    sType === "FIXED" ? sVal : planPrice * sVal,
      installerComm: iType === "FIXED" ? iVal : planPrice * iVal,
    };
  }
  const sellerComm    = installationType === "FREE" ? config.sellerFreeCommission : config.sellerPaidCommission;
  const installerComm = installationType === "FREE"
    ? planPrice * config.installerFreePercentage
    : planPrice * config.installerPaidPercentage;
  return { sellerComm, installerComm };
}

async function buildSellerRuleMap(): Promise<Map<string, CommissionRuleData | null>> {
  const sellers = await prisma.seller.findMany({
    select: { name: true, commissionRule: true },
  });
  return new Map(sellers.map((s) => [s.name, s.commissionRule ?? null]));
}

// ── Commission Rule CRUD ──

type CommissionRuleInput = {
  name: string;
  sellerFreeType: "FIXED" | "PERCENTAGE";
  sellerFreeValue: number;
  sellerPaidType: "FIXED" | "PERCENTAGE";
  sellerPaidValue: number;
  installerFreeType: "FIXED" | "PERCENTAGE";
  installerFreeValue: number;
  installerPaidType: "FIXED" | "PERCENTAGE";
  installerPaidValue: number;
};

export async function getCommissionRules() {
  await requireAdmin();
  return prisma.commissionRule.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { sellers: true } } },
  });
}

export async function createCommissionRule(data: CommissionRuleInput) {
  await requireAdmin();
  return prisma.commissionRule.create({ data });
}

export async function updateCommissionRule(id: number, data: CommissionRuleInput) {
  await requireAdmin();
  return prisma.commissionRule.update({ where: { id }, data });
}

export async function deleteCommissionRule(id: number) {
  await requireAdmin();
  return prisma.commissionRule.delete({ where: { id } });
}

export async function assignRuleToSeller(sellerId: number, ruleId: number | null) {
  await requireAdmin();
  return prisma.seller.update({
    where: { id: sellerId },
    data: { commissionRuleId: ruleId },
  });
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
  await requireAdmin();
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
  await requireAdmin();
  await prisma.upload.delete({ where: { id: uploadId } });
}

// ── Filter Types ──

export interface SalesFilters {
  uploadId?: number;
  startDate?: string;
  endDate?: string;
  seller?: string;
  zone?: string;
  zones?: string[];
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
  if (filters.zones && filters.zones.length > 0) {
    where.zone = { in: filters.zones };
  } else if (filters.zone) {
    where.zone = filters.zone;
  }
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
  await requireAdmin();
  const plan = await prisma.plan.create({ data: { name: name.trim(), price } });
  return plan.id;
}

export async function updatePlan(id: number, name: string, price: number) {
  await requireAdmin();
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
  await requireAdmin();
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
  const [sales, config, ruleMap] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: { planRef: { select: { price: true } } },
    }),
    getCommissionConfig(),
    buildSellerRuleMap(),
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
    const { sellerComm, installerComm } = resolveCommissions(
      sale.installationType as "FREE" | "PAID",
      planPrice,
      ruleMap.get(sale.sellerName) ?? null,
      config
    );

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
  const [sales, config, ruleMap] = await Promise.all([
    prisma.sale.findMany({ where, include: { planRef: { select: { price: true } } } }),
    getCommissionConfig(),
    buildSellerRuleMap(),
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
    const { sellerComm } = resolveCommissions(
      sale.installationType as "FREE" | "PAID",
      sale.planRef.price,
      ruleMap.get(sale.sellerName) ?? null,
      config
    );
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

export async function createSeller(name: string, pin?: string) {
  await requireAdmin();
  const seller = await prisma.seller.create({
    data: { name: name.trim(), pin: pin || null },
  });
  return seller.id;
}

export async function updateSeller(id: number, name: string, pin?: string) {
  await requireAdmin();
  await prisma.seller.update({
    where: { id },
    data: { name: name.trim(), pin: pin !== undefined ? (pin || null) : undefined },
  });
  // Also update denormalized sellerName on all sales
  await prisma.sale.updateMany({
    where: { sellerId: id },
    data: { sellerName: name.trim() },
  });
}

// ── Seller PIN Validation ──

export async function validateSellerPin(sellerId: number, pin: string) {
  const seller = await prisma.seller.findUnique({
    where: { id: sellerId },
    select: { name: true, pin: true },
  });

  if (!seller || !seller.pin || seller.pin !== pin) {
    return { valid: false as const };
  }

  return { valid: true as const, sellerName: seller.name };
}

// ── Global Sellers List ──

export async function getAllSellers(weekStart?: string, weekEnd?: string) {
  const dateFilter = weekStart && weekEnd
    ? { transactionDate: { gte: new Date(weekStart), lte: new Date(weekEnd) } }
    : undefined;

  const [sellers, config] = await Promise.all([
    prisma.seller.findMany({
      include: {
        _count: { select: { sales: dateFilter ? { where: dateFilter } : true } },
        sales: {
          where: dateFilter,
          select: {
            installationType: true,
            currency: true,
            transactionDate: true,
            planRef: { select: { price: true } },
          },
        },
        commissionRule: true,
      },
    }),
    getCommissionConfig(),
  ]);

  return sellers
    .map((seller) => {
      let commissionUSD = 0;
      let commissionBCV = 0;
      let totalRevenue = 0;
      let lastActive: Date | null = null;
      let freeCount = 0;
      let paidCount = 0;

      for (const sale of seller.sales) {
        const { sellerComm: comm } = resolveCommissions(
          sale.installationType as "FREE" | "PAID",
          sale.planRef.price,
          seller.commissionRule ?? null,
          config
        );
        if (sale.currency === "USD") commissionUSD += comm;
        else commissionBCV += comm;
        totalRevenue += sale.planRef.price;
        if (sale.installationType === "FREE") freeCount++;
        else paidCount++;
        if (!lastActive || sale.transactionDate > lastActive) {
          lastActive = sale.transactionDate;
        }
      }

      return {
        id: seller.id,
        sellerName: seller.name,
        pin: seller.pin,
        commissionRuleId: seller.commissionRuleId,
        commissionRuleName: seller.commissionRule?.name ?? null,
        totalSales: seller._count.sales,
        freeCount,
        paidCount,
        totalRevenue,
        commissionUSD,
        commissionBCV,
        lastActive,
      };
    })
    .filter((s) => s.totalSales > 0)
    .sort((a, b) => b.totalSales - a.totalSales);
}

// ── Seller Detail (week-filtered) ──

export async function getSellerDetail(sellerId: number, weekStart?: string, weekEnd?: string) {
  const seller = await prisma.seller.findUnique({
    where: { id: sellerId },
    select: { name: true, commissionRule: true },
  });
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

  const sellerRule = seller.commissionRule ?? null;

  for (const sale of sales) {
    totalSales++;
    const { sellerComm: comm } = resolveCommissions(
      sale.installationType as "FREE" | "PAID",
      sale.planRef.price,
      sellerRule,
      config
    );
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
    transactions: sales.map((s) => {
      const { sellerComm, installerComm } = resolveCommissions(
        s.installationType as "FREE" | "PAID",
        s.planRef.price,
        sellerRule,
        config
      );
      return {
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
        installationFee: s.installationFee,
        sellerCommission: sellerComm,
        installerCommission: installerComm,
        expectedPrice: s.planRef.price ?? null,
      };
    }),
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
  const [detail, bcv] = await Promise.all([
    getSellerDetail(sellerId, weekStart, weekEnd),
    getBcvRate(),
  ]);
  const pdfBuffer = generateSellerPdf({
    ...detail,
    weekLabel,
    bcvRate: bcv.rate,
  });
  return pdfBuffer.toString("base64");
}

// ── Bulk Seller Reports ──

export async function getSellersSummaryForWeek(weekStart: string, weekEnd: string) {
  const sellers = await prisma.seller.findMany({
    include: {
      sales: {
        where: {
          transactionDate: { gte: new Date(weekStart), lte: new Date(weekEnd) },
        },
        select: { id: true },
      },
    },
  });

  return sellers
    .filter((s) => s.sales.length > 0)
    .map((s) => ({ id: s.id, name: s.name, salesCount: s.sales.length }))
    .sort((a, b) => b.salesCount - a.salesCount);
}

export async function generateAllSellerReports(
  weekStart: string,
  weekEnd: string,
  weekLabel: string
) {
  await requireAdmin();
  const { generateAllSellersPdf } = await import("./generate-pdf");

  const sellers = await getSellersSummaryForWeek(weekStart, weekEnd);
  if (sellers.length === 0) throw new Error("No sellers with sales in this week");

  const bcv = await getBcvRate();
  const allData = [];
  for (const seller of sellers) {
    const detail = await getSellerDetail(seller.id, weekStart, weekEnd);
    if (detail.totalSales === 0) continue;
    allData.push({ ...detail, weekLabel, bcvRate: bcv.rate });
  }

  const pdfBuffer = generateAllSellersPdf(allData);
  return pdfBuffer.toString("base64");
}

export async function generateWeeklySummary(
  weekStart: string,
  weekEnd: string,
  weekLabel: string
) {
  await requireAdmin();
  const { generateWeeklySummaryPdf } = await import("./generate-pdf");

  const config = await getCommissionConfig();
  const bcv = await getBcvRate();

  const sellersRaw = await prisma.seller.findMany({
    include: {
      sales: {
        where: {
          transactionDate: { gte: new Date(weekStart), lte: new Date(weekEnd) },
        },
        include: { planRef: { select: { price: true } } },
      },
      commissionRule: true,
    },
  });

  let totalInstallerCommUSD = 0;
  let totalInstallerCommBCV = 0;

  const sellers = sellersRaw
    .filter((s) => s.sales.length > 0)
    .map((s) => {
      let commUSD = 0, commBCV = 0, freeCount = 0, paidCount = 0;
      for (const sale of s.sales) {
        const { sellerComm, installerComm } = resolveCommissions(
          sale.installationType as "FREE" | "PAID",
          sale.planRef.price,
          s.commissionRule ?? null,
          config
        );
        if (sale.currency === "USD") {
          commUSD += sellerComm;
          totalInstallerCommUSD += installerComm;
        } else {
          commBCV += sellerComm;
          totalInstallerCommBCV += installerComm;
        }
        if (sale.installationType === "FREE") freeCount++;
        else paidCount++;
      }
      return {
        sellerName: s.name,
        totalSales: s.sales.length,
        freeCount,
        paidCount,
        commissionUSD: commUSD,
        commissionBCV: commBCV,
      };
    })
    .sort((a, b) => b.totalSales - a.totalSales);

  if (sellers.length === 0) throw new Error("No hay vendedores con ventas en esta semana");

  const pdfBuffer = generateWeeklySummaryPdf({
    weekLabel,
    bcvRate: bcv.rate,
    sellers,
    installerCommissionUSD: totalInstallerCommUSD,
    installerCommissionBCV: totalInstallerCommBCV,
  });
  return pdfBuffer.toString("base64");
}

// ── All Installations ──

export interface InstallationsFilters {
  search?: string;
  seller?: string;
  zone?: string;
  zones?: string[];
  currency?: Currency;
  installationType?: InstallationType;
  startDate?: string;
  endDate?: string;
}

export async function getAllInstallations(filters: InstallationsFilters) {
  const where: Record<string, unknown> = {};

  if (filters.seller) where.sellerName = filters.seller;
  if (filters.zones && filters.zones.length > 0) {
    where.zone = { in: filters.zones };
  } else if (filters.zone) {
    where.zone = filters.zone;
  }
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

  const [sales, config, ruleMap] = await Promise.all([
    prisma.sale.findMany({
      where,
      orderBy: { transactionDate: "desc" },
      include: { planRef: { select: { price: true } } },
    }),
    getCommissionConfig(),
    buildSellerRuleMap(),
  ]);

  return sales.map((sale) => {
    const { sellerComm, installerComm } = resolveCommissions(
      sale.installationType as "FREE" | "PAID",
      sale.planRef.price,
      ruleMap.get(sale.sellerName) ?? null,
      config
    );
    return {
      ...sale,
      sellerCommission: sellerComm,
      installerCommission: installerComm,
      expectedPrice: sale.planRef.price ?? null,
      planRef: undefined,
    };
  });
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
  installationFee?: number;
}) {
  if (!data.paymentMethod?.trim()) throw new Error("Payment method is required");

  const seller = await prisma.seller.findUnique({ where: { id: data.sellerId }, select: { name: true } });
  if (!seller) throw new Error("Seller not found");

  const plan = await prisma.plan.findUnique({ where: { id: data.planId }, select: { name: true } });
  if (!plan) throw new Error("Plan not found");

  const sale = await prisma.sale.create({
    data: {
      transactionDate: new Date(data.transactionDate + "T12:00:00.000Z"),
      customerName: data.customerName,
      sellerName: seller.name,
      zone: data.zone,
      plan: plan.name,
      paymentMethod: data.paymentMethod,
      referenceCode: data.referenceCode || null,
      installationType: data.installationType,
      currency: data.currency,
      subscriptionAmount: data.subscriptionAmount,
      installationFee: data.installationType === "PAID" ? (data.installationFee ?? null) : null,
      sellerRef: { connect: { id: data.sellerId } },
      planRef: { connect: { id: data.planId } },
    },
  });

  return sale.id;
}

// ── Installer Report Actions ──

export async function getInstallerReport(filters: SalesFilters) {
  const where = buildWhere(filters);
  const [sales, config, ruleMap] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: { planRef: { select: { price: true } } },
    }),
    getCommissionConfig(),
    buildSellerRuleMap(),
  ]);

  let totalInstallations = 0;
  let freeInstallations = 0;
  let paidInstallations = 0;
  let commissionUSD = 0;
  let commissionBCV = 0;

  for (const sale of sales) {
    const { installerComm } = resolveCommissions(
      sale.installationType as "FREE" | "PAID",
      sale.planRef.price,
      ruleMap.get(sale.sellerName) ?? null,
      config
    );
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
    installationFee?: number;
  }
) {
  await requireAdmin();
  const seller = await prisma.seller.findUnique({ where: { id: data.sellerId }, select: { name: true } });
  if (!seller) throw new Error("Seller not found");

  const plan = await prisma.plan.findUnique({ where: { id: data.planId }, select: { name: true } });
  if (!plan) throw new Error("Plan not found");

  await prisma.sale.update({
    where: { id },
    data: {
      transactionDate: new Date(data.transactionDate + "T12:00:00.000Z"),
      customerName: data.customerName,
      sellerName: seller.name,
      zone: data.zone,
      plan: plan.name,
      paymentMethod: data.paymentMethod,
      referenceCode: data.referenceCode || null,
      installationType: data.installationType,
      currency: data.currency,
      subscriptionAmount: data.subscriptionAmount,
      installationFee: data.installationType === "PAID" ? (data.installationFee ?? null) : null,
      sellerId: data.sellerId,
      planId: data.planId,
    },
  });
}

export async function deleteInstallation(id: number) {
  await requireAdmin();
  await prisma.sale.delete({ where: { id } });
}
