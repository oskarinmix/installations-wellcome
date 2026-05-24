import type { OpticalInfo } from "../types";

const ROW_RE =
  /^(EPON(\d+\/\d+):(\d+))\s+(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s+(-?\d+\.?\d*)/;

function num(s: string): number | null {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

export function parseOpticalInfo(stdout: string): OpticalInfo[] {
  const out: OpticalInfo[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    const m = ROW_RE.exec(line.trim());
    if (!m) continue;
    const [, onuId, ponPortDigits, idxStr, temp, volt, bias, tx, rx] = m;
    out.push({
      onuId,
      ponPort: `EPON${ponPortDigits}`,
      onuIndex: parseInt(idxStr, 10),
      temperatureC: num(temp),
      voltageV: num(volt),
      txBiasCurrentMa: num(bias),
      txOnuDbm: num(tx),
      rxOnuDbm: num(rx),
    });
  }
  return out;
}
