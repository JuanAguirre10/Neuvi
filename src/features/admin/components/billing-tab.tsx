import { CalendarRange, Info, ReceiptText } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { dateOnlyFromKey, formatDate, formatDateOnly, formatShortDateOnly } from "@/lib/dates";
import { PAYMENT_METHOD_LABEL, formatPEN } from "@/lib/format";
import type { SubscriptionStatus, PaymentMethod } from "@prisma/client";
import { getAccountInvoiceDraft, getAccountInvoices, type AccountInvoice } from "../queries";
import { InvoiceStatusBadge } from "./badges";
import { IssueInvoiceDialog, InvoicePaymentDialog, VoidInvoiceDialog } from "./invoice-dialogs";

function NextInvoiceCard({
  orgId,
  status,
  canBill,
  draft,
}: {
  orgId: string;
  status: SubscriptionStatus;
  canBill: boolean;
  draft: Awaited<ReturnType<typeof getAccountInvoiceDraft>>;
}) {
  if (!draft) return null;
  const period = `${formatDateOnly(dateOnlyFromKey(draft.startKey))} – ${formatDateOnly(dateOnlyFromKey(draft.endKey))}`;
  let blocker: string | null = null;
  if (status !== "ACTIVA") blocker = "Solo se factura a cuentas con un plan activo.";
  else if (draft.unitPriceCents == null) blocker = "Define el precio pactado (o el de lista del plan) para poder facturar.";
  else if (draft.tooEarly) blocker = "Ya está facturado por adelantado: la siguiente se emite un mes antes de su periodo.";

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-brand-sky/40 bg-sky-wash p-4 sm:flex-row sm:items-center">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-primary ring-1 ring-brand-sky/40">
        <CalendarRange className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-brand-navy-deep">Siguiente factura · {period}</p>
        <p className="text-xs text-muted-foreground">
          {draft.seats} psicólogo{draft.seats === 1 ? "" : "s"} facturado{draft.seats === 1 ? "" : "s"}
          {draft.unitPriceCents != null
            ? ` × ${formatPEN(draft.unitPriceCents)} = ${formatPEN(draft.seats * draft.unitPriceCents)}`
            : " · precio por definir"}
        </p>
        {blocker ? (
          <p className="mt-1 flex items-start gap-1.5 text-xs text-brand-navy">
            <Info className="mt-0.5 size-3.5 shrink-0 text-primary" /> {blocker}
          </p>
        ) : null}
      </div>
      {canBill && !blocker ? <IssueInvoiceDialog orgId={orgId} draft={draft} /> : null}
    </section>
  );
}

function PaymentsList({ payments }: { payments: AccountInvoice["payments"] }) {
  if (payments.length === 0) return null;
  return (
    <ul className="mt-2 grid gap-1 border-t pt-2 text-xs text-muted-foreground">
      {payments.map((p) => (
        <li key={p.id} className="flex flex-wrap justify-between gap-x-3">
          <span>
            {formatDate(p.paidAt)} · {PAYMENT_METHOD_LABEL[p.method as PaymentMethod]}
            {p.reference ? ` · Op. ${p.reference}` : ""}
            {p.registeredByName ? ` · ${p.registeredByName}` : ""}
          </span>
          <span className="font-medium text-brand-navy tabular-nums">{formatPEN(p.amountCents)}</span>
        </li>
      ))}
    </ul>
  );
}

export async function BillingTab({
  orgId,
  subscriptionId,
  status,
  canBill,
}: {
  orgId: string;
  subscriptionId: string;
  status: SubscriptionStatus;
  canBill: boolean;
}) {
  const [invoices, draft] = await Promise.all([getAccountInvoices(subscriptionId), getAccountInvoiceDraft(orgId)]);

  return (
    <div className="grid gap-4">
      <NextInvoiceCard orgId={orgId} status={status} canBill={canBill} draft={draft} />

      {invoices.length === 0 ? (
        <EmptyState icon={ReceiptText} title="Sin facturas" description="Las facturas de Neuvi a esta cuenta aparecerán aquí." />
      ) : (
        <ul className="grid gap-3">
          {invoices.map((inv) => (
            <li key={inv.id} className={inv.status === "ANULADA" ? "rounded-xl border bg-card p-4 opacity-70 shadow-xs" : "rounded-xl border bg-card p-4 shadow-xs"}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-medium text-brand-navy-deep">
                    {inv.number}
                    <InvoiceStatusBadge status={inv.status} />
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Periodo {formatShortDateOnly(inv.periodStart)} – {formatShortDateOnly(inv.periodEnd)} · Vence el{" "}
                    {formatDateOnly(inv.dueDate)} · Emitida el {formatDate(inv.issuedAt)}
                    {inv.createdByName ? ` por ${inv.createdByName}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-brand-navy">
                    {inv.seats} × {formatPEN(inv.unitPriceCents)}
                    {inv.discountCents > 0 ? ` − ${formatPEN(inv.discountCents)} de descuento` : ""}
                  </p>
                  {inv.voidReason ? <p className="mt-1 text-xs text-muted-foreground">Anulada: {inv.voidReason}</p> : null}
                </div>
                <dl className="grid shrink-0 grid-cols-3 gap-4 text-right text-sm sm:min-w-64">
                  <div>
                    <dt className="text-xs text-muted-foreground">Total</dt>
                    <dd className="font-semibold text-brand-navy-deep tabular-nums">{formatPEN(inv.totalCents)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Pagado</dt>
                    <dd className="text-brand-navy tabular-nums">{formatPEN(inv.paidCents)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Saldo</dt>
                    <dd className={inv.status === "VENCIDA" ? "font-semibold text-destructive tabular-nums" : "text-brand-navy tabular-nums"}>
                      {formatPEN(inv.balanceCents)}
                    </dd>
                  </div>
                </dl>
              </div>
              <PaymentsList payments={inv.payments} />
              {canBill && inv.status !== "ANULADA" && (inv.balanceCents > 0 || inv.payments.length === 0) ? (
                <div className="mt-3 flex flex-wrap justify-end gap-2 border-t pt-3">
                  {inv.balanceCents > 0 ? (
                    <InvoicePaymentDialog invoice={{ id: inv.id, number: inv.number, balanceCents: inv.balanceCents }} />
                  ) : null}
                  {inv.payments.length === 0 ? <VoidInvoiceDialog invoice={{ id: inv.id, number: inv.number }} /> : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
