"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, Info, Lock, PackageCheck, TriangleAlert, Video } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, FormMessage, SubmitButton, useServerForm } from "@/components/common/form";
import { MODALITY_LABEL } from "@/lib/format";
import { cn } from "@/lib/utils";
import { createAppointment, updateAppointment } from "../actions";
import { isValidTime, minutesToTime, timeSlots, timeToMinutes } from "../lib";
import type { AgendaAppointment, AgendaPatientOption, AgendaProfessional, AgendaRoom } from "../types";
import { PatientCombobox } from "./patient-combobox";

export type FormIntent =
  | { mode: "create"; patientId?: string; professionalId?: string; date: string; time?: string }
  | { mode: "edit"; appointment: AgendaAppointment };

type SharedProps = {
  patients: AgendaPatientOption[];
  professionals: AgendaProfessional[];
  rooms: AgendaRoom[];
  canManageAll: boolean;
  currentUserId: string;
  defaultDuration: number;
  suggestedTime: string;
  /** Se llama tras guardar con la fecha (YYYY-MM-DD) de la cita. */
  onSaved: (dateKey: string) => void;
};

export function AppointmentFormDialog({
  intent,
  onClose,
  ...shared
}: SharedProps & { intent: FormIntent | null; onClose: () => void }) {
  const isEdit = intent?.mode === "edit";
  return (
    <Dialog open={intent !== null} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-brand-navy-deep">
            {isEdit ? "Reprogramar cita" : "Nueva cita"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Cambia la fecha, hora, profesional o consultorio. Validamos que no haya cruces."
              : "Neuvi valida que el profesional y el consultorio estén libres en ese horario."}
          </DialogDescription>
        </DialogHeader>
        {/* Radix desmonta el contenido al cerrar: cada apertura empieza con estado limpio. */}
        {intent ? <AppointmentForm intent={intent} {...shared} /> : null}
      </DialogContent>
    </Dialog>
  );
}

const DURATION_PRESETS = [30, 45, 50, 60, 90];

/**
 * Profesional elegido a mano. Si el paciente tiene psicólogo tratante, el formulario agenda con él
 * y este valor no se usa (aunque la URL o el horario elegido indiquen otro profesional).
 */
function initialProfessional(intent: FormIntent, professionals: AgendaProfessional[], currentUserId: string): string {
  if (intent.mode === "edit") return intent.appointment.professional.id;
  const ids = new Set(professionals.map((p) => p.id));
  if (intent.professionalId && ids.has(intent.professionalId)) return intent.professionalId;
  if (ids.has(currentUserId)) return currentUserId;
  return professionals.length === 1 ? professionals[0]!.id : "";
}

type ProfessionalOption = Pick<AgendaProfessional, "id" | "name" | "color">;

const TREATING_HINT = "Psicólogo tratante del paciente. Para cambiarlo, edita su ficha.";

/** Ayuda bajo el campo «Profesional» según la regla «las citas se agendan con el tratante». */
function professionalHint({
  editing,
  patient,
  treating,
  canManageAll,
}: {
  editing: AgendaAppointment | null;
  patient: AgendaPatientOption | undefined;
  treating: ProfessionalOption | undefined;
  canManageAll: boolean;
}): string | undefined {
  if (!canManageAll) return undefined; // el psicólogo solo agenda a sus propios pacientes
  if (!editing) {
    if (!patient) return undefined;
    if (!patient.professionalId) return "Quedará como su psicólogo tratante.";
    return treating ? TREATING_HINT : undefined; // tratante inactivo: lo explica el aviso
  }
  const treatingId = editing.patient.treatingId;
  if (!treatingId) return "El paciente no tiene psicólogo tratante. Asígnale uno en su ficha para cambiar de profesional.";
  if (treatingId === editing.professional.id) return TREATING_HINT;
  if (treating) return `Puedes pasar la cita a ${treating.name}, su psicólogo tratante actual.`;
  return "Su psicólogo tratante ya no está activo. Asígnale otro en su ficha para cambiar de profesional.";
}

function AppointmentForm({
  intent,
  patients,
  professionals,
  rooms,
  canManageAll,
  currentUserId,
  defaultDuration,
  suggestedTime,
  onSaved,
}: SharedProps & { intent: FormIntent }) {
  const editing = intent.mode === "edit" ? intent.appointment : null;

  const [patientId, setPatientId] = useState(() =>
    intent.mode === "create" && patients.some((p) => p.id === intent.patientId) ? (intent.patientId ?? "") : "",
  );
  const [professionalId, setProfessionalId] = useState(() => initialProfessional(intent, professionals, currentUserId));
  const [date, setDate] = useState(editing ? editing.dateKey : intent.mode === "create" ? intent.date : "");
  const [time, setTime] = useState(editing ? editing.start : intent.mode === "create" ? (intent.time ?? suggestedTime) : "");
  const [duration, setDuration] = useState(String(editing ? editing.durationMin : defaultDuration));
  const [roomId, setRoomId] = useState(editing?.room?.id ?? "none");
  const [modality, setModality] = useState<"PRESENCIAL" | "VIRTUAL">(editing?.modality ?? "PRESENCIAL");

  const action = editing ? updateAppointment.bind(null, editing.id) : createAppointment;
  const { state, pending, onSubmit } = useServerForm(action, {
    onSuccess: (s) => {
      toast.success(s.message ?? "Cita guardada.");
      onSaved(date);
    },
  });
  const e = state.fieldErrors ?? {};

  const patient = patients.find((p) => p.id === patientId);
  const slots = timeSlots();
  if (isValidTime(time) && !slots.includes(time)) {
    slots.push(time);
    slots.sort();
  }
  const roomOptions =
    editing?.room && !rooms.some((r) => r.id === editing.room?.id) ? [...rooms, editing.room] : rooms;
  const presets = DURATION_PRESETS.includes(defaultDuration)
    ? DURATION_PRESETS
    : [...DURATION_PRESETS, defaultDuration].sort((a, b) => a - b);

  const durationMin = Number(duration);
  const endLabel =
    isValidTime(time) && Number.isInteger(durationMin) && durationMin > 0
      ? (() => {
          const end = timeToMinutes(time) + durationMin;
          return end >= 24 * 60 ? `${minutesToTime(end - 24 * 60)} (día siguiente)` : minutesToTime(end);
        })()
      : null;

  // ---------- Profesional: las citas se agendan con el psicólogo tratante ----------
  const treatingId = editing ? editing.patient.treatingId : (patient?.professionalId ?? null);
  const treating = treatingId ? professionals.find((p) => p.id === treatingId) : undefined;
  // Nueva cita de un paciente con tratante: se agenda con él, sin opción de elegir otro.
  const lockedTo = editing ? null : treatingId;
  // Reprogramar: se mantiene el profesional actual o se pasa al tratante actual.
  const options: ProfessionalOption[] = editing
    ? [editing.professional, ...(treating && treating.id !== editing.professional.id ? [treating] : [])]
    : professionals;
  const selectedProfessionalId = lockedTo ?? professionalId;
  const professionalLocked = lockedTo !== null || !canManageAll || options.length <= 1;
  const lockedProfessional = options.find((p) => p.id === selectedProfessionalId);
  // El tratante ya no figura entre los profesionales activos: se avisa y el servidor explica al enviar.
  const treatingUnavailable = lockedTo !== null && !lockedProfessional;
  const hint = professionalHint({ editing, patient, treating, canManageAll });

  return (
    <form method="post" onSubmit={onSubmit} className="grid gap-4" noValidate>
      <FormMessage message={state.ok ? undefined : state.message} />

      {editing ? (
        <div className="rounded-lg border bg-muted/40 px-3 py-2.5">
          <p className="text-xs text-muted-foreground">Paciente</p>
          <p className="font-medium text-brand-navy-deep">{editing.patient.name}</p>
        </div>
      ) : (
        <Field label="Paciente" htmlFor="patientId" error={e.patientId} required>
          <PatientCombobox
            id="patientId"
            patients={patients}
            value={patientId}
            onChange={setPatientId}
            invalid={!!e.patientId}
          />
          <input type="hidden" name="patientId" value={patientId} />
        </Field>
      )}

      <PackageHint editing={editing} patient={patient} />

      <Field label="Profesional" htmlFor="professionalId" error={e.professionalId} hint={hint} required>
        {professionalLocked ? (
          <div
            className={cn(
              "flex h-10 items-center gap-2 rounded-lg border bg-muted/40 px-3",
              e.professionalId && "border-destructive",
            )}
          >
            <span
              className="size-2.5 shrink-0 rounded-full bg-muted-foreground/40"
              style={lockedProfessional ? { backgroundColor: lockedProfessional.color } : undefined}
            />
            <span className={cn("truncate", treatingUnavailable && "text-muted-foreground")}>
              {lockedProfessional?.name ??
                (treatingUnavailable ? (patient?.professionalName ?? "Psicólogo tratante") : "Sin profesional disponible")}
            </span>
            {treatingUnavailable ? <span className="shrink-0 text-xs text-muted-foreground">(inactivo)</span> : null}
            {lockedTo !== null ? <Lock className="ml-auto size-3.5 shrink-0 text-muted-foreground" aria-hidden /> : null}
          </div>
        ) : (
          <Select value={professionalId} onValueChange={setProfessionalId}>
            <SelectTrigger id="professionalId" className="h-10 w-full" aria-invalid={!!e.professionalId || undefined}>
              <SelectValue placeholder="Elige el profesional" />
            </SelectTrigger>
            <SelectContent position="popper">
              {options.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {/* Siempre un input oculto (nunca deshabilitado): el valor bloqueado también se envía. */}
        <input type="hidden" name="professionalId" value={selectedProfessionalId} />
        {treatingUnavailable && patient ? (
          <Hint tone="warn">
            {patient.professionalName ?? "Su psicólogo tratante"} ya no está activo como profesional. Asigna otro
            psicólogo tratante en la{" "}
            <Link href={`/app/pacientes/${patient.id}/editar`} className="font-medium underline underline-offset-2">
              ficha del paciente
            </Link>{" "}
            para poder agendar.
          </Hint>
        ) : null}
      </Field>

      <div className="grid gap-4 sm:grid-cols-[1.3fr_1fr_1fr]">
        <Field label="Fecha" htmlFor="date" error={e.date} required>
          <Input
            id="date"
            name="date"
            type="date"
            value={date}
            onChange={(ev) => setDate(ev.target.value)}
            className="h-10"
            aria-invalid={!!e.date || undefined}
          />
        </Field>
        <Field label="Hora de inicio" htmlFor="time" error={e.time} required>
          <Select value={time} onValueChange={setTime}>
            <SelectTrigger id="time" className="h-10 w-full tabular-nums" aria-invalid={!!e.time || undefined}>
              <SelectValue placeholder="--:--" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {slots.map((s) => (
                <SelectItem key={s} value={s} className="tabular-nums">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="time" value={time} />
        </Field>
        <Field
          label="Duración (min)"
          htmlFor="duration"
          error={e.duration}
          hint={endLabel ? `Termina a las ${endLabel}` : undefined}
          required
        >
          <Input
            id="duration"
            name="duration"
            type="number"
            inputMode="numeric"
            min={10}
            max={480}
            step={5}
            value={duration}
            onChange={(ev) => setDuration(ev.target.value)}
            className="h-10 tabular-nums"
            aria-invalid={!!e.duration || undefined}
          />
        </Field>
      </div>

      <div className="-mt-2 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs text-muted-foreground">Duración rápida:</span>
        {presets.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setDuration(String(m))}
            className={cn(
              "h-6 rounded-full border px-2.5 text-xs font-medium tabular-nums transition-colors",
              Number(duration) === m
                ? "border-primary bg-secondary text-primary"
                : "text-muted-foreground hover:border-brand-sky hover:text-foreground",
            )}
          >
            {m} min
          </button>
        ))}
      </div>

      <div className={cn("grid gap-4", roomOptions.length > 0 && "sm:grid-cols-2")}>
        {roomOptions.length > 0 ? (
          <Field label="Consultorio" htmlFor="roomId" error={e.roomId}>
            <Select value={roomId} onValueChange={setRoomId}>
              <SelectTrigger id="roomId" className="h-10 w-full" aria-invalid={!!e.roomId || undefined}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="none">Sin consultorio asignado</SelectItem>
                {roomOptions.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="roomId" value={roomId} />
          </Field>
        ) : null}

        <Field label="Modalidad" error={e.modality} required>
          <div role="radiogroup" aria-label="Modalidad" className="grid h-10 grid-cols-2 gap-1 rounded-lg border bg-muted/50 p-1">
            {(["PRESENCIAL", "VIRTUAL"] as const).map((m) => {
              const Icon = m === "PRESENCIAL" ? Building2 : Video;
              const active = modality === m;
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setModality(m)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors",
                    active
                      ? "bg-card text-primary shadow-xs ring-1 ring-border"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" /> {MODALITY_LABEL[m]}
                </button>
              );
            })}
          </div>
          <input type="hidden" name="modality" value={modality} />
        </Field>
      </div>

      <Field
        label="Notas de la cita"
        htmlFor="notes"
        error={e.notes}
        hint="Solo datos administrativos (no clínicos): p. ej. «trae boleta», «primera consulta»."
      >
        <Textarea id="notes" name="notes" defaultValue={editing?.notes ?? ""} maxLength={500} rows={2} />
      </Field>

      <DialogFooter className="mt-1">
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </DialogClose>
        <SubmitButton pending={pending} pendingText="Guardando…">
          {editing ? "Guardar cambios" : "Agendar cita"}
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}

function PackageHint({
  editing,
  patient,
}: {
  editing: AgendaAppointment | null;
  patient: AgendaPatientOption | undefined;
}) {
  if (editing) {
    return editing.package ? (
      <Hint tone="ok">
        Descuenta del paquete <strong>{editing.package.name}</strong> ({editing.package.used} de{" "}
        {editing.package.total} sesiones usadas).
      </Hint>
    ) : (
      <Hint tone="info">Esta cita no descuenta de ningún paquete. Si el paciente ya compró uno, se asociará al guardar.</Hint>
    );
  }
  if (!patient) return null;
  return patient.freePackage ? (
    <Hint tone="ok">
      Se descontará del paquete <strong>{patient.freePackage.name}</strong> ({patient.freePackage.free}{" "}
      {patient.freePackage.free === 1 ? "sesión libre" : "sesiones libres"}).
    </Hint>
  ) : (
    <Hint tone="warn">
      La sesión no se descontará de ningún paquete. Registra un paquete en la ficha del paciente para controlar
      sesiones y pagos.
    </Hint>
  );
}

function Hint({ tone, children }: { tone: "ok" | "warn" | "info"; children: React.ReactNode }) {
  const Icon = tone === "ok" ? PackageCheck : tone === "warn" ? TriangleAlert : Info;
  return (
    <div
      className={cn(
        "flex gap-2 rounded-lg px-3 py-2 text-xs leading-relaxed",
        tone === "ok" && "bg-success-soft text-success",
        tone === "warn" && "bg-warning-soft text-warning",
        tone === "info" && "bg-info-soft text-secondary-foreground",
      )}
    >
      <Icon className="mt-0.5 size-3.5 shrink-0" />
      <p>{children}</p>
    </div>
  );
}
