import type { OnuListItem } from "../types";

// Matches: EPON0/2:1   VSOL   V222   4CD7C8EF59DF   V4.1   V2.1.06-240506   HGU   2GE+2WiFi
const ROW_RE =
  /^(EPON(\d+\/\d+):(\d+))\s+(\S+)\s+(\S+)\s+([0-9A-Fa-f]{12})\s+\S+\s+\S+\s+(\S+)/;

export function parseOnuList(stdout: string): OnuListItem[] {
  const out: OnuListItem[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    const m = ROW_RE.exec(line.trim());
    if (!m) continue;
    const [, , ponPort, idxStr, , model, mac, onuType] = m;
    out.push({
      ponPort,
      onuIndex: parseInt(idxStr, 10),
      serialNumber: mac,
      model,
      onuType,
      name: null,
      status: "offline",
      distance: null,
      rxPowerDbm: null,
      txPowerDbm: null,
      txBiasCurrentMa: null,
      temperatureC: null,
      voltageV: null,
    });
  }
  return out;
}
