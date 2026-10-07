"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Field, FormMessage, SubmitButton, useServerForm } from "@/components/common/form";
import { updateOrganizationAction } from "./actions";

export type OrgSettings = {
  name: string;
  type: "INDIVIDUAL" | "CENTRO";
  phone: string | null;
  email: string | null;
  address: string | null;
  ruc: string | null;
  defaultSessionMinutes: number;
  renewalThreshold: number;
  noShowConsumesSession: boolean;
};

export function GeneralSettingsForm({ org }: { org: OrgSettings }) {
  const { state, pending, onSubmit } = useServerForm(updateOrganizationAction, {
    onSuccess: (s) => toast.success(s.message ?? "Configuración guardada."),
  });
  const [noShow, setNoShow] = useState(org.noShowConsumesSession);
  const [threshold, setThreshold] = useState(String(org.renewalThreshold));
  const e = state.fieldErrors ?? {};
  const isCenter = org.type === "CENTRO";
  const n = Number(threshold);

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="grid gap-6">
      <FormMessage message={state.ok ? undefined : state.message} />

      <Card>
        <CardHeader>
          <CardTitle className="font-semibold text-brand-navy-deep">
            Datos {isCenter ? "del centro" : "del consultorio"}
          </CardTitle>
          <CardDescription>
            El nombre aparece en los recordatorios y avisos de WhatsApp (variable {"{centro}"}).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field label={isCenter ? "Nombre del centro" : "Nombre del consultorio"} htmlFor="name" error={e.name} required>
            <Input id="name" name="name" defaultValue={org.name} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Teléfono / WhatsApp" htmlFor="phone" error={e.phone}>
              <Input id="phone" name="phone" type="tel" inputMode="tel" defaultValue={org.phone ?? ""} placeholder="987 654 321" />
            </Field>
            <Field label="Correo de contacto" htmlFor="email" error={e.email}>
              <Input id="email" name="email" type="email" defaultValue={org.email ?? ""} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <Field label="Dirección" htmlFor="address" error={e.address}>
              <Input id="address" name="address" defaultValue={org.address ?? ""} placeholder="Av. Arequipa 1234, Miraflores" />
            </Field>
            <Field label="RUC" htmlFor="ruc" error={e.ruc} hint="Opcional · 11 dígitos">
              <Input id="ruc" name="ruc" inputMode="numeric" maxLength={11} defaultValue={org.ruc ?? ""} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-semibold text-brand-navy-deep">Agenda y paquetes</CardTitle>
          <CardDescription>Reglas que Neuvi usa al agendar citas y al contar sesiones.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Duración por defecto de la sesión"
              htmlFor="defaultSessionMinutes"
              error={e.defaultSessionMinutes}
              hint="En minutos. Se propone al crear una cita."
            >
              <div className="relative">
                <Input
                  id="defaultSessionMinutes"
                  name="defaultSessionMinutes"
                  type="number"
                  min={15}
                  max={240}
                  step={5}
                  defaultValue={org.defaultSessionMinutes}
                  className="pr-12"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                  min
                </span>
              </div>
            </Field>
            <Field
              label="Aviso de renovación"
              htmlFor="renewalThreshold"
              error={e.renewalThreshold}
              hint={
                Number.isInteger(n) && n >= 1
                  ? `Avisar cuando al paquete le ${n === 1 ? "quede 1 sesión" : `queden ${n} sesiones`} o menos.`
                  : "Avisar cuando queden N sesiones o menos."
              }
            >
              <div className="relative">
                <Input
                  id="renewalThreshold"
                  name="renewalThreshold"
                  type="number"
                  min={1}
                  max={10}
                  value={threshold}
                  onChange={(ev) => setThreshold(ev.target.value)}
                  className="pr-20"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                  sesiones
                </span>
              </div>
            </Field>
          </div>

          <label
            htmlFor="noShowConsumesSession"
            className="flex items-start justify-between gap-4 rounded-lg border bg-muted/40 px-4 py-3"
          >
            <span className="grid gap-0.5">
              <span className="text-sm font-medium text-brand-navy">Las inasistencias descuentan sesión</span>
              <span className="text-xs text-muted-foreground">
                {noShow
                  ? "Si el paciente no asiste, la sesión se descuenta de su paquete."
                  : "Si el paciente no asiste, la sesión no se descuenta y queda disponible en su paquete."}
              </span>
            </span>
            <Switch id="noShowConsumesSession" name="noShowConsumesSession" checked={noShow} onCheckedChange={setNoShow} />
          </label>
        </CardContent>
        <CardFooter className="justify-end">
          <SubmitButton pending={pending} pendingText="Guardando…">
            Guardar cambios
          </SubmitButton>
        </CardFooter>
      </Card>
    </form>
  );
}
