"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck2, Lock, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormMessage, SubmitButton, useServerForm } from "@/components/common/form";
import { todayKey } from "@/lib/dates";
import { MODALITY_LABEL, toOptions } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SelectInput } from "@/features/pacientes/components/select-input";
import { patientHref } from "@/features/pacientes/utils";
import { createSessionNoteAction, updateSessionNoteAction } from "../actions";
import { NOTE_FIELDS, type NoteFormValues, type NoteTextField } from "../fields";
import { RiskLevelPicker } from "./risk-level-picker";

const FIELD = Object.fromEntries(NOTE_FIELDS.map((f) => [f.name, f])) as Record<
  NoteTextField,
  (typeof NOTE_FIELDS)[number]
>;

/**
 * Diálogo para crear o editar una nota de evolución.
 * - mode "create": botón "Nueva nota". Con `defaultOpen` se abre al cargar (flujo ?nota=<appointmentId>).
 * - mode "edit": botón con lápiz; solo se muestra al autor de la nota.
 */
export function SessionNoteDialog({
  patientId,
  mode,
  noteId,
  values,
  defaultOpen = false,
  clearParamOnClose = false,
  linkedAppointmentLabel,
}: {
  patientId: string;
  mode: "create" | "edit";
  noteId?: string;
  values: NoteFormValues;
  defaultOpen?: boolean;
  /** Quita ?nota= de la URL al cerrar o guardar. */
  clearParamOnClose?: boolean;
  /** "lun., 5 de octubre de 2026 · 15:00" si la nota se vincula a una cita. */
  linkedAppointmentLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next && clearParamOnClose) {
      router.replace(patientHref(patientId, { tab: "historia" }), { scroll: false });
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {mode === "create" ? (
          <Button size="sm">
            <Plus /> Nueva nota
          </Button>
        ) : (
          <Button size="icon-sm" variant="ghost" aria-label="Editar nota" title="Editar nota">
            <Pencil />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="flex max-h-[92dvh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-5 py-4 pr-12">
          <DialogTitle className="text-brand-navy-deep">
            {mode === "create" ? "Nueva nota de evolución" : "Editar nota de evolución"}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-1.5 text-xs">
            <Lock className="size-3.5" /> Confidencial: visible solo para el psicólogo tratante.
          </DialogDescription>
        </DialogHeader>
        <NoteForm
          patientId={patientId}
          mode={mode}
          noteId={noteId}
          values={values}
          linkedAppointmentLabel={linkedAppointmentLabel}
          onCancel={() => handleOpenChange(false)}
          onSaved={(message) => {
            toast.success(message);
            handleOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function NoteForm({
  patientId,
  mode,
  noteId,
  values,
  linkedAppointmentLabel,
  onCancel,
  onSaved,
}: {
  patientId: string;
  mode: "create" | "edit";
  noteId?: string;
  values: NoteFormValues;
  linkedAppointmentLabel?: string;
  onCancel: () => void;
  onSaved: (message: string) => void;
}) {
  const action =
    mode === "edit" && noteId
      ? updateSessionNoteAction.bind(null, noteId)
      : createSessionNoteAction.bind(null, patientId);
  const { state, pending, onSubmit } = useServerForm(action, {
    onSuccess: (s) => onSaved(s.message ?? "Nota guardada."),
  });
  const e = state.fieldErrors ?? {};

  const textArea = (name: NoteTextField, className?: string) => {
    const f = FIELD[name];
    return (
      <Field
        key={name}
        label={f.label}
        htmlFor={`note-${name}`}
        error={e[name]}
        required={f.required}
        className={className}
      >
        <Textarea
          id={`note-${name}`}
          name={name}
          defaultValue={values[name]}
          rows={f.rows}
          placeholder={f.placeholder}
          className="bg-card"
        />
      </Field>
    );
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="grid gap-4 overflow-y-auto px-5 py-4">
        {values.appointmentId ? <input type="hidden" name="appointmentId" value={values.appointmentId} /> : null}
        {linkedAppointmentLabel ? (
          <p className="flex items-center gap-2 rounded-lg bg-info-soft px-3 py-2 text-xs text-primary">
            <CalendarCheck2 className="size-4 shrink-0" />
            <span>
              Vinculada a la cita del <span className="inline-block font-semibold first-letter:uppercase">{linkedAppointmentLabel}</span>
            </span>
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Fecha de la sesión" htmlFor="note-sessionDate" error={e.sessionDate} required>
            <Input
              id="note-sessionDate"
              name="sessionDate"
              type="date"
              defaultValue={values.sessionDate}
              max={todayKey()}
              className="h-9 bg-card"
            />
          </Field>
          <Field label="N.º de sesión" htmlFor="note-sessionNumber" error={e.sessionNumber}>
            <Input
              id="note-sessionNumber"
              name="sessionNumber"
              type="number"
              min={1}
              max={999}
              inputMode="numeric"
              defaultValue={values.sessionNumber}
              className="h-9 bg-card"
            />
          </Field>
          <Field label="Modalidad" htmlFor="note-modality" error={e.modality}>
            <SelectInput
              id="note-modality"
              name="modality"
              defaultValue={values.modality}
              options={toOptions(MODALITY_LABEL)}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {textArea("moodObserved")}
          {textArea("topics")}
        </div>
        {textArea("development")}
        <div className="grid gap-4 sm:grid-cols-2">
          {textArea("interventions")}
          {textArea("homework")}
        </div>
        {textArea("nextSessionPlan")}

        <div className="grid gap-2">
          <p className="text-[0.8rem] font-medium text-brand-navy">Nivel de riesgo en la sesión</p>
          <RiskLevelPicker defaultValue={values.riskLevel} />
          {e.riskLevel ? <p className="text-xs text-destructive">{e.riskLevel[0]}</p> : null}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t bg-muted/40 px-5 py-3 sm:flex-row sm:items-center">
        <div className={cn("min-w-0 flex-1", !state.message && "hidden sm:block")}>
          <FormMessage message={state.ok ? undefined : state.message} />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="h-9 flex-1 sm:flex-none" onClick={onCancel} disabled={pending}>
            Cancelar
          </Button>
          <SubmitButton pending={pending} className="h-9 flex-1 sm:flex-none" pendingText="Guardando…">
            {mode === "create" ? "Guardar nota" : "Guardar cambios"}
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
