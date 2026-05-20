import type { OnuStatus } from "../types";
import { normalizeMac } from "./onu-status";

export interface OnuAuthRow {
  ponPort: string;
  onuIndex: number;
  mac: string;
  status: OnuStatus;
  name: string | null;
  onuType: string | null;
  authorized: boolean;
}

// Captures: ONU-ID, LLID, status, MAC, RTT, then everything up to P:K:(Auth|Unauth)
const ROW_RE =
  /^(EPON(\d+\/\d+)):(\d+)\s+(-?\d+)\s+(online|offline)\s+((?:[0-9a-f]{2}:){5}[0-9a-f]{2})\s+\d+\s+(.+?)\s+P:K:(Auth|Unauth)/i;

// Splits the description+type chunk: type is always NxGE[+NWifi] at the end
const TYPE_RE = /(.*?)([124]GE(?:\+\d+WiFi)?)$/;

export function parseOnuAuthInfo(stdout: string): OnuAuthRow[] {
  const out: OnuAuthRow[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    const m = ROW_RE.exec(line.trim());
    if (!m) continue;
    const [, ponPort, , idxStr, , status, mac, chunk, authStr] = m;
    const typeMatch = TYPE_RE.exec(chunk.trim());
    const rawName = typeMatch ? typeMatch[1].trim() : null;
    const onuType = typeMatch ? typeMatch[2] : null;
    const name = rawName && rawName !== "N/A" && rawName !== "" ? rawName : null;
    out.push({
      ponPort,
      onuIndex: parseInt(idxStr, 10),
      mac: normalizeMac(mac),
      status: status.toLowerCase() as OnuStatus,
      name,
      onuType,
      authorized: authStr.toLowerCase() === "auth",
    });
  }
  return out;
}
