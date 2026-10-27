import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  Ban,
  Building2,
  CalendarCheck2,
  CircleDollarSign,
  Clock,
  Hourglass,
  ReceiptText,
  Sparkles,
  Stethoscope,
  TimerOff,
  TrendingUp,
  TriangleAlert,
  Users,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { requirePlatformAdmin } from "@/lib/platform-auth";
import { daysUntil, formatDate, formatLongDate, formatShortDateOnly } from "@/lib/dates";
import { formatPEN, formatPENWhole } from "@/lib/format";
import { KpiCard } from "@/features/dashboard/components/kpi-card";
import { ChartCard } from "@/features/reportes/chart-card";
import { ACCOUNT_STATUS_FILTER_LABEL } from "@/features/admin/billing";
import { monthLabel, shortMonthLabel } from "@/features/admin/filters";
import { getDashboardData } from "@/features/admin/queries";
import { AccountsByStateChart, CollectedChart, SignupsChart } from "@/features/admin/components/admin-charts";
import { EventList } from "@/features/admin/components/event-list";
import { ListCard } from "@/features/admin/components/list-card";

// El template del layout (panel) solo aplica a los segmentos hijos, no a esta página.
export const metadata: Metadata = { title: { absolute: "Resumen · Admin Neuvi" } };

const int = new Intl.NumberFormat("es-PE");
const penCompact = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", notation: "compact", maximumFractionDigits: 1 });

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{children}</h2>;
}

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ denegado?: string }> }) {
  await requirePlatformAdmin();
  const [{ denegado }, d] = await Promise.all([searchParams, getDashboardData()]);

  const signups = d.signups.map((p) => ({
    label: shortMonthLabel(p.key),
    month: monthLabel(p.key),
    individual: p.individual,
    centro: p.centro,
  }));
  const lastKey = d.collected.at(-1)?.key;
  const collected = d.collected.map((p) => ({
    label: shortMonthLabel(p.key),
    month: monthLabel(p.key),
    cobrado: p.cents,
    tag: p.key === lastKey && p.cents > 0 ? penCompact.format(p.cents / 100) : "",
  }));
  const byState = d.byStatePlan.map((r) => ({
    name: ACCOUNT_STATUS_FILTER_LABEL[r.state],
    individual: r.individual,
    centro: r.centro,
    total: r.individual + r.centro,
  }));
  const signupsTotal = signups.reduce((s, p) => s + p.individual + p.centro, 0);
  const collectedTotal = collected.reduce((s, p) => s + p.cobrado, 0);

  return (
    <>
      <PageHeader
        title="Resumen"
        description={<span className="first-letter:uppercase">Cuentas suscritas a Neuvi · {formatLongDate(new Date())}</span>}
      />

      {denegado ? (
        <p role="alert" className="mb-6 rounded-lg bg-warning-soft px-4 py-3 text-sm text-warning">
          Tu rol no tiene acceso a esa sección del panel.
        </p>
      ) : null}

      <div className="grid gap-6">
        <section aria-labelledby="kpi-cuentas">
          <SectionTitle>
            <span id="kpi-cuentas">Cuentas</span>
          </SectionTitle>
          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
            <KpiCard icon={Building2} label="Cuentas registradas" value={int.format(d.totalAccounts)} href="/admin/cuentas" hint="Psicólogos y centros" />
            <KpiCard
              icon={Sparkles}
              tone="teal"
              label="Activas pagando"
              value={int.format(d.activePaying)}
              href="/admin/cuentas?estado=ACTIVA"
              hint={d.activeWithoutPrice > 0 ? `${d.activeWithoutPrice} sin precio definido` : "Con plan activo"}
            />
            <KpiCard icon={Hourglass} label="En prueba" value={int.format(d.inTrial)} href="/admin/cuentas?estado=PRUEBA" hint="Prueba vigente" />
            <KpiCard
              icon={Clock}
              tone="amber"
              label="Pruebas por vencer"
              value={int.format(d.trialsEndingSoon)}
              href="/admin/cuentas?estado=PRUEBA&orden=prueba"
              hint="En los próximos 7 días"
              highlight={d.trialsEndingSoon > 0}
            />
            <KpiCard
              icon={TimerOff}
              tone="amber"
              label="Pruebas vencidas"
              value={int.format(d.trialsExpired)}
              href="/admin/cuentas?estado=PRUEBA_VENCIDA"
              hint="Sin activar un plan"
              highlight={d.trialsExpired > 0}
            />
            <KpiCard
              icon={Ban}
              tone="navy"
              label="Suspendidas / canceladas"
              value={`${int.format(d.suspended)} / ${int.format(d.canceled)}`}
              href="/admin/cuentas?estado=SUSPENDIDA"
              hint="Sin acceso al panel"
            />
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <section aria-labelledby="kpi-ingresos">
            <SectionTitle>
              <span id="kpi-ingresos">Ingresos</span>
            </SectionTitle>
            <div className="grid gap-3 sm:grid-cols-3">
              <KpiCard icon={TrendingUp} tone="teal" label="MRR estimado" value={formatPENWhole(d.mrrCents)} hint="Activas × psicólogos × precio" />
              <KpiCard icon={Wallet} label="Cobrado este mes" value={formatPENWhole(d.collectedMonthCents)} href="/admin/facturacion" hint="Pagos registrados" />
              <KpiCard
                icon={CircleDollarSign}
                tone="amber"
                label="Deuda vencida"
                value={formatPENWhole(d.overdueCents)}
                href="/admin/facturacion?estado=VENCIDA"
                hint={`${int.format(d.overdueInvoices)} factura${d.overdueInvoices === 1 ? "" : "s"} vencida${d.overdueInvoices === 1 ? "" : "s"}`}
                highlight={d.overdueCents > 0}
              />
            </div>
          </section>
          <section aria-labelledby="kpi-uso">
            <SectionTitle>
              <span id="kpi-uso">Uso de la plataforma</span>
            </SectionTitle>
            <div className="grid gap-3 sm:grid-cols-3">
              <KpiCard icon={Stethoscope} tone="navy" label="Profesionales activos" value={int.format(d.activeProfessionals)} hint="En cuentas con acceso" />
              <KpiCard icon={Users} tone="navy" label="Pacientes" value={int.format(d.totalPatients)} hint="Solo el conteo total" />
              <KpiCard icon={CalendarCheck2} tone="navy" label="Sesiones atendidas" value={int.format(d.attendedLast30)} hint="Últimos 30 días" />
            </div>
          </section>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard
            title="Altas por mes"
            description="Cuentas nuevas en los últimos 12 meses, por tipo."
            empty={signupsTotal === 0}
            emptyText="No hubo altas en los últimos 12 meses."
            table={{
              columns: ["Mes", "Individual", "Centro"],
              rows: signups.map((p) => [p.month, p.individual, p.centro]),
            }}
          >
            <SignupsChart data={signups} />
          </ChartCard>

          <ChartCard
            title="Cobrado por mes"
            description="Pagos de suscripción registrados en los últimos 12 meses."
            empty={collectedTotal === 0}
            emptyText="Aún no se registran cobros."
            table={{ columns: ["Mes", "Cobrado"], rows: collected.map((p) => [p.month, formatPEN(p.cobrado)]) }}
          >
            <CollectedChart data={collected} />
          </ChartCard>

          <ChartCard
            title="Cuentas por estado y plan"
            description="Situación actual de todas las cuentas."
            empty={d.totalAccounts === 0}
            emptyText="Aún no hay cuentas registradas."
            table={{
              columns: ["Estado", "Individual", "Centro", "Total"],
              rows: byState.map((r) => [r.name, r.individual, r.centro, r.total]),
            }}
          >
            <AccountsByStateChart data={byState} />
          </ChartCard>

          <ListCard
            icon={Clock}
            iconClassName="text-warning"
            title="Pruebas por vencer"
            count={d.trialsEndingSoon}
            href="/admin/cuentas?estado=PRUEBA&orden=prueba"
            hrefLabel="Ver cuentas en prueba"
            empty={d.trialsSoon.length === 0}
            emptyText="Ninguna prueba vence en los próximos 7 días."
          >
            <ul className="divide-y">
              {d.trialsSoon.map((t) => {
                const days = Math.max(0, daysUntil(t.trialEndsAt));
                return (
                  <li key={t.orgId}>
                    <Link href={`/admin/cuentas/${t.orgId}`} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-brand-navy-deep">{t.orgName}</p>
                        <p className="text-xs text-muted-foreground">
                          Plan {t.planCode === "CENTRO" ? "Centro" : "Individual"} · vence el {formatDate(t.trialEndsAt)}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning">
                        {days <= 1 ? "1 día" : `${days} días`}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </ListCard>

          <ListCard
            icon={TriangleAlert}
            iconClassName="text-destructive"
            title="Facturas vencidas"
            count={d.overdueInvoices}
            href="/admin/facturacion?estado=VENCIDA"
            hrefLabel="Ver facturas vencidas"
            empty={d.overdueList.length === 0}
            emptyText="No hay facturas vencidas."
          >
            <ul className="divide-y">
              {d.overdueList.map((inv) => (
                <li key={inv.id}>
                  <Link href={`/admin/cuentas/${inv.orgId}?tab=facturacion`} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50">
                    <ReceiptText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-brand-navy-deep">{inv.orgName}</p>
                      <p className="text-xs text-muted-foreground">
                        {inv.number} · venció el {formatShortDateOnly(inv.dueDate)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-destructive tabular-nums">{formatPEN(inv.balanceCents)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </ListCard>

          <ListCard
            icon={Activity}
            title="Actividad reciente"
            href="/admin/actividad"
            hrefLabel="Ver toda la actividad"
            empty={d.events.length === 0}
            emptyText="Aún no hay movimientos."
          >
            <EventList events={d.events} className="px-5 py-4" />
          </ListCard>
        </div>
      </div>
    </>
  );
}
