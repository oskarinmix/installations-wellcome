export type OnuStatus = "online" | "offline" | "los" | "unauth";

export interface OnuListItem {
  serialNumber: string;
  ponPort: string;
  onuIndex: number;
  name: string | null;
  model: string | null;
  onuType: string | null;
  status: OnuStatus;
  distance: number | null;
  rxPowerDbm: number | null;
  txPowerDbm: number | null;
  txBiasCurrentMa: number | null;
  temperatureC: number | null;
  voltageV: number | null;
}

export interface OpticalInfo {
  onuId: string;
  ponPort: string;
  onuIndex: number;
  temperatureC: number | null;
  voltageV: number | null;
  txBiasCurrentMa: number | null;
  txOnuDbm: number | null;
  rxOnuDbm: number | null;
}

export interface PonPortSummary {
  ponPort: string;
  totalOnus: number;
  onlineOnus: number;
}

export interface OnuDetail {
  serialNumber: string;
  model: string | null;
  firmware: string | null;
  uptimeSec: number | null;
  distance: number | null;
}

export interface SystemInfo {
  serial: string | null;
  model: string | null;
  hwVersion: string | null;
  swVersion: string | null;
}

export interface UnauthOnu {
  serialNumber: string;
  ponPort: string;
  model: string | null;
}

export class ParseError extends Error {
  constructor(msg: string, public readonly raw: string) {
    super(msg);
    this.name = "ParseError";
  }
}
