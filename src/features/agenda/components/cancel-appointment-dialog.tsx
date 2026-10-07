"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/common/form";
import { cn } from "@/lib/utils";
import { changeAppointmentStatus } from "../actions";
import { CANCEL_REASONS } from "../lib";
import type { AgendaAppointment } from "../types";

export function CancelAppointmentDialog({
  appointment,
  onClose,
}: {
  appointment: AgendaAppointment | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={appointment !== null} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-brand-navy-deep">Cancelar cita</DialogTitle>
          {appointment ? (
            <DialogDescription>
              {appointment.patient.name} · {appointment.dateLabel}, {appointment.start} – {appointment.end}. El horario
              quedará libre y la sesión no se descontará del paquete.
            </DialogDescription>
          ) : null}
        </DialogHeader>
        {appointment ? <CancelForm appointment={appointment} onDone={onClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function CancelForm({ appointment, onDone }: { appointment: AgendaAppointment; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    startTransition(async () => {
      const result = await changeAppointmentStatus(appointment.id, "CANCELADA", reason);
      if (result.ok) {
        toast.success(result.message);
        onDone();
      } else {
        toast.error(result.message ?? "No se pudo cancelar la cita.");
      }
    });
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-1.5">
        {CANCEL_REASONS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setReason(r)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              reason === r
                ? "border-primary bg-secondary text-primary"
                : "text-muted-foreground hover:border-brand-sky hover:text-foreground",
            )}
          >
            {r}
          </button>
        ))}
      </div>
      <Field label="Motivo de la cancelación" htmlFor="cancelReason" hint="Opcional. Queda en el historial de la cita.">
        <Textarea
          id="cancelReason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={300}
          rows={3}
          placeholder="Ej.: El paciente avisó que viajará."
        />
      </Field>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={pending}>
            Volver
          </Button>
        </DialogClose>
        <Button type="button" variant="destructive" onClick={submit} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          Cancelar cita
        </Button>
      </DialogFooter>
    </div>
  );
}
