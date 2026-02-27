export const PAYMENT_METHODS = [
  { value: "ZELLE",       currency: "USD" as const },
  { value: "EFECTIVO",    currency: "USD" as const },
  { value: "EFECTIVO BS", currency: "BCV" as const },
  { value: "PAGO MOVIL",  currency: "BCV" as const },
  { value: "MIXTO",       currency: "BCV" as const },
] satisfies { value: string; currency: "USD" | "BCV" }[];

/** Derive currency from any payment method string (case/space insensitive). */
export function currencyFromPaymentMethod(method: string): "USD" | "BCV" {
  const normalized = method.toUpperCase().trim().replace(/\s+/g, " ");
  const match = PAYMENT_METHODS.find((p) => p.value === normalized);
  if (match) return match.currency;
  // Fallback for accent variants from Excel ("PAGO MÓVIL", "EFECTIVO BOLÍVARES", etc.)
  const stripped = normalized.replace(/\s+/g, "");
  if (stripped === "ZELLE" || stripped === "EFECTIVO") return "USD";
  return "BCV";
}
