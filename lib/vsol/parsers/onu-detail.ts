import type { OnuDetail } from "../types";

function match(s: string, re: RegExp): string | null {
  const m = re.exec(s); return m ? m[1].trim() : null;
}

export function parseOnuDetail(stdout: string): OnuDetail {
  const sn = match(stdout, /SN[:\s]+([A-Za-z0-9]+)/i) ?? "";
  const model = match(stdout, /(?:Model|Equipment ID)[:\s]+(\S+)/i);
  const firmware = match(stdout, /(?:Firmware|SW Version)[:\s]+(\S+)/i);
  const uptimeStr = match(stdout, /Online Duration[:\s]+(\S+)/i);
  const distance = match(stdout, /Distance[:\s]+(\d+)/i);
  return {
    serialNumber: sn,
    model,
    firmware,
    uptimeSec: uptimeStr ? parseUptime(uptimeStr) : null,
    distance: distance ? parseInt(distance, 10) : null,
  };
}

function parseUptime(s: string): number | null {
  const dhms = /(\d+)d(\d+)h(\d+)m(\d+)s/.exec(s);
  if (dhms) {
    return (+dhms[1])*86400 + (+dhms[2])*3600 + (+dhms[3])*60 + (+dhms[4]);
  }
  const hms = /(\d+):(\d+):(\d+)/.exec(s);
  if (hms) {
    return (+hms[1])*3600 + (+hms[2])*60 + (+hms[3]);
  }
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}
