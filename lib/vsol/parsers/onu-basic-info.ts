export interface OnuBasicRow {
  onuId: string;
  ponPort: string;
  onuIndex: number;
  serialNumber: string;
  model: string | null;
  firmware: string | null;
}

const ROW_RE =
  /^(EPON(\d+\/\d+):(\d+))\s+\S+\s+(\S+)\s+([0-9A-Fa-f]{12})\s+\S+\s+(\S+)/;

export function parseOnuBasicInfo(stdout: string): OnuBasicRow[] {
  const out: OnuBasicRow[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    const m = ROW_RE.exec(line.trim());
    if (!m) continue;
    const [, onuId, ponPortDigits, idxStr, model, serial, firmware] = m;
    out.push({
      onuId,
      ponPort: `EPON${ponPortDigits}`,
      onuIndex: parseInt(idxStr, 10),
      serialNumber: serial.toUpperCase(),
      model: model || null,
      firmware: firmware || null,
    });
  }
  return out;
}
