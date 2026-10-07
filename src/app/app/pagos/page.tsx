import type { Metadata } from "next";
import { Download, HandCoins, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { requireRole } from "@/lib/auth";
import { formatPEN } from "@/lib/format";
import { resolvePeriod, periodQuery } from "@/features/caja/period";
import { PeriodFilter } from "@/features/caja/period-filter";
import { CashStats, MethodBreakdown } from "@/features/caja/summary";
import { PaymentsTable } from "@/features/caja/payments-table";
import { ReceivablesTable } from "@/features/caja/receivables-table";
import { PAYMENTS_TABLE_LIMIT, getCashSummary, getPayments, getReceivables } from "@/features/caja/queries";

export const metadata: Metadata = { title: "Caja y pagos" };

export default async function CajaYPagosPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; desde?: string; hasta?: string }>;
}) {
  const user = await requireRole("ADMIN", "RECEPCION");
  const period = resolvePeriod(await searchParams);
  const orgId = user.organizationId;

  const [summary, payments, receivables] = await Promise.all([
    getCashSummary(orgId, period.start, period.end),
    getPayments(orgId, period.start, period.end, PAYMENTS_TABLE_LIMIT),
    getReceivables(user),
  ]);
  const receivableCents = receivables.reduce((s, r) => s + r.balanceCents, 0);
  const truncated = summary.count > payments.length;

  return (
    <>
      <PageHeader
        title="Caja y pagos"
        description="Pagos registrados, cobros por método y saldos pendientes de tus pacientes."
        actions={
          summary.count > 0 ? (
            <Button asChild variant="outline">
              <a href={`/app/pagos/exportar?${periodQuery(period)}`} download>
                <Download /> Exportar CSV
              </a>
            </Button>
          ) : null
        }
      />

      <div className="grid gap-6">
        <div className="grid gap-2">
          <PeriodFilter period={period} />
          <p className="text-sm text-muted-foreground first-letter:uppercase">{period.label}</p>
        </div>

        <CashStats
          totalCents={summary.totalCents}
          count={summary.count}
          receivableCents={receivableCents}
          receivableCount={receivables.length}
        />

        <MethodBreakdown totalCents={summary.totalCents} byMethod={summary.byMethod} />

        <section aria-labelledby="pagos-title">
          <Card className="gap-0 pb-0">
            <CardHeader className="border-b">
              <CardTitle id="pagos-title" className="font-semibold text-brand-navy-deep">
                Pagos del periodo
              </CardTitle>
              <CardDescription>
                {summary.count === 0
                  ? "No se registraron pagos en este periodo."
                  : `${summary.count} pago${summary.count === 1 ? "" : "s"} por ${formatPEN(summary.totalCents)}.`}
                {truncated ? ` Se muestran los ${payments.length} más recientes; exporta el CSV para ver todos.` : null}
              </CardDescription>
            </CardHeader>
            {payments.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={Receipt}
                  title="Sin pagos en este periodo"
                  description="Los pagos se registran desde la ficha del paciente, en la pestaña Paquetes. Prueba con otro rango de fechas."
                  className="border-0 bg-transparent py-8"
                />
              </div>
            ) : (
              <PaymentsTable payments={payments} totalCents={summary.totalCents} />
            )}
          </Card>
        </section>

        <section aria-labelledby="por-cobrar-title">
          <Card className="gap-0 pb-0">
            <CardHeader className="border-b">
              <CardTitle id="por-cobrar-title" className="font-semibold text-brand-navy-deep">
                Por cobrar
              </CardTitle>
              <CardDescription>
                Paquetes activos o completados con saldo pendiente, a la fecha.
                {receivables.length > 0 ? ` Total: ${formatPEN(receivableCents)}.` : null}
              </CardDescription>
            </CardHeader>
            {receivables.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={HandCoins}
                  title="Todo al día"
                  description="Ningún paquete tiene saldo pendiente."
                  className="border-0 bg-transparent py-8"
                />
              </div>
            ) : (
              <ReceivablesTable items={receivables} />
            )}
          </Card>
        </section>
      </div>
    </>
  );
}
