import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, CircleCheck, HeartHandshake, PackageCheck, RefreshCcw, UserRoundX } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { requireUser } from "@/lib/auth";
import { canManagePayments, canManageSettings, isScopedToOwnPatients } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { renewalWhatsappLink } from "@/features/renovaciones/messages";
import { COMPLETED_WINDOW_DAYS, getRenewalsData, type RenewalRow } from "@/features/renovaciones/queries";
import { RenewalsTable, type RenewalTableRow } from "@/features/renovaciones/components/renewals-table";

export const metadata: Metadata = { title: "Renovaciones" };

export default async function RenovacionesPage() {
  const user = await requireUser();
  const org = user.organization;
  const { toRenew, completed } = await getRenewalsData(user);

  const withLink = (rows: RenewalRow[], isCompleted: boolean): RenewalTableRow[] =>
    rows.map((r) => ({
      ...r,
      whatsappHref: renewalWhatsappLink({
        phone: r.phone,
        firstName: r.firstName,
        remaining: r.remainingSessions,
        professionalName: r.professionalName,
        orgName: org.name,
        template: org.renewalTemplate,
        completed: isCompleted,
      }),
    }));

  const canRenew = canManagePayments(user);
  const showProfessional = !isScopedToOwnPatients(user);
  const pendingNotices = toRenew.filter((r) => !r.notifiedAt).length;
  const threshold = org.renewalThreshold;

  return (
    <>
      <PageHeader
        title="Renovaciones"
        description="Pacientes cuyo paquete de sesiones está por terminar o ya terminó sin renovarse."
      />

      <section className="relative mb-6 overflow-hidden rounded-xl bg-brand-navy-deep p-5 text-white sm:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-brand-blue/30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 left-1/3 size-64 rounded-full bg-brand-teal/20 blur-3xl"
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
            <HeartHandshake className="size-5 text-brand-teal" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold">Que ningún paciente deje su proceso por un paquete vencido</p>
            <p className="mt-1 max-w-3xl text-sm text-white/75">
              Muchos pacientes abandonan el tratamiento cuando se les acaba el paquete y nadie les escribe. Neuvi detecta
              los paquetes a los que les {threshold === 1 ? "queda 1 sesión" : `quedan ${threshold} sesiones`} o menos y
              los que terminaron sin renovarse, para que envíes un aviso por WhatsApp con un clic. El mensaje nunca
              incluye información clínica.
            </p>
            {canManageSettings(user) ? (
              <Link
                href="/app/configuracion"
                className="mt-3 inline-block text-sm font-medium text-brand-sky underline-offset-2 hover:underline"
              >
                Ajustar umbral y plantilla del mensaje
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <dl className="mb-8 grid gap-3 sm:grid-cols-3">
        <Stat icon={RefreshCcw} label="Por renovar" value={toRenew.length} tone={toRenew.length ? "warning" : "default"} />
        <Stat icon={BellRing} label="Avisos pendientes" value={pendingNotices} tone={pendingNotices ? "warning" : "success"} />
        <Stat
          icon={UserRoundX}
          label={`Terminados sin renovar (${COMPLETED_WINDOW_DAYS} días)`}
          value={completed.length}
          tone={completed.length ? "danger" : "default"}
        />
      </dl>

      <section className="mb-10 grid gap-3">
        <SectionTitle
          title="Por renovar"
          description={`Paquetes activos con ${threshold === 1 ? "1 sesión restante" : `${threshold} sesiones restantes`} o menos. Los pendientes de aviso aparecen primero.`}
        />
        {toRenew.length ? (
          <RenewalsTable
            rows={withLink(toRenew, false)}
            mode="active"
            canRenew={canRenew}
            showProfessional={showProfessional}
          />
        ) : (
          <EmptyState
            icon={CircleCheck}
            title="Ningún paquete por renovar"
            description="Cuando a un paquete activo le queden pocas sesiones aparecerá aquí."
          />
        )}
      </section>

      <section className="grid gap-3">
        <SectionTitle
          title="Paquetes terminados sin renovar"
          description={`Terminaron en los últimos ${COMPLETED_WINDOW_DAYS} días y el paciente no tiene un paquete activo: riesgo de abandono. No incluye pacientes dados de alta.`}
        />
        {completed.length ? (
          <RenewalsTable
            rows={withLink(completed, true)}
            mode="completed"
            canRenew={canRenew}
            showProfessional={showProfessional}
          />
        ) : (
          <EmptyState
            icon={PackageCheck}
            title="Sin pacientes en riesgo"
            description="Todos los pacientes con paquetes terminados recientemente ya renovaron o fueron dados de alta."
          />
        )}
      </section>
    </>
  );
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-brand-navy-deep">{title}</h2>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: "default" | "warning" | "success" | "danger";
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-xs">
      <span
        className={cn(
          "flex size-10 items-center justify-center rounded-lg",
          tone === "default" && "bg-secondary text-primary",
          tone === "warning" && "bg-warning-soft text-warning",
          tone === "success" && "bg-success-soft text-success",
          tone === "danger" && "bg-danger-soft text-destructive",
        )}
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <dt className="truncate text-xs text-muted-foreground">{label}</dt>
        <dd className="text-2xl leading-tight font-semibold text-brand-navy-deep">{value}</dd>
      </div>
    </div>
  );
}
