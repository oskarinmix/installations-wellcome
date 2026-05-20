"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { getSystemInfo } from "@/lib/vsol";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const OltInput = z.object({
  name: z.string().min(1).max(64),
  host: z.string().min(1).max(255),
  port: z.coerce.number().int().min(1).max(65535).default(22),
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(255),
});

export async function createOlt(
  input: z.infer<typeof OltInput>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = OltInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  try {
    const olt = await prisma.olt.create({
      data: { ...parsed.data, password: encrypt(parsed.data.password) },
    });
    revalidatePath("/olt/olts");
    return { ok: true, data: { id: olt.id } };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function updateOlt(
  id: string, input: Partial<z.infer<typeof OltInput>>,
): Promise<ActionResult> {
  try {
    const data: Record<string, unknown> = { ...input };
    if (input.password) data.password = encrypt(input.password);
    await prisma.olt.update({ where: { id }, data });
    revalidatePath("/olt/olts");
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function deleteOlt(id: string): Promise<ActionResult> {
  try {
    await prisma.olt.delete({ where: { id } });
    revalidatePath("/olt/olts");
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function testConnection(id: string): Promise<ActionResult<{ version: string | null }>> {
  try {
    const sys = await getSystemInfo(id);
    return { ok: true, data: { version: sys.swVersion } };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
