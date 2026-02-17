import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  console.log("[PRISMA] Creating pg.Pool...", {
    hasDbUrl: !!process.env.DATABASE_URL,
    dbHost: process.env.DATABASE_URL?.match(/@([^:/]+)/)?.[1] ?? "unknown",
  });
  const dbUrl = process.env.DATABASE_URL ?? "";
  const needsSsl = dbUrl.includes("sslmode=require") || dbUrl.includes("sslmode=verify");
  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: needsSsl ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000,
  });
  pool.on("error", (err) => console.error("[PRISMA] Pool error:", err.message));
  pool.on("connect", () => console.log("[PRISMA] Pool connected successfully"));
  const adapter = new PrismaPg(pool);
  console.log("[PRISMA] PrismaClient created with pg adapter");
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
