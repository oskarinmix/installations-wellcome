"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  listOnus, rebootOnu as rebootOnuCmd, authorizeOnu as authorizeOnuCmd,
} from "@/lib/vsol";
import type { ActionResult } from "./olt";

export async function refreshOnuList(oltId: string): Promise<ActionResult<{ count: number }>> {
  try {
    const onus = await listOnus(oltId);
    await prisma.$transaction([
      ...onus.map((o) =>
        prisma.onu.upsert({
          where: { oltId_serialNumber: { oltId, serialNumber: o.serialNumber } },
          create: {
            oltId,
            serialNumber: o.serialNumber,
            ponPort: o.ponPort,
            onuIndex: o.onuIndex,
            name: o.name,
            model: o.model,
            onuType: o.onuType,
            status: o.status,
            distance: o.distance,
            rxPowerDbm: o.rxPowerDbm,
            txPowerDbm: o.txPowerDbm,
            txBiasCurrentMa: o.txBiasCurrentMa,
            temperatureC: o.temperatureC,
            voltageV: o.voltageV,
            lastSeenAt: o.status === "online" ? new Date() : undefined,
          },
          update: {
            ponPort: o.ponPort,
            onuIndex: o.onuIndex,
            name: o.name,
            model: o.model,
            onuType: o.onuType,
            status: o.status,
            distance: o.distance,
            rxPowerDbm: o.rxPowerDbm,
            txPowerDbm: o.txPowerDbm,
            txBiasCurrentMa: o.txBiasCurrentMa,
            temperatureC: o.temperatureC,
            voltageV: o.voltageV,
            lastSeenAt: o.status === "online" ? new Date() : undefined,
          },
        }),
      ),
      prisma.listRefresh.upsert({
        where: { oltId },
        create: { oltId, onuCount: onus.length },
        update: { onuCount: onus.length, refreshedAt: new Date() },
      }),
    ]);
    revalidatePath("/olt/onus");
    return { ok: true, data: { count: onus.length } };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

const RebootInput = z.object({
  oltId: z.string().min(1),
  ponPort: z.string().regex(/^\d+\/\d+\/\d+$/),
  onuIndex: z.number().int().min(0),
});

export async function rebootOnu(input: z.infer<typeof RebootInput>): Promise<ActionResult> {
  const p = RebootInput.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.message };
  try {
    await rebootOnuCmd(p.data.oltId, p.data.ponPort, p.data.onuIndex);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

const AuthorizeInput = RebootInput.extend({
  serialNumber: z.string().regex(/^[A-Za-z0-9]{8,20}$/),
  profile: z.string().regex(/^[A-Za-z0-9_-]{1,32}$/),
});

export async function authorizeOnu(input: z.infer<typeof AuthorizeInput>): Promise<ActionResult> {
  const p = AuthorizeInput.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.message };
  try {
    await authorizeOnuCmd(p.data.oltId, p.data.ponPort, p.data.onuIndex, p.data.serialNumber, p.data.profile);
    revalidatePath("/olt/onus/unauth");
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
