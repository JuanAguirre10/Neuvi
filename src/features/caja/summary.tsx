import type { PaymentMethod } from "@prisma/client";
import {
  ArrowRightLeft,
  Banknote,
  CircleDollarSign,
  CreditCard,
  HandCoins,
  Receipt,
  Smartphone,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PAYMENT_METHOD_LABEL, formatPEN } from "@/lib/format";
import { cn } from "@/lib/utils";

export const METHOD_ICON: Record<PaymentMethod, LucideIcon> = {
  EFECTIVO: Banknote,
  YAPE: Smartphone,
  PLIN: Smartphone,
  TRANSFERENCIA: ArrowRightLeft,
  TARJETA: CreditCard,
  OTRO: CircleDollarSign,
};

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "blue",
}: {
  label: string;
  value: string;
  hint?: React.ReactNode;
  icon: LucideIcon;
  tone?: "blue" | "teal" | "amber";
}) {
  return (
    <Card size="sm" className="gap-2">
      <CardContent className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-2xl font-semibold tracking-tight text-brand-navy-deep sm:text-[1.7rem]">
            {value}
          </p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            tone === "blue" && "bg-info-soft text-primary",
            tone === "teal" && "bg-success-soft text-success",
            tone === "amber" && "bg-warning-soft text-warning",
          )}
        >
          <Icon className="size-[18px]" />
        </span>
      </CardContent>
    </Card>
  );
}

export function CashStats({
  totalCents,
  count,
  receivableCents,
  receivableCount,
}: {
  totalCents: number;
  count: number;
  receivableCents: number;
  receivableCount: number;
}) {
  const average = count > 0 ? Math.round(totalCents / count) : 0;
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <StatTile label="Total cobrado" value={formatPEN(totalCents)} hint="En el periodo seleccionado" icon={Wallet} tone="teal" />
      <StatTile
        label="Pagos registrados"
        value={String(count)}
        hint={count > 0 ? `Ticket promedio ${formatPEN(average)}` : "Sin pagos en el periodo"}
        icon={Receipt}
      />
      <StatTile
        label="Por cobrar"
        value={formatPEN(receivableCents)}
        hint={
          receivableCount === 0
            ? "No hay saldos pendientes"
            : `${receivableCount} paquete${receivableCount === 1 ? "" : "s"} con saldo (a la fecha)`
        }
        icon={HandCoins}
        tone="amber"
      />
    </div>
  );
}

/** Cobrado por método: monto, cantidad y participación (medidor de un solo tono). */
export function MethodBreakdown({
  totalCents,
  byMethod,
}: {
  totalCents: number;
  byMethod: { method: PaymentMethod; totalCents: number; count: number }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-semibold text-brand-navy-deep">Cobrado por método de pago</CardTitle>
        <CardDescription>Monto y número de pagos de cada método en el periodo.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {byMethod.map(({ method, totalCents: amount, count }) => {
            const Icon = METHOD_ICON[method];
            const pct = totalCents > 0 ? Math.round((amount / totalCents) * 100) : 0;
            return (
              <li key={method} className="grid gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-medium text-brand-navy">
                    <Icon className="size-4 text-muted-foreground" />
                    {PAYMENT_METHOD_LABEL[method]}
                  </span>
                  <span className="text-sm font-semibold text-brand-navy-deep tabular-nums">{formatPEN(amount)}</span>
                </div>
                <div
                  className="h-1.5 overflow-hidden rounded-full bg-chart-1/15"
                  role="meter"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pct}
                  aria-label={`${PAYMENT_METHOD_LABEL[method]}: ${pct}% del total`}
                >
                  <div className="h-full rounded-full bg-chart-1" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {count} pago{count === 1 ? "" : "s"} · {pct}% del total
                </p>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
