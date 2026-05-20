import type { UnauthOnu } from "../types";

const LINE = /^\s*(\d+\/\d+\/\d+)\s+(\S+)\s*(.*)$/;

export function parseUnauthOnus(stdout: string): UnauthOnu[] {
  const out: UnauthOnu[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    if (/^\s*(Pon|Port|SN|---)/i.test(line)) continue;
    const m = LINE.exec(line);
    if (!m) continue;
    const [, pon, sn, rest] = m;
    if (!/^[A-Za-z0-9]{8,}$/.test(sn)) continue;
    out.push({
      ponPort: pon,
      serialNumber: sn,
      model: rest.trim() || null,
    });
  }
  return out;
}
