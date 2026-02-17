import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest } from "next/server";

const handler = toNextJsHandler(auth);

export async function GET(req: NextRequest) {
  console.log(`[AUTH GET] ${req.nextUrl.pathname}`);
  return handler.GET(req);
}

export async function POST(req: NextRequest) {
  const url = req.nextUrl.pathname;
  console.log(`[AUTH POST] ${url}`);
  console.log(`[AUTH POST] BETTER_AUTH_URL=${process.env.BETTER_AUTH_URL ?? "NOT SET"}`);
  console.log(`[AUTH POST] DATABASE_URL set: ${!!process.env.DATABASE_URL}`);

  try {
    const start = Date.now();
    const res = await handler.POST(req);
    console.log(`[AUTH POST] ${url} completed in ${Date.now() - start}ms — status ${res.status}`);
    return res;
  } catch (err) {
    console.error(`[AUTH POST] ${url} ERROR:`, err);
    throw err;
  }
}
