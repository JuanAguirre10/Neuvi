import type { Metadata } from "next";
import Link from "next/link";
import { ReceiptText, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { requirePlatformAdmin } from "@/lib/platform-auth";
import { can } from "@/lib/platform-auth/permissions";
import { formatDateOnly, formatShortDateOnly } from "@/lib/dates";
import { formatPEN } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SimplePagination } from "@/features/pacientes/components/pagination";
import { INVOICE_STATUSES, INVOICE_STATUS_LABEL } from "@/features/admin/billing";
import { monthLabel, monthOptions, parseInvoiceFilters, type SearchParamValue } from "@/features/admin/filters";
import { INVOICES_PAGE_SIZE, listInvoices, type InvoiceListRow } from "@/features/admin/queries";
import { InvoiceStatusBadge } from "@/features/admin/components/badges";
import { InvoicePaymentDialog } from "@/features/admin/components/invoice-dialogs";
import { ListFilters } from "@/features/admin/components/list-filters";

export const metadata: Metadata = { title: "Facturación" };

function Total({ label, value, tone }: { label: string; value: string; tone?: "danger" | "success" }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-xs">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-xl font-semibold tracking-tight break-words text-brand-navy-deep sm:text-2xl",
          tone === "danger" && "text-destructive",
          tone === "success" && "text-success",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export default async function FacturacionPage({ searchParams }: { searchParams: Promise<Record<string, SearchParamValue>> }) {
  const admin = await requirePlatformAdmin();
  const filters = parseInvoiceFilters(await searchParams);
  const result = await listInvoices(filters);
  const canBill = can(admin.role, "billing");
  const params = { q: filters.q, estado: filters.estado, mes: filters.mes };
  const hasFilters = Boolean(filters.q || filters.estado || filters.mes);

  return (
    <>
      <PageHeader
        title="Facturación"
        description="Facturas de Neuvi a las cuentas suscritas. El estado se calcula con los pagos y la fecha de vencimiento."
      />

      <ListFilters
        basePath="/admin/facturacion"
        current={params}
        search={{ placeholder: "Buscar por cuenta, RUC o N.º de factura", label: "Buscar facturas" }}
        selects={[
          {
            name: "estado",
            label: "Estado",
            allLabel: "Todos los estados",
            options: INVOICE_STATUSES.map((s) => ({ value: s, label: INVOICE_STATUS_LABEL[s] })),
          },
          { name: "mes", label: "Mes de emisión", allLabel: "Todos los meses", options: monthOptions(), className: "sm:w-52" },
        ]}
      />

      <section aria-label="Totales" className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Total label={filters.mes ? `Facturado en ${monthLabel(filters.mes)}` : "Facturado"} value={formatPEN(result.totals.billedCents)} />
        <Total label="Cobrado" value={formatPEN(result.totals.paidCents)} tone="success" />
        <Total label="Por cobrar" value={formatPEN(result.totals.pendingCents)} />
        <Total label="Vencido" value={formatPEN(result.totals.overdueCents)} tone={result.totals.overdueCents > 0 ? "danger" : undefined} />
      </section>

      {result.rows.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={SearchX}
            title="Sin resultados"
            description="Ninguna factura coincide con esos filtros."
            action={
              <Button variant="outline" asChild>
                <Link href="/admin/facturacion">Limpiar filtros</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState icon={ReceiptText} title="Aún no hay facturas" description="Emite la primera desde la pestaña Facturación de una cuenta activa." />
        )
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
          <div className="hidden lg:block">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4 text-xs font-semibold text-muted-foreground uppercase">Factura</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase">Cuenta</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase">Periodo</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase">Vence</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase">Total</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase">Saldo</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase">Estado</TableHead>
                  <TableHead className="pr-4">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.rows.map((r) => (
                  <TableRow key={r.id} className={r.status === "ANULADA" ? "opacity-60" : undefined}>
                    <TableCell className="pl-4 font-medium text-brand-navy-deep tabular-nums">{r.number}</TableCell>
                    <TableCell>
                      <Link href={`/admin/cuentas/${r.orgId}?tab=facturacion`} className="block max-w-56 truncate text-primary hover:underline">
                        {r.orgName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatShortDateOnly(r.periodStart)} – {formatShortDateOnly(r.periodEnd)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDateOnly(r.dueDate)}</TableCell>
                    <TableCell className="text-right text-brand-navy-deep tabular-nums">{formatPEN(r.totalCents)}</TableCell>
                    <TableCell className={cn("text-right tabular-nums", r.status === "VENCIDA" ? "font-semibold text-destructive" : "text-brand-navy")}>
                      {formatPEN(r.balanceCents)}
                    </TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <RowAction row={r} canBill={canBill} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="divide-y lg:hidden">
            {result.rows.map((r) => (
              <li key={r.id} className={cn("grid gap-2 p-4", r.status === "ANULADA" && "opacity-60")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-brand-navy-deep">{r.number}</p>
                    <Link href={`/admin/cuentas/${r.orgId}?tab=facturacion`} className="block truncate text-sm text-primary hover:underline">
                      {r.orgName}
                    </Link>
                  </div>
                  <InvoiceStatusBadge status={r.status} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatShortDateOnly(r.periodStart)} – {formatShortDateOnly(r.periodEnd)} · Vence {formatDateOnly(r.dueDate)}
                </p>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">
                    Total <span className="font-medium text-brand-navy-deep tabular-nums">{formatPEN(r.totalCents)}</span>
                  </span>
                  <span className="text-muted-foreground">
                    Saldo{" "}
                    <span className={cn("font-medium tabular-nums", r.status === "VENCIDA" ? "text-destructive" : "text-brand-navy-deep")}>
                      {formatPEN(r.balanceCents)}
                    </span>
                  </span>
                </div>
                <div className="flex justify-end">
                  <RowAction row={r} canBill={canBill} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <SimplePagination
        page={result.page}
        pageCount={result.pageCount}
        total={result.total}
        pageSize={INVOICES_PAGE_SIZE}
        basePath="/admin/facturacion"
        params={params}
        noun={result.total === 1 ? "factura" : "facturas"}
      />
    </>
  );
}

function RowAction({ row, canBill }: { row: InvoiceListRow; canBill: boolean }) {
  if (!canBill || row.balanceCents <= 0 || row.status === "ANULADA") return null;
  return <InvoicePaymentDialog invoice={{ id: row.id, number: row.number, balanceCents: row.balanceCents }} size="xs" />;
}
