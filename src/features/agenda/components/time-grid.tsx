"use client";

import { useEffect, useRef, useState } from "react";
import type { AppointmentStatus } from "@prisma/client";
import { Ban, CheckCheck, CircleCheck, UserX, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  HOUR_PX,
  MIN_BLOCK_PX,
  PX_PER_MIN,
  SLOT_MINUTES,
  currentLimaMinutes,
  layoutLanes,
  minutesToTime,
  tint,
} from "../lib";
import type { AgendaAppointment } from "../types";

export type GridColumn = {
  key: string;
  dateKey: string;
  /** Profesional de la columna (vista diaria por profesional). */
  professionalId?: string;
  header: React.ReactNode;
  isToday: boolean;
  appointments: AgendaAppointment[];
};

export type SlotPick = { dateKey: string; time: string; professionalId?: string };

/** Minuto actual en Lima, refrescado cada minuto (el valor inicial viene del servidor). */
function useNowMinutes(initial: number) {
  const [now, setNow] = useState(initial);
  useEffect(() => {
    const id = window.setInterval(() => setNow(currentLimaMinutes()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

export function TimeGrid({
  columns,
  startHour,
  endHour,
  initialNowMinutes,
  showProfessional,
  minColumnWidth = "6rem",
  onSelect,
  onSlot,
}: {
  columns: GridColumn[];
  startHour: number;
  endHour: number;
  initialNowMinutes: number;
  showProfessional: boolean;
  minColumnWidth?: string;
  onSelect: (id: string) => void;
  onSlot?: (slot: SlotPick) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const now = useNowMinutes(initialNowMinutes);
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const height = (endHour - startHour) * HOUR_PX;
  const template = `3.5rem repeat(${columns.length}, minmax(${minColumnWidth}, 1fr))`;

  // Al abrir, desplaza hasta la hora actual (si hoy está visible) o hasta la primera cita.
  const hasToday = columns.some((c) => c.isToday);
  const firstStart = Math.min(...columns.flatMap((c) => c.appointments.map((a) => a.startMin)), 24 * 60);
  const focusMinute = hasToday ? initialNowMinutes : firstStart < 24 * 60 ? firstStart : startHour * 60;
  const initialScroll = Math.max(0, (focusMinute - startHour * 60) * PX_PER_MIN - 96);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = initialScroll;
  }, [initialScroll]);

  const pickSlot = (e: React.MouseEvent<HTMLDivElement>, col: GridColumn) => {
    if (!onSlot) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const minutes = (e.clientY - rect.top) / PX_PER_MIN;
    const rounded = Math.floor(minutes / SLOT_MINUTES) * SLOT_MINUTES + startHour * 60;
    const clamped = Math.min(Math.max(rounded, 0), 23 * 60 + 45);
    onSlot({ dateKey: col.dateKey, time: minutesToTime(clamped), professionalId: col.professionalId });
  };

  return (
    <div
      ref={scrollRef}
      className="relative max-h-[calc(100dvh-15rem)] min-h-[26rem] overflow-auto rounded-xl border bg-card shadow-xs"
    >
      <div className="grid min-w-fit" style={{ gridTemplateColumns: template }}>
        {/* Encabezados (fijos al hacer scroll) */}
        <div className="sticky top-0 left-0 z-30 border-b bg-card" />
        {columns.map((col) => (
          <div
            key={`h-${col.key}`}
            className={cn("sticky top-0 z-20 border-b border-l bg-card px-2 py-2", col.isToday && "bg-secondary")}
          >
            {col.header}
          </div>
        ))}

        {/* Columna de horas */}
        <div className="sticky left-0 z-10 bg-card" style={{ height }}>
          {hours.slice(1).map((h) => (
            <span
              key={h}
              className="absolute right-2 -translate-y-1/2 text-[11px] text-muted-foreground tabular-nums"
              style={{ top: (h - startHour) * HOUR_PX }}
            >
              {String(h).padStart(2, "0")}:00
            </span>
          ))}
        </div>

        {/* Columnas de días / profesionales */}
        {columns.map((col) => {
          const positioned = layoutLanes(
            col.appointments.map((a) => ({
              appt: a,
              startMin: a.startMin,
              // Alto visual mínimo para que bloques cortos no se encimen.
              endMin: Math.max(a.endMin, a.startMin + MIN_BLOCK_PX / PX_PER_MIN),
            })),
          );
          const nowTop = (now - startHour * 60) * PX_PER_MIN;
          return (
            <div
              key={`c-${col.key}`}
              role="presentation"
              onClick={(e) => pickSlot(e, col)}
              className={cn(
                "relative border-l",
                onSlot && "cursor-copy",
                col.isToday && "bg-info-soft/40",
              )}
              style={{ height }}
            >
              {hours.map((h) => (
                <div key={h} className="pointer-events-none absolute inset-x-0" style={{ top: (h - startHour) * HOUR_PX }}>
                  <div className="border-t border-border/80" />
                  <div className="border-t border-dashed border-border/40" style={{ marginTop: HOUR_PX / 2 - 1 }} />
                </div>
              ))}

              {col.isToday && nowTop >= 0 && nowTop <= height ? (
                <div className="pointer-events-none absolute inset-x-0 z-[7] flex items-center" style={{ top: nowTop }}>
                  <span className="-ml-1 size-2 rounded-full bg-destructive" />
                  <span className="h-px flex-1 bg-destructive/70" />
                </div>
              ) : null}

              {positioned.map(({ item, lane, lanes }) => (
                <AppointmentBlock
                  key={item.appt.id}
                  a={item.appt}
                  lane={lane}
                  lanes={lanes}
                  startHour={startHour}
                  showProfessional={showProfessional}
                  onSelect={onSelect}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const STATUS_ICON: Partial<Record<AppointmentStatus, { icon: typeof Ban; className: string; label: string }>> = {
  CONFIRMADA: { icon: CheckCheck, className: "text-success", label: "Confirmada" },
  ATENDIDA: { icon: CircleCheck, className: "text-brand-navy", label: "Atendida" },
  NO_ASISTIO: { icon: UserX, className: "text-warning", label: "No asistió" },
  CANCELADA: { icon: Ban, className: "text-muted-foreground", label: "Cancelada" },
};

function AppointmentBlock({
  a,
  lane,
  lanes,
  startHour,
  showProfessional,
  onSelect,
}: {
  a: AgendaAppointment;
  lane: number;
  lanes: number;
  startHour: number;
  showProfessional: boolean;
  onSelect: (id: string) => void;
}) {
  const top = (a.startMin - startHour * 60) * PX_PER_MIN;
  const height = Math.max((a.endMin - a.startMin) * PX_PER_MIN, MIN_BLOCK_PX);
  const width = 100 / lanes;
  const compact = height < 44;
  const roomy = height >= 70;
  const status = STATUS_ICON[a.status];
  const cancelled = a.status === "CANCELADA";
  const color = a.professional.color;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelect(a.id);
      }}
      title={`${a.start}–${a.end} · ${a.patient.name} · ${a.professional.name}`}
      className={cn(
        "absolute z-[5] flex flex-col overflow-hidden rounded-md border border-l-[3px] px-1.5 text-left text-brand-navy-deep shadow-xs transition-shadow outline-none hover:z-10 hover:shadow-md focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring",
        compact ? "justify-center py-0" : "py-1",
        cancelled && "opacity-55",
      )}
      style={{
        top: top + 1,
        height: height - 2,
        left: `calc(${lane * width}% + 2px)`,
        width: `calc(${width}% - 4px)`,
        backgroundColor: tint(color, cancelled ? 6 : 14),
        borderColor: tint(color, 30),
        borderLeftColor: color,
      }}
    >
      <span className="flex min-w-0 items-center gap-1 text-xs leading-tight">
        {compact ? <span className="shrink-0 font-semibold tabular-nums">{a.start}</span> : null}
        <span className={cn("truncate font-semibold", cancelled && "line-through")}>{a.patient.name}</span>
        {status ? <status.icon className={cn("ml-auto size-3 shrink-0", status.className)} aria-label={status.label} /> : null}
      </span>
      {!compact ? (
        <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground tabular-nums">
          {a.start} – {a.end}
          {a.modality === "VIRTUAL" ? <Video className="size-3 shrink-0" aria-label="Virtual" /> : null}
        </span>
      ) : null}
      {roomy ? (
        <span className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {[showProfessional ? a.professional.name : null, a.room?.name].filter(Boolean).join(" · ")}
        </span>
      ) : null}
    </button>
  );
}
