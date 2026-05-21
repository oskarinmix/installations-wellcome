"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface BalanceCardsProps {
  usd: number;
  bcv: number;
  activeCurrency: "USD" | "BCV" | null;
  onSelect: (currency: "USD" | "BCV" | null) => void;
}

export function BalanceCards({ usd, bcv, activeCurrency, onSelect }: BalanceCardsProps) {
  function handleClick(currency: "USD" | "BCV") {
    onSelect(activeCurrency === currency ? null : currency);
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card
        role="button"
        tabIndex={0}
        className={cn(
          "cursor-pointer transition-all hover:shadow-md",
          activeCurrency === "USD" && "ring-2 ring-blue-500"
        )}
        onClick={() => handleClick("USD")}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick("USD"); } }}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Saldo USD
          </CardTitle>
          <span className="text-lg">💵</span>
        </CardHeader>
        <CardContent>
          <div className={cn("text-2xl font-bold", usd < 0 && "text-red-500")}>
            ${usd.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Click para filtrar</p>
        </CardContent>
      </Card>

      <Card
        role="button"
        tabIndex={0}
        className={cn(
          "cursor-pointer transition-all hover:shadow-md",
          activeCurrency === "BCV" && "ring-2 ring-green-500"
        )}
        onClick={() => handleClick("BCV")}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick("BCV"); } }}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Saldo BCV (Bs.)
          </CardTitle>
          <span className="text-lg">💰</span>
        </CardHeader>
        <CardContent>
          <div className={cn("text-2xl font-bold", bcv < 0 && "text-red-500")}>
            Bs. {bcv.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Click para filtrar</p>
        </CardContent>
      </Card>
    </div>
  );
}
