import Link from "next/link";
import { ArrowRight, CalendarDays, CalendarPlus, DoorOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppointmentStatusBadge, Pill } from "@/components/common/status-badges";
import { cn } from "@/lib/utils";
import type { TodayItem } from "../queries";

export function TodayAgenda({
  items,
  today,
  showProfessional,
}: {
  items: TodayItem[];
  today: string;
  showProfessional: boolean;
}) {
  const agendaHref = `/app/agenda?vista=dia&fecha=${today}`;

  return (
    <section className="rounded-xl border bg-card shadow-xs">
      <header className="flex items-center justify-between gap-3 border-b px-5 py-4">
        <div>
          <h2 className="font-semibold text-brand-navy-deep">Agenda de hoy</h2>
          <p className="text-xs text-muted-foreground">
            {items.length === 0 ? "Sin citas programadas" : `${items.length} cita(s) programada(s)`}
          </p>
        </div>
        <Button asChild variant="ghost" size="sm" className="text-primary">
          <Link href={agendaHref}>
            Ver agenda <ArrowRight />
          </Link>
        </Button>
      </header>

      {items.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-10 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-secondary text-primary">
            <CalendarDays className="size-5" />
          </span>
          <p className="mt-3 text-sm font-medium text-brand-navy-deep">Hoy no tienes citas</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Aprovecha para agendar o enviar recordatorios.</p>
          <Button asChild size="sm" className="mt-4">
            <Link href="/app/agenda?nuevaCita=1">
              <CalendarPlus /> Agendar cita
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="divide-y">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`${agendaHref}&cita=${item.id}`}
                className={cn(
                  "flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/50",
                  item.timing === "now" && "bg-info-soft/60",
                  item.timing === "past" && item.status !== "ATENDIDA" && "bg-warning-soft/30",
                )}
              >
                <div className="w-12 shrink-0 text-right">
                  <p
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      item.timing === "past" ? "text-muted-foreground" : "text-brand-navy-deep",
                    )}
                  >
                    {item.start}
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums">{item.end}</p>
                </div>
                <span className="h-9 w-1 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-brand-navy-deep">{item.patientName}</p>
                  <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    {showProfessional ? <span className="truncate">{item.professionalName}</span> : null}
                    {item.room ? (
                      <span className="inline-flex items-center gap-1">
                        <DoorOpen className="size-3" /> {item.room}
                      </span>
                    ) : null}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
                  {item.timing === "now" ? <Pill tone="blue">En curso</Pill> : null}
                  {item.timing === "next" ? <Pill tone="gray">Siguiente</Pill> : null}
                  <AppointmentStatusBadge status={item.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
