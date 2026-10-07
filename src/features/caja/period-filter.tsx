import Link from "next/link";
import Form from "next/form";
import { CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { PERIOD_OPTIONS, type CashPeriod } from "./period";

/** Fila de filtros de la caja: presets + rango personalizado (GET, sin JS obligatorio). */
export function PeriodFilter({ period, basePath = "/app/pagos" }: { period: CashPeriod; basePath?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <nav
        aria-label="Periodo"
        className="inline-flex w-full overflow-x-auto rounded-lg bg-muted p-[3px] sm:w-fit"
      >
        {PERIOD_OPTIONS.map((opt) => {
          const active = opt.value === period.kind;
          const href = opt.value === "personalizado"
            ? `${basePath}?periodo=personalizado&desde=${period.from}&hasta=${period.to}`
            : `${basePath}?periodo=${opt.value}`;
          return (
            <Link
              key={opt.value}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-center text-sm font-medium whitespace-nowrap transition-colors sm:flex-none",
                active ? "bg-background text-brand-navy-deep shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </Link>
          );
        })}
      </nav>

      {period.kind === "personalizado" ? (
        <Form action={basePath} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="periodo" value="personalizado" />
          <div className="grid gap-1">
            <Label htmlFor="desde" className="text-xs text-muted-foreground">
              Desde
            </Label>
            <Input id="desde" name="desde" type="date" defaultValue={period.from} className="h-8 w-40" />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="hasta" className="text-xs text-muted-foreground">
              Hasta
            </Label>
            <Input id="hasta" name="hasta" type="date" defaultValue={period.to} className="h-8 w-40" />
          </div>
          <Button type="submit" variant="outline">
            <CalendarRange /> Aplicar
          </Button>
        </Form>
      ) : null}
    </div>
  );
}
