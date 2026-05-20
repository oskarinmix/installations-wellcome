export const cmd = {
  showSystem: () => "show version",
  showOnuAuthInfo: () => "show onu auth-info all",
  showOnuStatus: () => "show onu status all",
  showOnuOptical: () => "show onu opm-diag all",
  showDiscoveredOnus: () => "show onu discover",
  showOnuDetail: (pon: string, idx: number) =>
    `show gpon onu detail-info gpon-onu_${pon}:${idx}`,
  rebootOnu: (pon: string, idx: number) => `reset gpon-onu_${pon}:${idx}`,
  authorizeOnu: (pon: string, idx: number, sn: string, profile: string) =>
    `interface gpon 0/${pon.split("/")[1]}\nonu ${idx} type ${profile} sn ${sn}\nend`,
};

export const validate = {
  ponPort: (s: string) => /^EPON\d+\/\d+$/.test(s),
  onuIndex: (n: number) => Number.isInteger(n) && n >= 0 && n < 1024,
  serial: (s: string) => /^[A-Za-z0-9]{8,20}$/.test(s),
  profile: (s: string) => /^[A-Za-z0-9_-]{1,32}$/.test(s),
};
