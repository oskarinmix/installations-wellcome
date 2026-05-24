import type { OnuStatus } from "../types";

export interface OnuStatusRow {
  ponPort: string;
  onuIndex: number;
  mac: string;
  status: OnuStatus;
  distance: number | null;
  lastRegAt: Date | null;
  lastDeregAt: Date | null;
  deregReason: string | null;
}

const TS = String.raw`(?:N\/A|\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2})`;
const ROW_RE = new RegExp(
  String.raw`^(EPON(\d+\/\d+)):(\d+)\s+(online|offline)\s+((?:[0-9a-f]{2}:){5}[0-9a-f]{2})\s+(\d+)\s+\d+\s+(${TS})\s+(${TS})\s+(.*)`,
  "i",
);

export function normalizeMac(mac: string): string {
  return mac.replace(/:/g, "").toUpperCase();
}

function parseDateOrNull(s: string): Date | null {
  if (!s || s.toUpperCase() === "N/A") return null;
  return new Date(s.replace(/\//g, "-").replace(" ", "T"));
}

export function parseOnuStatus(stdout: string): OnuStatusRow[] {
  const out: OnuStatusRow[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    const m = ROW_RE.exec(line.trim());
    if (!m) continue;
    const [, ponPort, , idxStr, status, mac, distStr, lastRegStr, lastDeregStr, rest] = m;
    const reasonMatch = /^(.+?)\s{2,}/.exec(rest.trim());
    const raw = reasonMatch ? reasonMatch[1].trim() : rest.trim();
    const deregReason = raw && raw.toUpperCase() !== "N/A" ? raw : null;
    out.push({
      ponPort,
      onuIndex: parseInt(idxStr, 10),
      mac: normalizeMac(mac),
      status: status.toLowerCase() as OnuStatus,
      distance: parseInt(distStr, 10),
      lastRegAt: parseDateOrNull(lastRegStr),
      lastDeregAt: parseDateOrNull(lastDeregStr),
      deregReason,
    });
  }
  return out;
}
