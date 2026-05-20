import type { SystemInfo } from "../types";

function str(s: string, re: RegExp): string | null {
  const m = re.exec(s); return m ? m[1].trim() : null;
}

export function parseSystemInfo(stdout: string): SystemInfo {
  return {
    serial:    str(stdout, /Olt Serial Number\s*:\s*(\S+)/i),
    model:     str(stdout, /Olt Device Model\s*:\s*(.+)$/im),
    hwVersion: str(stdout, /Hardware Version\s*:\s*(\S+)/i),
    swVersion: str(stdout, /Software Version\s*:\s*(\S+)/i),
  };
}
