import type { SyslogEntry } from "../types";

const LINE_RE = /^(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2})\s+(\S+)\s+(.+?)\s{2,}(.*)/;

const ONU_MSG_RE =
  /PON (\d+\/\d+) ONU (\d+)(?:\s+llid\s+\d+)?\s+((?:[0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2})(.*)/i;

function parseDate(s: string): Date {
  return new Date(s.replace(/\//g, "-").replace(" ", "T"));
}

function normalizeMac(mac: string): string {
  return mac.replace(/:/g, "").toUpperCase();
}

export function parseSyslog(stdout: string): SyslogEntry[] {
  const out: SyslogEntry[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    const m = LINE_RE.exec(line.trim());
    if (!m) continue;
    const [, tsStr, level, event, message] = m;

    let ponPort: string | null = null;
    let onuIndex: number | null = null;
    let mac: string | null = null;
    let deregReason: string | null = null;

    const onuM = ONU_MSG_RE.exec(message);
    if (onuM) {
      ponPort = `EPON${onuM[1]}`;
      onuIndex = parseInt(onuM[2], 10);
      mac = normalizeMac(onuM[3]);
      const rest = onuM[4].trim().replace(/\.$/, "").trim();
      if (rest) deregReason = rest;
    }

    out.push({ timestamp: parseDate(tsStr), level, event, message, ponPort, onuIndex, mac, deregReason });
  }
  return out;
}
