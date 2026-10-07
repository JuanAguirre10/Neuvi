"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { AppointmentStatus } from "@prisma/client";
import {
  Ban,
  Bell,
  Building2,
  CalendarPlus,
  CheckCheck,
  CircleCheck,
  DoorOpen,
  ExternalLink,
  Loader2,
  NotebookPen,
  Package,
  Pencil,
  RotateCcw,
  StickyNote,
  Trash2,
  Undo2,
  UserRound,
  UserX,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AppointmentStatusBadge, Pill, SessionsMeter } from "@/components/common/status-badges";
import { MODALITY_LABEL } from "@/lib/format";
import { cn } from "@/lib/utils";
import { changeAppointmentStatus, deleteAppointment } from "../actions";
import type { AgendaAppointment } from "../types";
import { WhatsAppReminderButton } from "./whatsapp-reminder-button";

type Handlers = {
  onEdit: (a: AgendaAppointment) => void;
  onCancel: (a: AgendaAppointment) => void;
  onRebook: (a: AgendaAppointment) => void;
};

export function AppointmentSheet({
  appointment,
  onClose,
  ...handlers
}: Handlers & { appointment: AgendaAppointment | null; onClose: () => void }) {
  return (
    <Sheet open={appointment !== null} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <SheetContent className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        {appointment ? <SheetBody a={appointment} onClose={onClose} {...handlers} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function SheetBody({ a, onClose, onEdit, onCancel, onRebook }: Handlers & { a: AgendaAppointment; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [running, setRunning] = useState<AppointmentStatus | "delete" | null>(null);

  const setStatus = (status: AppointmentStatus) => {
    setRunning(status);
    startTransition(async () => {
      const result = await changeAppointmentStatus(a.id, status);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message ?? "No se pudo actualizar la cita.");
      setRunning(null);
    });
  };

  const remove = () => {
    setRunning("delete");
    startTransition(async () => {
      const result = await deleteAppointment(a.id);
      setRunning(null);
      if (result.ok) {
        toast.success(result.message);
        onClose();
      } else {
        toast.error(result.message ?? "No se pudo eliminar la cita.");
      }
    });
  };

  const spin = (s: AppointmentStatus | "delete") => (pending && running === s ? <Loader2 className="animate-spin" /> : null);
  const active = a.status === "PROGRAMADA" || a.status === "CONFIRMADA";
  const futureTitle = a.isFutureDay ? "Disponible el día de la cita" : undefined;

  return (
    <>
      <div className="h-1.5 w-full shrink-0" style={{ backgroundColor: a.professional.color }} />
      <SheetHeader className="gap-2 border-b px-5 pt-5 pb-4">
        <div className="flex flex-wrap items-center gap-1.5 pr-8">
          <AppointmentStatusBadge status={a.status} />
          <Pill tone="gray">
            {a.modality === "VIRTUAL" ? <Video className="size-3" /> : <Building2 className="size-3" />}
            {MODALITY_LABEL[a.modality]}
          </Pill>
        </div>
        <SheetTitle className="text-xl font-semibold text-brand-navy-deep">
          {a.canOpenPatient ? (
            <Link href={`/app/pacientes/${a.patient.id}`} className="inline-flex items-center gap-1.5 hover:text-primary">
              {a.patient.name}
              <ExternalLink className="size-4 text-muted-foreground" />
            </Link>
          ) : (
            a.patient.name
          )}
        </SheetTitle>
        <SheetDescription className="text-sm">
          <span className="inline-block first-letter:uppercase">{a.dateLabel}</span> · {a.start} – {a.end}{" "}
          <span className="text-muted-foreground/80">({a.durationMin} min)</span>
        </SheetDescription>
      </SheetHeader>

      <div className="grid flex-1 content-start gap-4 overflow-y-auto px-5 py-5">
        <Detail icon={UserRound} label="Profesional">
          <span className="inline-flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: a.professional.color }} />
            {a.professional.name}
          </span>
        </Detail>
        <Detail icon={DoorOpen} label="Consultorio">
          {a.room?.name ?? <span className="text-muted-foreground">Sin consultorio asignado</span>}
        </Detail>
        <Detail icon={Package} label="Paquete">
          {a.package ? (
            <div className="grid gap-1.5">
              <span>{a.package.name}</span>
              <SessionsMeter used={a.package.used} total={a.package.total} className="max-w-64" />
            </div>
          ) : (
            <span className="text-muted-foreground">No descuenta de ningún paquete</span>
          )}
        </Detail>
        {active ? (
          <Detail icon={Bell} label="Recordatorio">
            {a.reminderSentLabel ? (
              <span className="text-success">Enviado el {a.reminderSentLabel}</span>
            ) : a.hasValidPhone ? (
              <span className="text-muted-foreground">Aún no enviado</span>
            ) : (
              <span className="text-warning">
                El paciente no tiene un celular válido.
                {a.canOpenPatient ? (
                  <>
                    {" "}
                    <Link href={`/app/pacientes/${a.patient.id}`} className="underline underline-offset-2">
                      Actualizar ficha
                    </Link>
                  </>
                ) : null}
              </span>
            )}
          </Detail>
        ) : null}
        {a.notes ? (
          <Detail icon={StickyNote} label="Notas">
            <p className="whitespace-pre-line">{a.notes}</p>
          </Detail>
        ) : null}
        {a.status === "CANCELADA" ? (
          <Detail icon={Ban} label="Motivo de cancelación">
            {a.cancelReason ?? <span className="text-muted-foreground">Sin motivo registrado</span>}
          </Detail>
        ) : null}

        {a.status === "ATENDIDA" && a.canWriteNote ? (
          <div className="rounded-xl border border-primary/20 bg-info-soft p-4">
            <p className="text-sm font-semibold text-brand-navy-deep">
              {a.hasNote ? "Esta sesión ya tiene nota de evolución" : "¿Cómo fue la sesión?"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              La nota es confidencial: solo tú, como psicólogo tratante, puedes verla.
            </p>
            <Button asChild size="sm" className="mt-3">
              <Link href={`/app/pacientes/${a.patient.id}?tab=historia&nota=${a.id}`}>
                <NotebookPen /> {a.hasNote ? "Ver nota de evolución" : "Registrar nota de evolución"}
              </Link>
            </Button>
          </div>
        ) : null}
      </div>

      <SheetFooter className="gap-2 border-t bg-muted/30 px-5 py-4">
        {active ? (
          <>
            <div className={cn("grid gap-2", a.status === "PROGRAMADA" ? "grid-cols-3" : "grid-cols-2")}>
              {a.status === "PROGRAMADA" ? (
                <Button variant="outline" size="sm" disabled={pending} onClick={() => setStatus("CONFIRMADA")}>
                  {spin("CONFIRMADA") ?? <CheckCheck />} Confirmar
                </Button>
              ) : null}
              <Button
                size="sm"
                disabled={pending || a.isFutureDay}
                title={futureTitle}
                onClick={() => setStatus("ATENDIDA")}
              >
                {spin("ATENDIDA") ?? <CircleCheck />} Atendida
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pending || a.isFutureDay}
                title={futureTitle}
                onClick={() => setStatus("NO_ASISTIO")}
              >
                {spin("NO_ASISTIO") ?? <UserX />} No asistió
              </Button>
            </div>
            <WhatsAppReminderButton
              appointmentId={a.id}
              href={a.whatsappUrl}
              sent={!!a.reminderSentLabel}
              className="w-full"
            />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" disabled={pending} onClick={() => onEdit(a)}>
                <Pencil /> Reprogramar
              </Button>
              <Button variant="destructive" size="sm" disabled={pending} onClick={() => onCancel(a)}>
                <Ban /> Cancelar cita
              </Button>
            </div>
            {a.canDelete ? <DeleteButton pending={pending} spinner={spin("delete")} onConfirm={remove} /> : null}
          </>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {a.status === "CANCELADA" ? (
              <Button variant="outline" size="sm" disabled={pending} onClick={() => setStatus("PROGRAMADA")}>
                {spin("PROGRAMADA") ?? <RotateCcw />} Reactivar
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled={pending} onClick={() => setStatus("PROGRAMADA")}>
                {spin("PROGRAMADA") ?? <Undo2 />} Deshacer
              </Button>
            )}
            <Button size="sm" disabled={pending} onClick={() => onRebook(a)}>
              <CalendarPlus /> Nueva cita
            </Button>
          </div>
        )}
      </SheetFooter>
    </>
  );
}

function Detail({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1 text-sm">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="mt-0.5 text-foreground">{children}</div>
      </div>
    </div>
  );
}

function DeleteButton({
  pending,
  spinner,
  onConfirm,
}: {
  pending: boolean;
  spinner: React.ReactNode;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" disabled={pending} className="text-muted-foreground hover:text-destructive">
          {spinner ?? <Trash2 />} Eliminar cita (registrada por error)
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar esta cita?</AlertDialogTitle>
          <AlertDialogDescription>
            Se borrará de la agenda sin dejar historial. Si el paciente canceló, mejor usa «Cancelar cita».
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Volver</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
