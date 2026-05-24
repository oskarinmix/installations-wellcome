import { runCommand } from "@/lib/ssh/executor";
import { cmd, validate } from "./commands";
import { parseOnuAuthInfo } from "./parsers/onu-auth-info";
import { parseOnuStatus } from "./parsers/onu-status";
import { parseOpticalInfo } from "./parsers/optical-info";
import { parseOnuBasicInfo } from "./parsers/onu-basic-info";
import { parseSyslog } from "./parsers/syslog";
import { parseSystemInfo } from "./parsers/system-info";
import { parseUnauthOnus } from "./parsers/unauth-onus";
import type {
  OnuListItem, OpticalInfo, OnuDetail, SystemInfo, UnauthOnu, SyslogEntry,
} from "./types";

function assertPon(pon: string) {
  if (!validate.ponPort(pon)) throw new Error(`invalid pon port: ${pon}`);
}
function assertIdx(i: number) {
  if (!validate.onuIndex(i)) throw new Error(`invalid onu index: ${i}`);
}

export async function listOnus(oltId: string): Promise<OnuListItem[]> {
  const [authOut, statusOut, opticalOut] = await Promise.all([
    runCommand(oltId, cmd.showOnuAuthInfo(), 45_000),
    runCommand(oltId, cmd.showOnuStatus(), 45_000),
    runCommand(oltId, cmd.showOnuOptical(), 45_000),
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
  const [basicOut, statusOut] = await Promise.all([
    runCommand(oltId, cmd.showOnuBasicInfo(), 30_000),
    runCommand(oltId, cmd.showOnuStatus(), 30_000),
  ]);
  const basic = parseOnuBasicInfo(basicOut).find(r => r.ponPort === pon && r.onuIndex === idx);
  const status = parseOnuStatus(statusOut).find(r => r.ponPort === pon && r.onuIndex === idx);
  return {
    serialNumber: basic?.serialNumber ?? "",
    model: basic?.model ?? null,
    firmware: basic?.firmware ?? null,
    uptimeSec: null,
    distance: status?.distance ?? null,
    lastRegAt: status?.lastRegAt ?? null,
    lastDeregAt: status?.lastDeregAt ?? null,
    deregReason: status?.deregReason ?? null,
  };
}

export async function getOnuSyslog(oltId: string, mac: string): Promise<SyslogEntry[]> {
  const out = await runCommand(oltId, cmd.showSyslog(), 20_000);
  return parseSyslog(out).filter(e => e.mac === mac);
}

export async function getAllSyslog(oltId: string): Promise<SyslogEntry[]> {
  const out = await runCommand(oltId, cmd.showSyslog(), 20_000);
  return parseSyslog(out);
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
