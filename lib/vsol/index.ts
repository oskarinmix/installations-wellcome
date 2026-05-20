import { runCommand } from "@/lib/ssh/executor";
import { cmd, validate } from "./commands";
import { parseOnuAuthInfo } from "./parsers/onu-auth-info";
import { parseOnuStatus } from "./parsers/onu-status";
import { parseOpticalInfo } from "./parsers/optical-info";
import { parseOnuDetail } from "./parsers/onu-detail";
import { parseSystemInfo } from "./parsers/system-info";
import { parseUnauthOnus } from "./parsers/unauth-onus";
import type {
  OnuListItem, OpticalInfo, OnuDetail, SystemInfo, UnauthOnu,
} from "./types";

function assertPon(pon: string) {
  if (!validate.ponPort(pon)) throw new Error(`invalid pon port: ${pon}`);
}
function assertIdx(i: number) {
  if (!validate.onuIndex(i)) throw new Error(`invalid onu index: ${i}`);
}

export async function listOnus(oltId: string): Promise<OnuListItem[]> {
  const [authOut, statusOut, opticalOut] = await Promise.all([
    runCommand(oltId, cmd.showOnuAuthInfo()),
    runCommand(oltId, cmd.showOnuStatus()),
    runCommand(oltId, cmd.showOnuOptical()),
  ]);

  const authRows = parseOnuAuthInfo(authOut);
  const statusRows = parseOnuStatus(statusOut);
  const optRows = parseOpticalInfo(opticalOut);

  const distByOnuId = new Map(
    statusRows.map((r) => [`${r.ponPort}:${r.onuIndex}`, r.distance]),
  );
  const optByOnuId = new Map(
    optRows.map((r) => [r.onuId, r]),
  );

  return authRows.map((a) => {
    const onuId = `${a.ponPort}:${a.onuIndex}`;
    const opt = optByOnuId.get(onuId);
    return {
      ponPort: a.ponPort,
      onuIndex: a.onuIndex,
      serialNumber: a.mac,
      name: a.name,
      model: null,
      onuType: a.onuType,
      status: a.status,
      distance: distByOnuId.get(onuId) ?? null,
      rxPowerDbm: opt?.rxOnuDbm ?? null,
      txPowerDbm: opt?.txOnuDbm ?? null,
      txBiasCurrentMa: opt?.txBiasCurrentMa ?? null,
      temperatureC: opt?.temperatureC ?? null,
      voltageV: opt?.voltageV ?? null,
    };
  });
}

export async function getAllOpticalInfo(oltId: string): Promise<OpticalInfo[]> {
  const out = await runCommand(oltId, cmd.showOnuOptical());
  return parseOpticalInfo(out);
}

export async function getOpticalInfo(
  oltId: string, pon: string, idx: number,
): Promise<OpticalInfo | null> {
  assertPon(pon); assertIdx(idx);
  const all = await getAllOpticalInfo(oltId);
  return all.find((o) => o.ponPort === pon && o.onuIndex === idx) ?? null;
}

export async function getOnuDetail(
  oltId: string, pon: string, idx: number,
): Promise<OnuDetail> {
  assertPon(pon); assertIdx(idx);
  const out = await runCommand(oltId, cmd.showOnuDetail(pon, idx));
  return parseOnuDetail(out);
}

export async function getSystemInfo(oltId: string): Promise<SystemInfo> {
  const out = await runCommand(oltId, cmd.showSystem());
  return parseSystemInfo(out);
}

export async function listUnauthOnus(oltId: string): Promise<UnauthOnu[]> {
  const out = await runCommand(oltId, cmd.showDiscoveredOnus());
  return parseUnauthOnus(out);
}

export async function rebootOnu(
  oltId: string, pon: string, idx: number,
): Promise<void> {
  assertPon(pon); assertIdx(idx);
  await runCommand(oltId, cmd.rebootOnu(pon, idx));
}

export async function authorizeOnu(
  oltId: string, pon: string, idx: number, sn: string, profile: string,
): Promise<void> {
  assertPon(pon); assertIdx(idx);
  if (!validate.serial(sn)) throw new Error("invalid sn");
  if (!validate.profile(profile)) throw new Error("invalid profile");
  await runCommand(oltId, cmd.authorizeOnu(pon, idx, sn, profile));
}
