import type { Metadata } from "next";
import { Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { requireRole } from "@/lib/auth";
import { formatPEN } from "@/lib/format";
import { previousMonth, resolveMonth } from "@/features/reportes/month";
import { getMonthTotals, getReportData } from "@/features/reportes/queries";
import { MonthPicker } from "@/features/reportes/month-picker";
import { KpiCard, type KpiDelta } from "@/features/reportes/kpi-card";
import { ChartCard } from "@/features/reportes/chart-card";
import { CategoryBarChart, RevenueByWeekChart, SessionsByWeekChart } from "@/features/reportes/charts";

export const metadata: Metadata = { title: "Reportes" };

const percent = new Intl.NumberFormat("es-PE", { style: "percent", maximumFractionDigits: 1 });
const int = new Intl.NumberFormat("es-PE");

function formatRate(value: number | null): string {
  return value == null ? "—" : percent.format(value);
}

function direction(diff: number): KpiDelta["direction"] {
  return diff > 0 ? "up" : diff < 0 ? "down" : "flat";
}

function signed(n: number, text: string): string {
  return n > 0 ? `+${text}` : n < 0 ? `−${text}` : text;
}

function countDelta(curr: number, prev: number, against: string, upIsGood = true): KpiDelta {
  const diff = curr - prev;
  return { text: signed(diff, int.format(Math.abs(diff))), direction: direction(diff), upIsGood, against };
}

function moneyDelta(curr: number, prev: number, against: string): KpiDelta {
  const diff = curr - prev;
  const text =
    prev > 0 ? signed(diff, percent.format(Math.abs(diff) / prev)) : signed(diff, formatPEN(Math.abs(diff)));
  return { text, direction: direction(diff), upIsGood: true, against };
}

function rateDelta(curr: number | null, prev: number | null, against: string): KpiDelta | undefined {
  if (curr == null || prev == null) return undefined;
  const diff = Math.round((curr - prev) * 1000) / 10; // puntos porcentuales, 1 decimal
  return {
    text: signed(diff, `${Math.abs(diff).toLocaleString("es-PE")} pp`),
    direction: direction(diff),
    upIsGood: false,
    against,
  };
}

export default async function ReportesPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const user = await requireRole("ADMIN");
  const org = user.organization;
  const { mes } = await searchParams;
  const month = resolveMonth(mes);
  const prev = previousMonth(month);

  const [data, prevTotals] = await Promise.all([
    getReportData({ organizationId: user.organizationId, noShowConsumesSession: org.noShowConsumesSession }, month),
    getMonthTotals(user.organizationId, prev),
  ]);

  const against = `vs. ${prev.label.split(" de ")[0]}`;
  const isCenter = org.type === "CENTRO";
  const sessionsEmpty = data.weeks.every((w) => w.atendidas + w.noAsistio + w.canceladas === 0);
  const revenueEmpty = data.revenueCents === 0;
  const professionals = data.byProfessional.map((p) => ({ name: p.name, value: p.atendidas }));
  const patientsTotal = data.byPatientStatus.reduce((s, p) => s + p.count, 0);

  return (
    <>
      <PageHeader
        title="Reportes"
        description="Indicadores de sesiones, ingresos y pacientes del mes. Los reportes no incluyen información clínica."
        actions={<MonthPicker month={month} />}
      />

      <div className="grid gap-6">
        <section aria-label="Indicadores del mes" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Sesiones atendidas"
            value={int.format(data.attended)}
            delta={countDelta(data.attended, prevTotals.attended, against)}
          />
          <KpiCard
            label="Tasa de inasistencia"
            value={formatRate(data.noShowRate)}
            hint={`${int.format(data.noShow)} no asistió de ${int.format(data.attended + data.noShow)} citas cerradas`}
            delta={rateDelta(data.noShowRate, prevTotals.noShowRate, against)}
          />
          <KpiCard
            label="Cancelaciones"
            value={int.format(data.cancelled)}
            delta={countDelta(data.cancelled, prevTotals.cancelled, against, false)}
          />
          <KpiCard
            label="Ingresos del mes"
            value={formatPEN(data.revenueCents)}
            delta={moneyDelta(data.revenueCents, prevTotals.revenueCents, against)}
          />
          <KpiCard
            label="Pacientes nuevos"
            value={int.format(data.newPatients)}
            delta={countDelta(data.newPatients, prevTotals.newPatients, against)}
          />
          <KpiCard
            label="Pacientes activos"
            value={int.format(data.activePatients)}
            hint={`${int.format(data.attendedPatients)} atendido${data.attendedPatients === 1 ? "" : "s"} este mes`}
          />
          <KpiCard
            label="Paquetes vendidos"
            value={int.format(data.packagesSold)}
            hint={data.packagesSold > 0 ? `Por ${formatPEN(data.packagesSoldCents)}` : undefined}
            delta={countDelta(data.packagesSold, prevTotals.packagesSold, against)}
          />
          <KpiCard
            label="Tasa de renovación"
            value={formatRate(data.renewal.rate)}
            hint={
              data.renewal.finished > 0
                ? `${data.renewal.renewed} de ${data.renewal.finished} paquete${data.renewal.finished === 1 ? "" : "s"} terminado${data.renewal.finished === 1 ? "" : "s"} se renovaron`
                : "Ningún paquete terminó este mes"
            }
          />
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard
            title="Sesiones por semana"
            description="Citas atendidas, inasistencias y cancelaciones de cada semana del mes."
            empty={sessionsEmpty}
            emptyText="No hay citas registradas en este mes."
            table={{
              columns: ["Semana", "Atendidas", "No asistió", "Canceladas"],
              rows: data.weeks.map((w) => [w.range, w.atendidas, w.noAsistio, w.canceladas]),
            }}
          >
            <SessionsByWeekChart
              data={data.weeks.map((w) => ({
                label: w.label,
                range: w.range,
                atendidas: w.atendidas,
                noAsistio: w.noAsistio,
                canceladas: w.canceladas,
              }))}
            />
          </ChartCard>

          <ChartCard
            title="Ingresos por semana"
            description="Pagos registrados en cada semana del mes."
            empty={revenueEmpty}
            emptyText="No se registraron pagos en este mes."
            table={{
              columns: ["Semana", "Ingresos"],
              rows: data.weeks.map((w) => [w.range, formatPEN(w.ingresosCents)]),
            }}
          >
            <RevenueByWeekChart data={data.weeks.map((w) => ({ label: w.label, range: w.range, ingresos: w.ingresosCents }))} />
          </ChartCard>

          {isCenter ? (
            <ChartCard
              title="Sesiones atendidas por profesional"
              description="Carga de atención de cada psicólogo en el mes."
              empty={professionals.length === 0 || professionals.every((p) => p.value === 0)}
              emptyText="Aún no hay sesiones atendidas este mes."
              table={{
                columns: ["Profesional", "Atendidas", "No asistió"],
                rows: data.byProfessional.map((p) => [p.name, p.atendidas, p.noAsistio]),
              }}
            >
              <CategoryBarChart data={professionals} seriesLabel="Sesiones atendidas" />
            </ChartCard>
          ) : null}

          <ChartCard
            title="Ingresos por método de pago"
            description="Cómo te pagaron tus pacientes este mes."
            empty={data.byMethod.length === 0}
            emptyText="No se registraron pagos en este mes."
            table={{
              columns: ["Método", "Pagos", "Monto"],
              rows: data.byMethod.map((m) => [m.label, m.count, formatPEN(m.totalCents)]),
            }}
          >
            <CategoryBarChart
              data={data.byMethod.map((m) => ({ name: m.label, value: m.totalCents }))}
              seriesLabel="Ingresos"
              format="money"
            />
          </ChartCard>

          <ChartCard
            title="Pacientes por estado"
            description="Situación actual de todos tus pacientes (no depende del mes)."
            empty={patientsTotal === 0}
            emptyText="Aún no tienes pacientes registrados."
            table={{
              columns: ["Estado", "Pacientes"],
              rows: data.byPatientStatus.map((s) => [s.label, s.count]),
            }}
          >
            <CategoryBarChart
              data={data.byPatientStatus.map((s) => ({ name: s.label, value: s.count }))}
              seriesLabel="Pacientes"
            />
          </ChartCard>

          <Card className={isCenter ? "gap-3" : "gap-3 lg:col-span-2"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-semibold text-brand-navy-deep">
                <Info className="size-4 text-primary" /> Cómo se calculan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-medium text-brand-navy">Tasa de inasistencia</dt>
                  <dd className="text-muted-foreground">
                    Citas “No asistió” ÷ (citas atendidas + “No asistió”) del mes. Las canceladas no cuentan.
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-brand-navy">Tasa de renovación</dt>
                  <dd className="text-muted-foreground">
                    De los paquetes que terminaron en el mes (su última sesión fue este mes), qué porcentaje de
                    pacientes compró un paquete nuevo después de comprar el que terminó.
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-brand-navy">Ingresos</dt>
                  <dd className="text-muted-foreground">Suma de pagos registrados con fecha dentro del mes.</dd>
                </div>
                <div>
                  <dt className="font-medium text-brand-navy">Paquetes vendidos</dt>
                  <dd className="text-muted-foreground">Paquetes creados en el mes, sin contar los cancelados.</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
