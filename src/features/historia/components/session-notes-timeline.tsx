import { CalendarCheck2 } from "lucide-react";
import type { RiskLevel } from "@prisma/client";
import { Pill, RiskBadge } from "@/components/common/status-badges";
import { formatDateTime, formatLongDate, formatTime, limaDateKey } from "@/lib/dates";
import { MODALITY_LABEL } from "@/lib/format";
import { cn } from "@/lib/utils";
import { NOTE_FIELDS, type NoteFormValues } from "../fields";
import type { SessionNoteWithAuthor } from "../queries";
import { SessionNoteDialog } from "./session-note-dialog";

const DOT: Record<RiskLevel, string> = {
  NINGUNO: "bg-brand-sky",
  BAJO: "bg-primary",
  MODERADO: "bg-warning",
  ALTO: "bg-destructive",
};

export function toNoteFormValues(note: SessionNoteWithAuthor): NoteFormValues {
  return {
    sessionDate: limaDateKey(note.sessionDate),
    sessionNumber: note.sessionNumber ? String(note.sessionNumber) : "",
    modality: note.modality,
    moodObserved: note.moodObserved ?? "",
    topics: note.topics ?? "",
    development: note.development,
    interventions: note.interventions ?? "",
    homework: note.homework ?? "",
    nextSessionPlan: note.nextSessionPlan ?? "",
    riskLevel: note.riskLevel,
    appointmentId: "",
  };
}

const WIDE = new Set(["development", "nextSessionPlan"]);

/** Línea de tiempo de notas de evolución (más reciente primero). */
export function SessionNotesTimeline({
  notes,
  patientId,
  currentUserId,
  openNoteId,
}: {
  notes: SessionNoteWithAuthor[];
  patientId: string;
  currentUserId: string;
  /** Nota a abrir en modo edición al cargar (flujo ?nota= de una cita que ya tiene nota). */
  openNoteId?: string;
}) {
  return (
    <ol className="relative grid gap-4 before:absolute before:top-3 before:bottom-3 before:left-[5px] before:w-px before:bg-border">
      {notes.map((note) => {
        const isAuthor = note.authorId === currentUserId;
        const linkedLabel = note.appointment
          ? `${formatLongDate(note.appointment.startsAt)} · ${formatTime(note.appointment.startsAt)}`
          : undefined;
        return (
          <li key={note.id} className="relative pl-7">
            <span
              aria-hidden
              className={cn("absolute top-4 left-0 size-[11px] rounded-full ring-4 ring-background", DOT[note.riskLevel])}
            />
            <article
              className={cn(
                "rounded-xl border bg-card shadow-xs",
                note.riskLevel === "ALTO" && "border-destructive/40",
              )}
            >
              <header className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
                <h3 className="text-sm font-semibold text-brand-navy-deep first-letter:uppercase">
                  {formatLongDate(note.sessionDate)}
                </h3>
                {note.sessionNumber ? <Pill tone="navy">Sesión N.º {note.sessionNumber}</Pill> : null}
                <Pill tone="gray">{MODALITY_LABEL[note.modality]}</Pill>
                <RiskBadge level={note.riskLevel} />
                <span className="ml-auto text-xs text-muted-foreground">{note.author.name}</span>
                {isAuthor ? (
                  <SessionNoteDialog
                    patientId={patientId}
                    mode="edit"
                    noteId={note.id}
                    values={toNoteFormValues(note)}
                    linkedAppointmentLabel={linkedLabel}
                    defaultOpen={openNoteId === note.id}
                    clearParamOnClose={openNoteId === note.id}
                  />
                ) : null}
              </header>
              <dl className="grid gap-x-6 gap-y-3 px-4 py-3.5 md:grid-cols-2">
                {NOTE_FIELDS.map((f) => {
                  const value = note[f.name];
                  if (!value) return null;
                  return (
                    <div key={f.name} className={cn("min-w-0", WIDE.has(f.name) && "md:col-span-2")}>
                      <dt className="text-xs font-medium text-muted-foreground">{f.label}</dt>
                      <dd className="mt-0.5 text-sm leading-relaxed break-words whitespace-pre-wrap text-brand-navy-deep">
                        {value}
                      </dd>
                    </div>
                  );
                })}
              </dl>
              <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
                {linkedLabel ? (
                  <span className="inline-flex items-center gap-1">
                    <CalendarCheck2 className="size-3.5" /> Cita del <span className="inline-block first-letter:uppercase">{linkedLabel}</span>
                  </span>
                ) : null}
                <span>
                  Registrada el {formatDateTime(note.createdAt)}
                  {note.updatedAt.getTime() - note.createdAt.getTime() > 60_000
                    ? ` · editada el ${formatDateTime(note.updatedAt)}`
                    : ""}
                </span>
              </footer>
            </article>
          </li>
        );
      })}
    </ol>
  );
}
