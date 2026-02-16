import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import "dotenv/config";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const PLANS = [
  { name: "RESIDENCIAL 100", price: 20 },
  { name: "RESIDENCIAL 200", price: 25 },
  { name: "RESIDENCIAL 400", price: 35 },
  { name: "RESIDENCIAL 600", price: 55 },
  { name: "RESIDENCIAL 800", price: 75 },
  { name: "PYME 100", price: 100 },
];

async function main() {
  for (const plan of PLANS) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: { price: plan.price },
      create: plan,
    });
  }
  console.log(`Seeded ${PLANS.length} plans`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
