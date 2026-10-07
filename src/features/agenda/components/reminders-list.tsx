"use client";

import { useTransition } from "react";
import Link from "next/link";
import { CheckCheck, CircleCheck, DoorOpen, Loader2, Phone, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AppointmentStatusBadge, Pill } from "@/components/common/status-badges";
import { changeAppointmentStatus } from "../actions";
import type { ReminderItem } from "../types";
import { WhatsAppReminderButton } from "./whatsapp-reminder-button";

export function RemindersList({ items, showProfessional }: { items: ReminderItem[]; showProfessional: boolean }) {
  return (
    <ul className="divide-y rounded-xl border bg-card shadow-xs">
      {items.map((item) => (
        <ReminderRow key={item.id} item={item} showProfessional={showProfessional} />
      ))}
    </ul>
  );
}

function ReminderRow({ item, showProfessional }: { item: ReminderItem; showProfessional: boolean }) {
  const [pending, startTransition] = useTransition();

  const confirm = () =>
    startTransition(async () => {
      const result = await changeAppointmentStatus(item.id, "CONFIRMADA");
      if (result.ok) toast.success(`${item.patient.name}: asistencia confirmada.`);
      else toast.error(result.message ?? "No se pudo confirmar la cita.");
    });

  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 gap-3">
        <div className="w-12 shrink-0 text-right">
          <p className="text-sm font-semibold text-brand-navy-deep tabular-nums">{item.start}</p>
          <p className="text-xs text-muted-foreground tabular-nums">{item.end}</p>
        </div>
        <span className="w-1 shrink-0 rounded-full" style={{ backgroundColor: item.professional.color }} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/app/pacientes/${item.patient.id}`}
              className="truncate font-semibold text-brand-navy-deep hover:text-primary"
            >
              {item.patient.name}
            </Link>
            <AppointmentStatusBadge status={item.status} />
            {item.reminderSentLabel ? (
              <Pill tone="teal">
                <CircleCheck className="size-3" /> Enviado {item.reminderSentLabel}
              </Pill>
            ) : null}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {showProfessional ? <span>{item.professional.name}</span> : null}
            {item.room ? (
              <span className="inline-flex items-center gap-1">
                <DoorOpen className="size-3" /> {item.room}
              </span>
            ) : null}
            {item.whatsappUrl ? (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Phone className="size-3" /> {item.patient.phoneLabel}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-warning">
                <TriangleAlert className="size-3" />
                {item.patient.phoneLabel ? `Celular no válido (${item.patient.phoneLabel})` : "Sin celular registrado"} ·{" "}
                <Link href={`/app/pacientes/${item.patient.id}`} className="underline underline-offset-2">
                  Actualizar ficha
                </Link>
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
        {item.status === "PROGRAMADA" ? (
          <Button variant="outline" size="sm" onClick={confirm} disabled={pending} title="El paciente confirmó por WhatsApp">
            {pending ? <Loader2 className="animate-spin" /> : <CheckCheck />} Confirmó
          </Button>
        ) : null}
        <WhatsAppReminderButton appointmentId={item.id} href={item.whatsappUrl} sent={!!item.reminderSentLabel} />
      </div>
    </li>
  );
}
