"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormMessage, SubmitButton, useServerForm } from "@/components/common/form";
import { todayKey } from "@/lib/dates";
import { centsToInput, formatPEN, parseAmountToCents, PAYMENT_METHOD_LABEL, toOptions } from "@/lib/format";
import { SelectInput } from "@/features/pacientes/components/select-input";
import { patientHref } from "@/features/pacientes/utils";
import { registerPaymentAction } from "../actions";

export type PayablePackage = { id: string; name: string; balanceCents: number };

/**
 * Diálogo "Registrar pago" de un paquete del paciente (solo ADMIN / RECEPCION).
 * El monto se prellena con el saldo del paquete elegido. Si el monto supera el saldo, se pide confirmación.
 */
export function PaymentDialog({
  patientId,
  packages,
  defaultPackageId,
  defaultOpen = false,
  clearParamOnClose = false,
  triggerLabel = "Registrar pago",
  triggerVariant = "outline",
}: {
  patientId: string;
  /** Paquetes no cancelados del paciente. */
  packages: PayablePackage[];
  defaultPackageId?: string;
  defaultOpen?: boolean;
  /** Quita ?pagar= de la URL al cerrar o guardar. */
  clearParamOnClose?: boolean;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next && clearParamOnClose) {
      router.replace(patientHref(patientId, { tab: "paquetes" }), { scroll: false });
    }
  }

  if (!packages.length) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant={triggerVariant}>
          <Banknote /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[92dvh] flex-col gap-0 p-0 sm:max-w-md">
        <DialogHeader className="border-b px-5 py-4 pr-12">
          <DialogTitle className="flex items-center gap-2 text-brand-navy-deep">
            <Banknote className="size-4 text-primary" /> Registrar pago
          </DialogTitle>
          <DialogDescription className="text-xs">El pago se suma a la caja del día de pago.</DialogDescription>
        </DialogHeader>
        <PaymentForm
          patientId={patientId}
          packages={packages}
          defaultPackageId={defaultPackageId}
          onCancel={() => handleOpenChange(false)}
          onSaved={(msg) => {
            toast.success(msg);
            handleOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function PaymentForm({
  patientId,
  packages,
  defaultPackageId,
  onCancel,
  onSaved,
}: {
  patientId: string;
  packages: PayablePackage[];
  defaultPackageId?: string;
  onCancel: () => void;
  onSaved: (message: string) => void;
}) {
  const { state, pending, onSubmit } = useServerForm(registerPaymentAction.bind(null, patientId), {
    onSuccess: (s) => onSaved(s.message ?? "Pago registrado."),
  });
  const e = state.fieldErrors ?? {};

  const initial =
    packages.find((p) => p.id === defaultPackageId) ?? packages.find((p) => p.balanceCents > 0) ?? packages[0]!;
  const [packageId, setPackageId] = useState(initial.id);
  const [amount, setAmount] = useState(initial.balanceCents > 0 ? centsToInput(initial.balanceCents) : "");
  const [confirmOverpay, setConfirmOverpay] = useState(false);

  const selected = packages.find((p) => p.id === packageId) ?? initial;
  const balance = Math.max(selected.balanceCents, 0);
  const cents = parseAmountToCents(amount);
  const overpay = cents !== null && cents > balance;

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="grid gap-4 overflow-y-auto px-5 py-4">
        <Field label="Paquete" htmlFor="pay-package" error={e.packageId} required>
          <SelectInput
            id="pay-package"
            name="packageId"
            value={packageId}
            onValueChange={(v) => {
              setPackageId(v);
              const pkg = packages.find((p) => p.id === v);
              setAmount(pkg && pkg.balanceCents > 0 ? centsToInput(pkg.balanceCents) : "");
              setConfirmOverpay(false);
            }}
            options={packages.map((p) => ({
              value: p.id,
              label: `${p.name} · ${p.balanceCents > 0 ? `saldo ${formatPEN(p.balanceCents)}` : "pagado"}`,
            }))}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Monto (S/)"
            htmlFor="pay-amount"
            error={e.amount}
            required
            hint={`Saldo pendiente: ${formatPEN(balance)}`}
          >
            <Input
              id="pay-amount"
              name="amount"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(ev) => {
                setAmount(ev.target.value);
                setConfirmOverpay(false);
              }}
              aria-invalid={overpay || undefined}
              className="h-9"
            />
          </Field>
          <Field label="Método" htmlFor="pay-method" error={e.method} required>
            <SelectInput id="pay-method" name="method" defaultValue="YAPE" options={toOptions(PAYMENT_METHOD_LABEL)} />
          </Field>
          <Field label="Fecha de pago" htmlFor="pay-date" error={e.paidAt}>
            <Input id="pay-date" name="paidAt" type="date" defaultValue={todayKey()} max={todayKey()} className="h-9" />
          </Field>
          <Field label="N.º de operación" htmlFor="pay-reference" error={e.reference} hint="Yape, Plin, transferencia…">
            <Input id="pay-reference" name="reference" className="h-9" />
          </Field>
        </div>

        {overpay ? (
          <div className="grid gap-2 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2.5 text-sm text-warning">
            <p className="flex items-start gap-2">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>
                El monto supera el saldo pendiente ({formatPEN(balance)}) en{" "}
                <strong>{formatPEN((cents ?? 0) - balance)}</strong>. El paquete quedará con saldo a favor.
              </span>
            </p>
            <label className="flex items-start gap-2 text-brand-navy">
              <Checkbox
                name="confirmOverpay"
                checked={confirmOverpay}
                onCheckedChange={(v) => setConfirmOverpay(v === true)}
                className="mt-0.5 bg-card"
              />
              <span className="text-xs">Confirmo que el monto es correcto (adelanto, redondeo u otro motivo).</span>
            </label>
            {e.confirmOverpay ? <p className="text-xs text-destructive">{e.confirmOverpay[0]}</p> : null}
          </div>
        ) : null}

        <Field label="Notas" htmlFor="pay-notes" error={e.notes}>
          <Textarea id="pay-notes" name="notes" rows={2} placeholder="Opcional" />
        </Field>
      </div>

      <div className="flex flex-col gap-3 border-t bg-muted/40 px-5 py-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <FormMessage message={state.ok ? undefined : state.message} />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="h-9 flex-1 sm:flex-none" onClick={onCancel} disabled={pending}>
            Cancelar
          </Button>
          <SubmitButton
            pending={pending}
            disabled={overpay && !confirmOverpay}
            className="h-9 flex-1 sm:flex-none"
            pendingText="Registrando…"
          >
            Registrar pago
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
