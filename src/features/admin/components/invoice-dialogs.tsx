"use client";

import { useState } from "react";
import { Banknote, FilePlus2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/common/form";
import { SelectInput } from "@/features/pacientes/components/select-input";
import { dateOnlyFromKey, formatDateOnly, todayKey } from "@/lib/dates";
import { PAYMENT_METHOD_LABEL, centsToInput, formatPEN, parseAmountToCents, toOptions } from "@/lib/format";
import { issueInvoiceAction, registerInvoicePaymentAction, voidInvoiceAction } from "../actions";
import type { InvoiceDraft } from "../queries";
import { ActionDialog } from "./action-dialog";

/** Emite la siguiente factura. Periodo, psicólogos y precio los decide el servidor (aquí solo se muestran). */
export function IssueInvoiceDialog({ orgId, draft }: { orgId: string; draft: InvoiceDraft }) {
  const [discount, setDiscount] = useState("");
  const unit = draft.unitPriceCents ?? 0;
  const subtotal = draft.seats * unit;
  const discountCents = parseAmountToCents(discount) ?? 0;
  const total = Math.max(0, subtotal - discountCents);

  return (
    <ActionDialog
      trigger={
        <Button size="sm">
          <FilePlus2 /> Emitir siguiente factura
        </Button>
      }
      title="Emitir factura"
      description={`Periodo del ${formatDateOnly(dateOnlyFromKey(draft.startKey))} al ${formatDateOnly(dateOnlyFromKey(draft.endKey))}.`}
      action={issueInvoiceAction.bind(null, orgId)}
      submitLabel="Emitir factura"
      pendingText="Emitiendo…"
    >
      {(e) => (
        <>
          <dl className="grid gap-1.5 rounded-lg border bg-muted/40 px-3 py-2.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Psicólogos facturados</dt>
              <dd className="font-medium text-brand-navy-deep tabular-nums">{draft.seats}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Precio unitario del periodo</dt>
              <dd className="font-medium text-brand-navy-deep tabular-nums">{formatPEN(unit)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-medium text-brand-navy-deep tabular-nums">{formatPEN(subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t pt-1.5">
              <dt className="font-medium text-brand-navy">Total</dt>
              <dd className="font-semibold text-brand-navy-deep tabular-nums">{formatPEN(total)}</dd>
            </div>
          </dl>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Descuento (S/)" htmlFor="inv-discount" error={e.discount} hint="Opcional">
              <Input
                id="inv-discount"
                name="discount"
                inputMode="decimal"
                placeholder="0.00"
                value={discount}
                onChange={(ev) => setDiscount(ev.target.value)}
                className="h-9"
              />
            </Field>
            <Field label="Vence el" htmlFor="inv-due" error={e.dueDate} required>
              <Input
                id="inv-due"
                name="dueDate"
                type="date"
                defaultValue={draft.defaultDueKey}
                min={draft.startKey}
                max={draft.maxDueKey}
                className="h-9"
              />
            </Field>
          </div>
        </>
      )}
    </ActionDialog>
  );
}

export type PayableInvoice = { id: string; number: string; balanceCents: number };

export function InvoicePaymentDialog({
  invoice,
  size = "sm",
}: {
  invoice: PayableInvoice;
  size?: "sm" | "xs";
}) {
  return (
    <ActionDialog
      trigger={
        <Button size={size} variant="outline">
          <Banknote /> Registrar pago
        </Button>
      }
      title={`Registrar pago · ${invoice.number}`}
      description={`Saldo pendiente: ${formatPEN(invoice.balanceCents)}. Se admiten pagos parciales.`}
      action={registerInvoicePaymentAction.bind(null, invoice.id)}
      submitLabel="Registrar pago"
      pendingText="Registrando…"
    >
      {(e) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Monto (S/)" htmlFor={`pay-amount-${invoice.id}`} error={e.amount} required>
              <Input
                id={`pay-amount-${invoice.id}`}
                name="amount"
                inputMode="decimal"
                defaultValue={centsToInput(invoice.balanceCents)}
                className="h-9"
              />
            </Field>
            <Field label="Método" htmlFor={`pay-method-${invoice.id}`} error={e.method} required>
              <SelectInput
                id={`pay-method-${invoice.id}`}
                name="method"
                defaultValue="TRANSFERENCIA"
                options={toOptions(PAYMENT_METHOD_LABEL)}
              />
            </Field>
            <Field label="Fecha de pago" htmlFor={`pay-date-${invoice.id}`} error={e.paidAt}>
              <Input id={`pay-date-${invoice.id}`} name="paidAt" type="date" defaultValue={todayKey()} max={todayKey()} className="h-9" />
            </Field>
            <Field label="N.º de operación" htmlFor={`pay-ref-${invoice.id}`} error={e.reference}>
              <Input id={`pay-ref-${invoice.id}`} name="reference" className="h-9" />
            </Field>
          </div>
          <Field label="Notas" htmlFor={`pay-notes-${invoice.id}`} error={e.notes}>
            <Textarea id={`pay-notes-${invoice.id}`} name="notes" rows={2} placeholder="Opcional" />
          </Field>
        </>
      )}
    </ActionDialog>
  );
}

export function VoidInvoiceDialog({ invoice, size = "sm" }: { invoice: { id: string; number: string }; size?: "sm" | "xs" }) {
  return (
    <ActionDialog
      trigger={
        <Button size={size} variant="ghost" className="text-destructive">
          <XCircle /> Anular
        </Button>
      }
      title={`Anular ${invoice.number}`}
      description="La factura deja de contar como deuda. No se puede deshacer."
      action={voidInvoiceAction.bind(null, invoice.id)}
      submitLabel="Anular factura"
      pendingText="Anulando…"
      destructive
    >
      {(e) => (
        <Field label="Motivo" htmlFor={`void-${invoice.id}`} error={e.reason} required hint="Queda registrado en la factura.">
          <Textarea id={`void-${invoice.id}`} name="reason" rows={3} placeholder="Ej. la cuenta no usó el servicio en ese periodo" />
        </Field>
      )}
    </ActionDialog>
  );
}
