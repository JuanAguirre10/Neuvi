"use client";

import { useState } from "react";
import type { Plan } from "@prisma/client";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/common/form";
import { centsToInput } from "@/lib/format";
import { updatePlanAction } from "../plan-actions";
import { ActionDialog } from "./action-dialog";

export type EditablePlan = {
  code: Plan;
  name: string;
  description: string | null;
  listPriceCents: number | null;
  perProfessional: boolean;
  maxProfessionals: number | null;
  active: boolean;
};

function SwitchRow({
  id,
  name,
  label,
  hint,
  defaultChecked,
}: {
  id: string;
  name: string;
  label: string;
  hint: string;
  defaultChecked: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <label htmlFor={id} className="flex items-start justify-between gap-4 rounded-lg border bg-muted/40 px-3 py-2.5">
      <span className="grid gap-0.5">
        <span className="text-sm font-medium text-brand-navy">{label}</span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </span>
      <Switch id={id} name={name} checked={checked} onCheckedChange={setChecked} />
    </label>
  );
}

/** Edición del catálogo (solo SUPERADMIN). */
export function PlanDialog({ plan }: { plan: EditablePlan }) {
  const id = `plan-${plan.code}`;
  return (
    <ActionDialog
      trigger={
        <Button size="sm" variant="outline">
          <Pencil /> Editar
        </Button>
      }
      title={`Editar ${plan.name}`}
      description="Los cambios aplican a nuevas activaciones y facturas. Las cuentas con precio pactado lo conservan."
      action={updatePlanAction.bind(null, plan.code)}
      submitLabel="Guardar plan"
    >
      {(e) => (
        <>
          <Field label="Nombre" htmlFor={`${id}-name`} error={e.name} required>
            <Input id={`${id}-name`} name="name" defaultValue={plan.name} className="h-9" />
          </Field>
          <Field label="Descripción" htmlFor={`${id}-description`} error={e.description}>
            <Textarea id={`${id}-description`} name="description" rows={2} defaultValue={plan.description ?? ""} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Precio de lista (S/ al mes)"
              htmlFor={`${id}-price`}
              error={e.listPrice}
              hint="Vacío = Por definir (se pacta por cuenta)."
            >
              <Input
                id={`${id}-price`}
                name="listPrice"
                inputMode="decimal"
                placeholder="Por definir"
                defaultValue={plan.listPriceCents != null ? centsToInput(plan.listPriceCents) : ""}
                className="h-9"
              />
            </Field>
            <Field label="Máximo de profesionales" htmlFor={`${id}-max`} error={e.maxProfessionals} hint="Vacío = sin límite.">
              <Input
                id={`${id}-max`}
                name="maxProfessionals"
                type="number"
                min={1}
                inputMode="numeric"
                placeholder="Sin límite"
                defaultValue={plan.maxProfessionals ?? ""}
                className="h-9"
              />
            </Field>
          </div>
          <SwitchRow
            id={`${id}-per`}
            name="perProfessional"
            label="Se cobra por psicólogo activo"
            hint="El precio se multiplica por los profesionales activos de la cuenta."
            defaultChecked={plan.perProfessional}
          />
          <SwitchRow
            id={`${id}-active`}
            name="active"
            label="Disponible para nuevas activaciones"
            hint="Las cuentas que ya lo tienen no se ven afectadas."
            defaultChecked={plan.active}
          />
        </>
      )}
    </ActionDialog>
  );
}
