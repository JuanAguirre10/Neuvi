import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, CalendarCheck2, ChevronLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { requireUser } from "@/lib/auth";
import { canManageSettings, isScopedToOwnPatients } from "@/lib/permissions";
import { loadReminders } from "@/features/agenda/queries";
import { RemindersList } from "@/features/agenda/components/reminders-list";

export const metadata: Metadata = { title: "Recordatorios" };

export default async function RecordatoriosPage() {
  const user = await requireUser();
  const groups = await loadReminders(user);
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const pending = groups.reduce(
    (n, g) => n + g.items.filter((i) => i.status === "PROGRAMADA" && !i.reminderSentLabel).length,
    0,
  );
  const showProfessional = !isScopedToOwnPatients(user) && user.organization.type === "CENTRO";

  return (
    <>
      <PageHeader
        title="Recordatorios por WhatsApp"
        description={
          total === 0
            ? "Citas de hoy y mañana para recordar a tus pacientes."
            : `${pending} pendiente(s) de ${total} cita(s) entre hoy y mañana.`
        }
        actions={
          <Button asChild variant="outline">
            <Link href="/app/agenda">
              <ChevronLeft /> Volver a la agenda
            </Link>
          </Button>
        }
      />

      <div className="mb-6 flex gap-3 rounded-xl border border-primary/15 bg-info-soft px-4 py-3 text-sm text-secondary-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
        <p>
          Al hacer clic se abre WhatsApp con el mensaje listo; solo tienes que presionar «Enviar». El mensaje incluye
          nombre, fecha, hora y profesional, <strong>nunca información clínica</strong>.
          {canManageSettings(user) ? (
            <>
              {" "}
              Puedes editar el texto en{" "}
              <Link href="/app/configuracion/plantillas" className="font-medium text-primary underline-offset-2 hover:underline">
                Configuración
              </Link>
              .
            </>
          ) : null}
        </p>
      </div>

      {total === 0 ? (
        <EmptyState
          icon={CalendarCheck2}
          title="No hay citas por recordar"
          description="Cuando haya citas programadas para hoy o mañana aparecerán aquí."
          action={
            <Button asChild>
              <Link href="/app/agenda?nuevaCita=1">Agendar una cita</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-8">
          {groups.map((group) => (
            <section key={group.key} aria-labelledby={`grupo-${group.key}`}>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 id={`grupo-${group.key}`} className="text-base font-semibold text-brand-navy-deep">
                  {group.title} <span className="font-normal text-muted-foreground">· {group.subtitle}</span>
                </h2>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <BellRing className="size-3.5" />
                  {group.items.filter((i) => !i.reminderSentLabel).length} sin enviar
                </span>
              </div>
              {group.items.length === 0 ? (
                <p className="rounded-xl border border-dashed bg-card px-4 py-6 text-center text-sm text-muted-foreground">
                  No hay citas pendientes para este día.
                </p>
              ) : (
                <RemindersList items={group.items} showProfessional={showProfessional} />
              )}
            </section>
          ))}
        </div>
      )}
    </>
  );
}
