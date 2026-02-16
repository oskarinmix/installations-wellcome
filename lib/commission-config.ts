export interface PlanPrice {
  name: string;
  price: number;
  currency: "USD";
}

export const PLAN_PRICES: PlanPrice[] = [
  { name: "RESIDENTIAL 100", price: 20, currency: "USD" },
  { name: "RESIDENTIAL 200", price: 25, currency: "USD" },
  { name: "RESIDENTIAL 400", price: 35, currency: "USD" },
  { name: "RESIDENTIAL 600", price: 55, currency: "USD" },
  { name: "RESIDENTIAL 800", price: 75, currency: "USD" },
];

export const PLAN_PRICE_MAP: Record<string, number> = Object.fromEntries(
  PLAN_PRICES.map((p) => [p.name.toUpperCase(), p.price])
);

export function getPlanExpectedPrice(planName: string): number | null {
  const normalized = planName.toUpperCase().trim();
  return PLAN_PRICE_MAP[normalized] ?? null;
}
