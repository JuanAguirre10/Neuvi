import Link from "next/link";
import { ArrowRight, BellRing, CircleCheck, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPEN } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RenewalItem } from "../queries";

export function RemindersCard({
  pending,
  total,
  dateLabel,
}: {
  pending: number;
  total: number;
  dateLabel: string;
}) {
  return (
    <section className="rounded-xl border bg-card p-5 shadow-xs">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            pending > 0 ? "bg-warning-soft text-warning" : "bg-success-soft text-success",
          )}
        >
          {pending > 0 ? <BellRing className="size-5" /> : <CircleCheck className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-brand-navy-deep">Recordatorios de mañana</h2>
          <p className="text-xs text-muted-foreground first-letter:uppercase">{dateLabel}</p>
        </div>
      </div>
      <p className="mt-4 text-sm text-brand-navy">
        {total === 0 ? (
          "No hay citas programadas para mañana."
        ) : pending > 0 ? (
          <>
            <span className="text-2xl font-semibold text-brand-navy-deep tabular-nums">{pending}</span> de {total} cita(s)
            sin recordatorio.
          </>
        ) : (
          `Los ${total} pacientes de mañana ya fueron recordados o confirmaron.`
        )}
      </p>
      <Button asChild variant={pending > 0 ? "default" : "outline"} size="sm" className="mt-4 w-full">
        <Link href="/app/agenda/recordatorios">
          {pending > 0 ? "Enviar recordatorios" : "Ver recordatorios"} <ArrowRight />
        </Link>
      </Button>
    </section>
  );
}

export function RenewalsCard({
  items,
  total,
  canSeeBalance,
}: {
  items: RenewalItem[];
  total: number;
  canSeeBalance: boolean;
}) {
  return (
    <section className="rounded-xl border bg-card shadow-xs">
      <header className="flex items-center justify-between gap-3 border-b px-5 py-4">
        <div className="flex items-center gap-2">
          <RefreshCcw className="size-4 text-brand-teal" />
          <h2 className="font-semibold text-brand-navy-deep">Renovaciones pendientes</h2>
        </div>
        {total > 0 ? (
          <span className="rounded-full bg-warning-soft px-2 text-xs font-semibold text-warning tabular-nums">{total}</span>
        ) : null}
      </header>

      {items.length === 0 ? (
        <p className="px-5 py-6 text-center text-sm text-muted-foreground">
          Ningún paquete está por terminar. ¡Buen trabajo!
        </p>
      ) : (
        <ul className="divide-y">
          {items.map((item) => (
            <li key={item.packageId}>
              <Link
                href={`/app/pacientes/${item.patientId}?tab=paquetes`}
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-brand-navy-deep">{item.patientName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.packageName}
                    {canSeeBalance && item.balanceCents > 0 ? ` · Saldo ${formatPEN(item.balanceCents)}` : ""}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                    item.remaining === 0 ? "bg-danger-soft text-destructive" : "bg-warning-soft text-warning",
                  )}
                >
                  {item.remaining === 0 ? "Sin sesiones" : `${item.remaining} de ${item.total}`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t px-5 py-3">
        <Button asChild variant="ghost" size="sm" className="w-full text-primary">
          <Link href="/app/renovaciones">
            Ver panel de renovaciones <ArrowRight />
          </Link>
        </Button>
      </div>
    </section>
  );
}
