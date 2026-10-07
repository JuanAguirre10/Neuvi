import Link from "next/link";
import { CalendarClock, CalendarDays, CalendarPlus, CheckCircle2, History, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AppointmentStatusBadge } from "@/components/common/status-badges";
import { EmptyState } from "@/components/common/empty-state";
import type { CurrentUser } from "@/lib/auth";
import { formatLongDate, formatTime, limaDateKey } from "@/lib/dates";
import { MODALITY_LABEL } from "@/lib/format";
import { getPatientAppointments, type PatientDetail } from "../queries";
import { patientHref } from "../utils";
import { Panel } from "./info";

type Appt = Awaited<ReturnType<typeof getPatientAppointments>>["past"][number];

export async function AppointmentsTab({ user, patient }: { user: CurrentUser; patient: PatientDetail }) {
  const { upcoming, past, showNotes } = await getPatientAppointments(user, patient);

  if (!upcoming.length && !past.length) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Sin citas registradas"
        description="Cuando agendes citas para este paciente aparecerán aquí con su estado."
        action={
          <Button asChild>
            <Link href={`/app/agenda?nuevaCita=1&paciente=${patient.id}`}>
              <CalendarPlus /> Agendar cita
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-5">
      <Panel
        title={`Próximas citas (${upcoming.length})`}
        icon={CalendarClock}
        bodyClassName="p-0"
        action={
          <Button size="sm" variant="outline" asChild>
            <Link href={`/app/agenda?nuevaCita=1&paciente=${patient.id}`}>
              <CalendarPlus /> Nueva cita
            </Link>
          </Button>
        }
      >
        {upcoming.length ? (
          <AppointmentList rows={upcoming} patientId={patient.id} showNotes={false} />
        ) : (
          <p className="px-4 py-4 text-sm text-muted-foreground">No tiene citas programadas.</p>
        )}
      </Panel>

      <Panel title={`Historial (${past.length})`} icon={History} bodyClassName="p-0">
        {past.length ? (
          <AppointmentList rows={past} patientId={patient.id} showNotes={showNotes} />
        ) : (
          <p className="px-4 py-4 text-sm text-muted-foreground">Aún no hay citas pasadas.</p>
        )}
      </Panel>
    </div>
  );
}

function NoteCell({ a, patientId }: { a: Appt; patientId: string }) {
  if (a.hasNote) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
        <CheckCircle2 className="size-3.5" /> Registrada
      </span>
    );
  }
  if (a.status === "ATENDIDA") {
    return (
      <Link
        href={patientHref(patientId, { tab: "historia", nota: a.id })}
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        <NotebookPen className="size-3.5" /> Registrar nota
      </Link>
    );
  }
  return <span className="text-xs text-muted-foreground">—</span>;
}

function AppointmentList({ rows, patientId, showNotes }: { rows: Appt[]; patientId: string; showNotes: boolean }) {
  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4 text-xs text-muted-foreground">Fecha</TableHead>
              <TableHead className="text-xs text-muted-foreground">Hora</TableHead>
              <TableHead className="text-xs text-muted-foreground">Profesional</TableHead>
              <TableHead className="text-xs text-muted-foreground">Modalidad</TableHead>
              <TableHead className="text-xs text-muted-foreground">Estado</TableHead>
              {showNotes ? <TableHead className="text-xs text-muted-foreground">Nota</TableHead> : null}
              <TableHead className="pr-4 text-right text-xs text-muted-foreground">Agenda</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="pl-4 font-medium text-brand-navy-deep first-letter:uppercase">
                  {formatLongDate(a.startsAt)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatTime(a.startsAt)}–{formatTime(a.endsAt)}
                </TableCell>
                <TableCell>{a.professional.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {MODALITY_LABEL[a.modality]}
                  {a.room ? ` · ${a.room.name}` : ""}
                </TableCell>
                <TableCell>
                  <AppointmentStatusBadge status={a.status} />
                </TableCell>
                {showNotes ? (
                  <TableCell>
                    <NoteCell a={a} patientId={patientId} />
                  </TableCell>
                ) : null}
                <TableCell className="pr-4 text-right">
                  <Link
                    href={`/app/agenda?fecha=${limaDateKey(a.startsAt)}`}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Ver día
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="divide-y md:hidden">
        {rows.map((a) => (
          <li key={a.id} className="grid gap-1.5 px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-brand-navy-deep first-letter:uppercase">{formatLongDate(a.startsAt)}</p>
              <AppointmentStatusBadge status={a.status} />
            </div>
            <p className="text-xs text-muted-foreground">
              {formatTime(a.startsAt)}–{formatTime(a.endsAt)} · {a.professional.name} · {MODALITY_LABEL[a.modality]}
              {a.room ? ` · ${a.room.name}` : ""}
            </p>
            {a.status === "CANCELADA" && a.cancelReason ? (
              <p className="text-xs text-muted-foreground italic">Motivo: {a.cancelReason}</p>
            ) : null}
            <div className="flex items-center gap-4">
              {showNotes ? <NoteCell a={a} patientId={patientId} /> : null}
              <Link
                href={`/app/agenda?fecha=${limaDateKey(a.startsAt)}`}
                className="text-xs font-medium text-primary hover:underline"
              >
                Ver en agenda
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
