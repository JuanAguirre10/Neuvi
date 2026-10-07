import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type KpiDelta = {
  /** Diferencia ya formateada, con signo: "+12 %", "−3", "+S/ 450.00" */
  text: string;
  direction: "up" | "down" | "flat";
  /** true si subir es bueno (ingresos), false si subir es malo (inasistencia). */
  upIsGood: boolean;
  /** "vs. agosto" */
  against: string;
};

export function KpiCard({
  label,
  value,
  hint,
  delta,
}: {
  label: string;
  value: string;
  hint?: React.ReactNode;
  delta?: KpiDelta;
}) {
  const good = delta && delta.direction !== "flat" && (delta.direction === "up") === delta.upIsGood;
  const bad = delta && delta.direction !== "flat" && !good;
  const Icon = delta?.direction === "up" ? ArrowUpRight : delta?.direction === "down" ? ArrowDownRight : Minus;

  return (
    <Card size="sm" className="gap-1">
      <CardContent>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-brand-navy-deep">{value}</p>
        {delta ? (
          <p className="mt-1.5 flex flex-wrap items-center gap-1 text-xs">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium",
                good && "bg-success-soft text-success",
                bad && "bg-danger-soft text-destructive",
                !good && !bad && "bg-muted text-muted-foreground",
              )}
            >
              <Icon className="size-3" aria-hidden />
              {delta.text}
            </span>
            <span className="text-muted-foreground">{delta.against}</span>
          </p>
        ) : null}
        {hint ? <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
