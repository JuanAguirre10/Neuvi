"use client";

import { useState } from "react";
import type { BillingCycle, Plan, SubscriptionStatus } from "@prisma/client";
import { Ban, CircleDollarSign, PauseCircle, Play, Repeat, Sparkles, TimerReset, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/common/form";
import { SelectInput } from "@/features/pacientes/components/select-input";
import { BILLING_CYCLE_LABEL, centsToInput, formatPEN, toOptions } from "@/lib/format";
import { formatDate } from "@/lib/dates";
import type { Capabilities } from "@/lib/platform-auth/permissions";
import {
  cancelAccountAction,
  extendTrialAction,
  reactivateAccountAction,
  savePlanAction,
  suspendAccountAction,
  updatePriceAction,
} from "../actions";
import type { PlanOption } from "../queries";
import { ActionDialog } from "./action-dialog";

const DAY_MS = 24 * 60 * 60 * 1000;

export type AccountActionsProps = {
  orgId: string;
  orgName: string;
  status: SubscriptionStatus;
  planCode: Plan;
  priceCents: number | null;
  billingCycle: BillingCycle;
  trialEndsAt: string;
  /** ISO: desde dónde se suman los días al extender (fin de la prueba o ahora si ya venció). */
  trialExtensionBase: string;
  professionals: number;
  /** Si alguna vez activó un plan (al reactivar vuelve a Activa; si no, a su prueba). */
  hasActivated: boolean;
  plans: PlanOption[];
  can: Capabilities;
};

function listPriceText(plan: PlanOption | undefined): string {
  if (!plan) return "";
  if (plan.listPriceCents == null) return "Este plan no tiene precio de lista: ingresa el pactado.";
  return `Vacío = precio de lista (${formatPEN(plan.listPriceCents)}${plan.perProfessional ? " por psicólogo" : ""}).`;
}

/** Botones de acción de la cuenta según su estado y el rol (el servidor vuelve a validar todo). */
export function AccountActions(props: AccountActionsProps) {
  const { status, can } = props;
  const isTrial = status === "PRUEBA";
  const isActive = status === "ACTIVA";
  const isBlocked = status === "SUSPENDIDA" || status === "CANCELADA";

  const buttons = [
    can.subscription && isTrial ? <PlanDialog key="activate" {...props} mode="activate" /> : null,
    can.subscription && isActive ? <PlanDialog key="change" {...props} mode="change" /> : null,
    can.subscription && !isBlocked ? <PriceDialog key="price" {...props} /> : null,
    can.trial && isTrial ? <TrialDialog key="trial" {...props} /> : null,
    can.suspension && (isTrial || isActive) ? <SuspendDialog key="suspend" {...props} /> : null,
    (status === "SUSPENDIDA" && can.suspension) || (status === "CANCELADA" && can.cancel) ? (
      <ReactivateDialog key="reactivate" {...props} />
    ) : null,
    can.cancel && status !== "CANCELADA" ? <CancelDialog key="cancel" {...props} /> : null,
  ].filter(Boolean);

  if (buttons.length === 0) return null;
  return <div className="flex flex-wrap gap-2">{buttons}</div>;
}

function PlanDialog({ orgId, planCode, priceCents, billingCycle, professionals, plans, mode }: AccountActionsProps & { mode: "activate" | "change" }) {
  const available = plans.filter((p) => p.active || p.code === planCode);
  const initialPlan = mode === "activate" ? planCode : (available.find((p) => p.code !== planCode)?.code ?? planCode);
  const [selected, setSelected] = useState<Plan>(initialPlan);
  const plan = available.find((p) => p.code === selected);
  const exceeds = plan?.maxProfessionals != null && professionals > plan.maxProfessionals;

  return (
    <ActionDialog
      trigger={
        <Button size="sm" variant={mode === "activate" ? "default" : "outline"}>
          {mode === "activate" ? <Sparkles /> : <Repeat />}
          {mode === "activate" ? "Activar plan" : "Cambiar plan"}
        </Button>
      }
      title={mode === "activate" ? "Activar plan" : "Cambiar plan"}
      description={
        mode === "activate"
          ? "La cuenta pasa de prueba a plan activo y queda lista para facturar."
          : "El tipo de cuenta (individual o centro) cambia junto con el plan."
      }
      action={savePlanAction.bind(null, orgId)}
      submitLabel={mode === "activate" ? "Activar plan" : "Cambiar plan"}
    >
      {(e) => (
        <>
          <Field label="Plan" htmlFor="plan-code" error={e.planCode} required>
            <SelectInput
              id="plan-code"
              name="planCode"
              value={selected}
              onValueChange={(v) => setSelected(v as Plan)}
              options={available.map((p) => ({
                value: p.code,
                label: p.code === planCode && mode === "change" ? `${p.name} (actual)` : p.name,
              }))}
            />
          </Field>
          {exceeds ? (
            <p className="flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              La cuenta tiene {professionals} psicólogos activos y este plan admite {plan?.maxProfessionals}. No se podrá
              cambiar hasta que el centro desactive profesionales.
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={plan?.perProfessional ? "Precio por psicólogo (S/ al mes)" : "Precio mensual (S/)"}
              htmlFor="plan-price"
              error={e.price}
              hint={listPriceText(plan)}
            >
              <Input
                id="plan-price"
                name="price"
                inputMode="decimal"
                placeholder="0.00"
                defaultValue={mode === "activate" && priceCents != null ? centsToInput(priceCents) : ""}
                className="h-9"
              />
            </Field>
            <Field label="Ciclo de facturación" htmlFor="plan-cycle" error={e.billingCycle} required>
              <SelectInput id="plan-cycle" name="billingCycle" defaultValue={billingCycle} options={toOptions(BILLING_CYCLE_LABEL)} />
            </Field>
          </div>
        </>
      )}
    </ActionDialog>
  );
}

function PriceDialog({ orgId, priceCents, billingCycle, planCode, plans }: AccountActionsProps) {
  const plan = plans.find((p) => p.code === planCode);
  return (
    <ActionDialog
      trigger={
        <Button size="sm" variant="outline">
          <CircleDollarSign /> Precio y ciclo
        </Button>
      }
      title="Precio pactado y ciclo"
      description="Se aplica a las próximas facturas; las ya emitidas no cambian."
      action={updatePriceAction.bind(null, orgId)}
      submitLabel="Guardar"
    >
      {(e) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={plan?.perProfessional ? "Precio por psicólogo (S/ al mes)" : "Precio mensual (S/)"}
            htmlFor="price-amount"
            error={e.price}
            hint={listPriceText(plan)}
          >
            <Input
              id="price-amount"
              name="price"
              inputMode="decimal"
              placeholder="0.00"
              defaultValue={priceCents != null ? centsToInput(priceCents) : ""}
              className="h-9"
            />
          </Field>
          <Field label="Ciclo de facturación" htmlFor="price-cycle" error={e.billingCycle} required>
            <SelectInput id="price-cycle" name="billingCycle" defaultValue={billingCycle} options={toOptions(BILLING_CYCLE_LABEL)} />
          </Field>
        </div>
      )}
    </ActionDialog>
  );
}

function TrialDialog({ orgId, trialEndsAt, trialExtensionBase }: AccountActionsProps) {
  const [days, setDays] = useState("15");
  const n = Number(days);
  const base = new Date(trialExtensionBase).getTime();
  const preview = Number.isInteger(n) && n >= 1 && n <= 90 ? formatDate(new Date(base + n * DAY_MS)) : null;

  return (
    <ActionDialog
      trigger={
        <Button size="sm" variant="outline">
          <TimerReset /> Extender prueba
        </Button>
      }
      title="Extender prueba gratuita"
      description={`La prueba termina el ${formatDate(new Date(trialEndsAt))}.`}
      action={extendTrialAction.bind(null, orgId)}
      submitLabel="Extender"
    >
      {(e) => (
        <>
          <Field
            label="Días adicionales"
            htmlFor="trial-days"
            error={e.days}
            hint={preview ? `Nueva fecha de fin: ${preview}` : "Entre 1 y 90 días."}
            required
          >
            <Input
              id="trial-days"
              name="days"
              type="number"
              min={1}
              max={90}
              inputMode="numeric"
              value={days}
              onChange={(ev) => setDays(ev.target.value)}
              className="h-9"
            />
          </Field>
          <Field label="Motivo" htmlFor="trial-note" error={e.note}>
            <Textarea id="trial-note" name="note" rows={2} placeholder="Opcional (p. ej. acordado por WhatsApp)" />
          </Field>
        </>
      )}
    </ActionDialog>
  );
}

function ReasonField({ id, error, placeholder }: { id: string; error?: string[]; placeholder: string }) {
  return (
    <Field label="Motivo" htmlFor={id} error={error} required hint="Queda en el historial de la cuenta.">
      <Textarea id={id} name="reason" rows={3} placeholder={placeholder} />
    </Field>
  );
}

function SuspendDialog({ orgId, orgName }: AccountActionsProps) {
  return (
    <ActionDialog
      trigger={
        <Button size="sm" variant="outline" className="text-destructive">
          <PauseCircle /> Suspender
        </Button>
      }
      title={`Suspender ${orgName}`}
      description="Nadie del consultorio podrá ingresar hasta que se reactive. Sus datos se conservan."
      action={suspendAccountAction.bind(null, orgId)}
      submitLabel="Suspender cuenta"
      destructive
    >
      {(e) => <ReasonField id="suspend-reason" error={e.reason} placeholder="Ej. dos facturas vencidas sin respuesta" />}
    </ActionDialog>
  );
}

function ReactivateDialog({ orgId, status, hasActivated }: AccountActionsProps) {
  return (
    <ActionDialog
      trigger={
        <Button size="sm">
          <Play /> Reactivar
        </Button>
      }
      title="Reactivar cuenta"
      description={
        hasActivated
          ? "La cuenta vuelve a su plan activo y su equipo puede ingresar de nuevo."
          : "La cuenta vuelve a su prueba gratuita (si ya venció, extiéndela después)."
      }
      action={reactivateAccountAction.bind(null, orgId)}
      submitLabel="Reactivar"
    >
      {(e) => (
        <Field label="Nota" htmlFor="reactivate-note" error={e.note} hint={status === "CANCELADA" ? "La cuenta estaba cancelada." : undefined}>
          <Textarea id="reactivate-note" name="note" rows={2} placeholder="Opcional (p. ej. regularizó el pago)" />
        </Field>
      )}
    </ActionDialog>
  );
}

function CancelDialog({ orgId, orgName }: AccountActionsProps) {
  return (
    <ActionDialog
      trigger={
        <Button size="sm" variant="ghost" className="text-destructive">
          <Ban /> Cancelar cuenta
        </Button>
      }
      title={`Cancelar ${orgName}`}
      description="La cuenta deja Neuvi y pierde el acceso. Sus datos se conservan por si vuelve."
      action={cancelAccountAction.bind(null, orgId)}
      submitLabel="Cancelar cuenta"
      destructive
    >
      {(e) => <ReasonField id="cancel-reason" error={e.reason} placeholder="Ej. cerró el consultorio" />}
    </ActionDialog>
  );
}
