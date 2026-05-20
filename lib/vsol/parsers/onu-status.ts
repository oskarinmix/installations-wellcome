import type { OnuStatus } from "../types";

export interface OnuStatusRow {
  ponPort: string;
  onuIndex: number;
  mac: string;
  status: OnuStatus;
  distance: number | null;
}

// Matches: EPON0/2:1   online   4c:d7:c8:ef:59:df   2442   ...
const ROW_RE =
  /^(EPON(\d+\/\d+)):(\d+)\s+(online|offline)\s+((?:[0-9a-f]{2}:){5}[0-9a-f]{2})\s+(\d+)/i;

export function normalizeMac(mac: string): string {
  return mac.replace(/:/g, "").toUpperCase();
}

export function parseOnuStatus(stdout: string): OnuStatusRow[] {
  const out: OnuStatusRow[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    const m = ROW_RE.exec(line.trim());
    if (!m) continue;
    const [, ponPort, , idxStr, status, mac, distStr] = m;
    out.push({
      ponPort,
      onuIndex: parseInt(idxStr, 10),
      mac: normalizeMac(mac),
      status: status.toLowerCase() as OnuStatus,
      distance: parseInt(distStr, 10),
    });
  }
  return out;
}
