import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck2, CalendarPlus, RefreshCcw, ShieldAlert, UserRoundPlus, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageHeader } from "@/components/common/page-header";
import { requireUser } from "@/lib/auth";
import { canManagePayments, canViewCashbox, isScopedToOwnPatients } from "@/lib/permissions";
import { formatPEN } from "@/lib/format";
import { loadDashboard } from "@/features/dashboard/queries";
import { KpiCard } from "@/features/dashboard/components/kpi-card";
import { OnboardingChecklist } from "@/features/dashboard/components/onboarding-checklist";
import { TodayAgenda } from "@/features/dashboard/components/today-agenda";
import { RemindersCard, RenewalsCard } from "@/features/dashboard/components/side-cards";

export const metadata: Metadata = { title: "Inicio" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function InicioPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const welcome = sp.bienvenida === "1";
  const denied = sp.denegado === "1";

  const data = await loadDashboard(user, { welcome });
  const showCash = canViewCashbox(user) && data.monthIncomeCents !== null;
  const showProfessional = !isScopedToOwnPatients(user) && user.organization.type === "CENTRO";

  return (
    <>
      <PageHeader
        title={`${data.greeting}, ${data.firstName}`}
        description={<span className="inline-block first-letter:uppercase">{data.todayLabel} · {user.organization.name}</span>}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/app/pacientes/nuevo">
                <UserRoundPlus /> Nuevo paciente
              </Link>
            </Button>
            <Button asChild>
              <Link href="/app/agenda?nuevaCita=1">
                <CalendarPlus /> Nueva cita
              </Link>
            </Button>
          </>
        }
      />

      {denied ? (
        <Alert variant="destructive" className="mb-6 border-destructive/30 bg-danger-soft">
          <ShieldAlert />
          <AlertTitle>No tienes permiso para acceder a esa sección.</AlertTitle>
          <AlertDescription>Si crees que es un error, pide acceso al administrador de tu consultorio.</AlertDescription>
        </Alert>
      ) : null}

      {data.onboarding ? <OnboardingChecklist items={data.onboarding} welcome={welcome} /> : null}

      <div className={`mb-6 grid grid-cols-2 gap-3 sm:gap-4 ${showCash ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        <KpiCard
          icon={CalendarCheck2}
          label="Citas de hoy"
          value={data.todayItems.length}
          hint={
            data.todayItems.length === 0
              ? "Agenda libre"
              : `${data.attendedToday} atendida(s) · ${data.pendingToday} por atender`
          }
          href={`/app/agenda?vista=dia&fecha=${data.today}`}
          tone="blue"
        />
        <KpiCard
          icon={Users}
          label="Pacientes activos"
          value={data.activePatients}
          hint={isScopedToOwnPatients(user) ? "Tus pacientes en tratamiento" : "En tratamiento"}
          href="/app/pacientes"
          tone="teal"
        />
        <KpiCard
          icon={RefreshCcw}
          label="Renovaciones pendientes"
          value={data.renewalsCount}
          hint={data.renewalsCount === 0 ? "Todo al día" : "Paquetes por terminar"}
          href="/app/renovaciones"
          tone="amber"
          highlight={data.renewalsCount > 0}
        />
        {showCash ? (
          <KpiCard
            icon={Wallet}
            label="Ingresos del mes"
            value={formatPEN(data.monthIncomeCents ?? 0)}
            hint={`${data.monthPaymentsCount} pago(s) registrados`}
            href="/app/pagos"
            tone="navy"
          />
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TodayAgenda items={data.todayItems} today={data.today} showProfessional={showProfessional} />
        </div>
        <div className="grid content-start gap-6">
          <RemindersCard pending={data.tomorrowPending} total={data.tomorrowTotal} dateLabel={data.tomorrowLabel} />
          <RenewalsCard items={data.renewals} total={data.renewalsCount} canSeeBalance={canManagePayments(user)} />
        </div>
      </div>
    </>
  );
}
