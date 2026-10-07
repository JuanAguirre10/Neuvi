"use client";

import { CalendarPlus, DoorOpen, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppointmentStatusBadge } from "@/components/common/status-badges";
import { cn } from "@/lib/utils";
import type { AgendaAppointment, AgendaDay } from "../types";

/** Tira de días de la semana (móvil). */
export function WeekStrip({
  days,
  selected,
  counts,
  onPick,
}: {
  days: AgendaDay[];
  selected: string;
  counts: Record<string, number>;
  onPick: (dateKey: string) => void;
}) {
  return (
    <div className="grid grid-cols-7 gap-1 rounded-xl border bg-card p-1.5 shadow-xs">
      {days.map((d) => {
        const isSelected = d.key === selected;
        const count = counts[d.key] ?? 0;
        return (
          <button
            key={d.key}
            type="button"
            onClick={() => onPick(d.key)}
            aria-current={isSelected ? "date" : undefined}
            aria-label={`${d.longLabel}: ${count} cita(s)`}
            className={cn(
              "flex flex-col items-center rounded-lg py-1.5 transition-colors",
              isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted",
              !isSelected && d.isToday && "text-primary",
            )}
          >
            <span className={cn("text-[10px] font-medium uppercase", !isSelected && "text-muted-foreground")}>
              {d.weekdayShort}
            </span>
            <span className="text-base leading-6 font-semibold tabular-nums">{d.dayNumber}</span>
            <span
              className={cn(
                "size-1.5 rounded-full",
                count === 0 ? "bg-transparent" : isSelected ? "bg-primary-foreground" : "bg-brand-teal",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

/** Lista cronológica de citas del día: la vista principal en el celular. */
export function DayList({
  appointments,
  showProfessional,
  onSelect,
  onCreate,
  canCreate,
}: {
  appointments: AgendaAppointment[];
  showProfessional: boolean;
  onSelect: (id: string) => void;
  onCreate: () => void;
  canCreate: boolean;
}) {
  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed bg-card px-6 py-10 text-center">
        <p className="text-sm font-medium text-brand-navy-deep">No hay citas este día</p>
        <p className="mt-1 text-xs text-muted-foreground">Elige otro día o agenda una nueva cita.</p>
        {canCreate ? (
          <Button size="sm" className="mt-4" onClick={onCreate}>
            <CalendarPlus /> Agendar cita
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <ul className="grid gap-2">
      {appointments.map((a) => {
        const cancelled = a.status === "CANCELADA";
        return (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => onSelect(a.id)}
              className={cn(
                "flex w-full items-stretch gap-3 rounded-xl border bg-card p-3 text-left shadow-xs transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                cancelled && "opacity-60",
              )}
            >
              <div className="w-12 shrink-0 text-right">
                <p className="text-sm font-semibold text-brand-navy-deep tabular-nums">{a.start}</p>
                <p className="text-xs text-muted-foreground tabular-nums">{a.end}</p>
              </div>
              <span className="w-1 shrink-0 rounded-full" style={{ backgroundColor: a.professional.color }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn("truncate font-semibold text-brand-navy-deep", cancelled && "line-through")}>
                    {a.patient.name}
                  </p>
                  <AppointmentStatusBadge status={a.status} />
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                  {showProfessional ? <span>{a.professional.name}</span> : null}
                  {a.room ? (
                    <span className="inline-flex items-center gap-1">
                      <DoorOpen className="size-3" /> {a.room.name}
                    </span>
                  ) : null}
                  {a.modality === "VIRTUAL" ? (
                    <span className="inline-flex items-center gap-1">
                      <Video className="size-3" /> Virtual
                    </span>
                  ) : null}
                  {a.package ? (
                    <span>
                      {a.package.name} · {a.package.used}/{a.package.total}
                    </span>
                  ) : null}
                </p>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
