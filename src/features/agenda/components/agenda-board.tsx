"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellRing, CalendarPlus, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageHeader } from "@/components/common/page-header";
import { cn } from "@/lib/utils";
import { DEFAULT_END_HOUR, DEFAULT_START_HOUR, agendaHref, type AgendaQuery } from "../lib";
import type { AgendaAppointment, AgendaDay, AgendaPatientOption, AgendaProfessional, AgendaRoom } from "../types";
import { AgendaToolbar } from "./agenda-toolbar";
import { AppointmentFormDialog, type FormIntent } from "./appointment-form-dialog";
import { AppointmentSheet } from "./appointment-sheet";
import { CancelAppointmentDialog } from "./cancel-appointment-dialog";
import { DayList, WeekStrip } from "./day-list";
import { TimeGrid, type GridColumn, type SlotPick } from "./time-grid";

export type AgendaBoardProps = {
  query: AgendaQuery;
  today: string;
  nowMinutes: number;
  weekLabel: string;
  days: AgendaDay[];
  appointments: AgendaAppointment[];
  professionals: AgendaProfessional[];
  rooms: AgendaRoom[];
  patients: AgendaPatientOption[];
  professionalFilter: string | null;
  canManageAll: boolean;
  isScoped: boolean;
  isAdmin: boolean;
  currentUserId: string;
  defaultDuration: number;
  suggestedTime: string;
  pendingReminders: number;
  /** Prellenado desde la URL (?nuevaCita=1&paciente=…). */
  initialCreate: { patientId?: string; professionalId?: string; date: string } | null;
  /** Abre el detalle de una cita (?cita=…). */
  initialSelectedId: string | null;
};

export function AgendaBoard(props: AgendaBoardProps) {
  const { query: q, days, appointments, professionals } = props;
  const router = useRouter();
  const [navPending, startNav] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(props.initialSelectedId);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [intent, setIntent] = useState<FormIntent | null>(() =>
    props.initialCreate ? { mode: "create", ...props.initialCreate } : null,
  );
  // Si el formulario se abrió desde la URL, al cerrarlo limpiamos ?nuevaCita para que no reaparezca.
  const [cleanUrl, setCleanUrl] = useState(props.initialCreate !== null);

  const navigate = (patch: Partial<AgendaQuery>, replace = false) => {
    const href = agendaHref({ ...q, ...patch });
    startNav(() => {
      if (replace) router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    });
  };

  const visible = q.canceladas ? appointments : appointments.filter((a) => a.status !== "CANCELADA");
  const cancelledCount = appointments.length - appointments.filter((a) => a.status !== "CANCELADA").length;
  const selected = appointments.find((a) => a.id === selectedId) ?? null;
  const cancelTarget = appointments.find((a) => a.id === cancelId) ?? null;
  const canCreate = professionals.length > 0;
  const multiProfessional = !props.isScoped && professionals.length > 1;
  const showProfessional = multiProfessional && q.profesional === "todos";
  const selectedDay = days.find((d) => d.key === q.fecha);

  // Rango horario de la grilla: 07:00–21:00, ampliado si hay citas fuera de ese horario.
  let startHour = DEFAULT_START_HOUR;
  let endHour = DEFAULT_END_HOUR;
  for (const a of visible) {
    startHour = Math.min(startHour, Math.floor(a.startMin / 60));
    endHour = Math.max(endHour, Math.ceil(a.endMin / 60));
  }
  endHour = Math.min(endHour, 24);

  const counts: Record<string, number> = {};
  for (const a of visible) counts[a.dateKey] = (counts[a.dateKey] ?? 0) + 1;
  const dayAppointments = visible.filter((a) => a.dateKey === q.fecha);
  const activeThisWeek = appointments.filter((a) => a.status !== "CANCELADA").length;

  // ---------- Acciones de UI ----------

  const openCreate = (prefill?: Partial<Extract<FormIntent, { mode: "create" }>>) => {
    if (!canCreate) return;
    setSelectedId(null);
    setIntent({
      mode: "create",
      date: q.fecha < props.today ? props.today : q.fecha,
      professionalId: props.professionalFilter ?? undefined,
      ...prefill,
    });
  };

  const onSlot = (slot: SlotPick) =>
    openCreate({
      date: slot.dateKey,
      time: slot.time,
      professionalId: slot.professionalId ?? props.professionalFilter ?? undefined,
    });

  const closeForm = () => {
    setIntent(null);
    if (cleanUrl) {
      setCleanUrl(false);
      navigate({}, true);
    }
  };

  const onSaved = (dateKey: string) => {
    setIntent(null);
    if (dateKey && dateKey !== q.fecha) navigate({ fecha: dateKey }, cleanUrl);
    else if (cleanUrl) navigate({}, true);
    setCleanUrl(false);
  };

  // ---------- Columnas de la grilla (escritorio) ----------

  let columns: GridColumn[];
  if (q.vista === "semana") {
    columns = days.map((d) => ({
      key: d.key,
      dateKey: d.key,
      isToday: d.isToday,
      professionalId: props.professionalFilter ?? undefined,
      appointments: visible.filter((a) => a.dateKey === d.key),
      header: (
        <button
          type="button"
          onClick={() => navigate({ vista: "dia", fecha: d.key })}
          className="flex w-full flex-col items-center leading-tight"
          title="Ver el día"
        >
          <span className={cn("text-[11px] font-medium uppercase", d.isToday ? "text-primary" : "text-muted-foreground")}>
            {d.weekdayShort}
          </span>
          <span
            className={cn(
              "mt-0.5 flex size-7 items-center justify-center rounded-full text-sm font-semibold tabular-nums",
              d.isToday ? "bg-primary text-primary-foreground" : "text-brand-navy-deep hover:bg-muted",
            )}
          >
            {d.dayNumber}
          </span>
        </button>
      ),
    }));
  } else if (showProfessional) {
    // Vista diaria del centro: una columna por profesional para ver quién está libre.
    const known = new Set(professionals.map((p) => p.id));
    const extra = dayAppointments
      .map((a) => ({ id: a.professional.id, name: a.professional.name, color: a.professional.color }))
      .filter((p, i, arr) => !known.has(p.id) && arr.findIndex((x) => x.id === p.id) === i);
    columns = [...professionals, ...extra].map((p) => ({
      key: p.id,
      dateKey: q.fecha,
      professionalId: p.id,
      isToday: q.fecha === props.today,
      appointments: dayAppointments.filter((a) => a.professional.id === p.id),
      header: (
        <span className="flex items-center justify-center gap-1.5 text-xs font-semibold text-brand-navy-deep">
          <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="truncate">{p.name}</span>
        </span>
      ),
    }));
  } else {
    columns = [
      {
        key: q.fecha,
        dateKey: q.fecha,
        professionalId: props.professionalFilter ?? (professionals.length === 1 ? professionals[0]!.id : undefined),
        isToday: q.fecha === props.today,
        appointments: dayAppointments,
        header: (
          <span className="block text-center text-sm font-semibold text-brand-navy-deep first-letter:uppercase">
            {selectedDay?.longLabel ?? q.fecha}
          </span>
        ),
      },
    ];
  }

  const rangeLabel = q.vista === "semana" ? props.weekLabel : (selectedDay?.longLabel ?? q.fecha);

  return (
    <>
      <PageHeader
        title="Agenda"
        description={
          props.isScoped
            ? `Tu agenda · ${activeThisWeek} cita(s) esta semana`
            : `Citas por profesional y consultorio · ${activeThisWeek} cita(s) esta semana`
        }
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/app/agenda/recordatorios">
                <BellRing /> Recordatorios
                {props.pendingReminders > 0 ? (
                  <span className="ml-0.5 rounded-full bg-warning-soft px-1.5 text-[11px] font-semibold text-warning tabular-nums">
                    {props.pendingReminders}
                  </span>
                ) : null}
              </Link>
            </Button>
            <Button onClick={() => openCreate()} disabled={!canCreate}>
              <CalendarPlus /> Nueva cita
            </Button>
          </>
        }
      />

      {!canCreate ? (
        <Alert className="mb-4 border-warning/30 bg-warning-soft text-warning">
          <Info />
          <AlertTitle>Aún no hay profesionales que atiendan</AlertTitle>
          <AlertDescription className="text-warning/90">
            Para agendar citas, al menos un miembro del equipo debe estar marcado como profesional.
            {props.isAdmin ? (
              <>
                {" "}
                <Link href="/app/equipo">Ir a Equipo</Link>
              </>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <AgendaToolbar
        query={q}
        today={props.today}
        rangeLabel={rangeLabel}
        professionals={professionals}
        canFilter={props.canManageAll && professionals.length > 1}
        cancelledCount={cancelledCount}
        pending={navPending}
        onChange={(patch) => navigate(patch)}
      />

      {showProfessional && q.vista === "semana" ? (
        <div className="mb-3 hidden flex-wrap items-center gap-2 md:flex">
          {professionals.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => navigate({ profesional: p.id })}
              className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs font-medium text-brand-navy transition-colors hover:border-brand-sky"
              title={`Ver solo la agenda de ${p.name}`}
            >
              <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
              {p.name}
            </button>
          ))}
        </div>
      ) : null}

      <div className={cn("transition-opacity", navPending && "pointer-events-none opacity-60")}>
        {/* Móvil: tira de la semana + lista del día */}
        <div className="grid gap-3 md:hidden">
          <WeekStrip days={days} selected={q.fecha} counts={counts} onPick={(key) => navigate({ fecha: key }, true)} />
          <div className="flex items-baseline justify-between px-1">
            <p className="text-sm font-semibold text-brand-navy-deep first-letter:uppercase">
              {selectedDay?.longLabel ?? q.fecha}
            </p>
            <p className="text-xs text-muted-foreground">{dayAppointments.length} cita(s)</p>
          </div>
          <DayList
            appointments={dayAppointments}
            showProfessional={showProfessional}
            onSelect={setSelectedId}
            onCreate={() => openCreate({ date: q.fecha })}
            canCreate={canCreate}
          />
        </div>

        {/* Escritorio: grilla horaria */}
        <div className="hidden md:block">
          <TimeGrid
            key={`${q.vista}-${q.fecha}-${q.profesional}`}
            columns={columns}
            startHour={startHour}
            endHour={endHour}
            initialNowMinutes={props.nowMinutes}
            showProfessional={showProfessional}
            minColumnWidth={q.vista === "semana" ? "6rem" : "10rem"}
            onSelect={setSelectedId}
            onSlot={canCreate ? onSlot : undefined}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Haz clic en un espacio libre para agendar en ese horario, o en una cita para ver su detalle.
          </p>
        </div>
      </div>

      <AppointmentSheet
        appointment={selected}
        onClose={() => setSelectedId(null)}
        onEdit={(a) => {
          setSelectedId(null);
          setIntent({ mode: "edit", appointment: a });
        }}
        onCancel={(a) => {
          setSelectedId(null);
          setCancelId(a.id);
        }}
        onRebook={(a) =>
          openCreate({
            patientId: a.patient.id,
            professionalId: a.professional.id,
            date: a.dateKey < props.today ? props.today : a.dateKey,
          })
        }
      />

      <CancelAppointmentDialog appointment={cancelTarget} onClose={() => setCancelId(null)} />

      <AppointmentFormDialog
        intent={intent}
        onClose={closeForm}
        onSaved={onSaved}
        patients={props.patients}
        professionals={professionals}
        rooms={props.rooms}
        canManageAll={props.canManageAll}
        currentUserId={props.currentUserId}
        defaultDuration={props.defaultDuration}
        suggestedTime={props.suggestedTime}
      />
    </>
  );
}
