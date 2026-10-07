"use client";

import { useState } from "react";
import { FileSignature, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormMessage, SubmitButton, useServerForm } from "@/components/common/form";
import { todayKey } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { upsertClinicalRecordAction } from "../actions";
import { RECORD_SECTIONS, type RecordFormValues, type RiskLevelValue } from "../fields";
import { RiskLevelPicker } from "./risk-level-picker";

function SectionTitle({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: string }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-semibold text-brand-navy-deep">
      <span className="flex size-6 items-center justify-center rounded-md bg-secondary text-primary">
        <Icon className="size-3.5" />
      </span>
      {children}
    </h3>
  );
}

export function ClinicalRecordForm({
  patientId,
  values,
  onDone,
}: {
  patientId: string;
  values: RecordFormValues;
  onDone: () => void;
}) {
  const { state, pending, onSubmit } = useServerForm(upsertClinicalRecordAction.bind(null, patientId), {
    onSuccess: (s) => {
      toast.success(s.message ?? "Ficha de ingreso guardada.");
      onDone();
    },
  });
  const e = state.fieldErrors ?? {};
  const [risk, setRisk] = useState<RiskLevelValue>(values.riskLevel);
  const [consent, setConsent] = useState(values.informedConsent);

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6 p-4 sm:p-5">
      {RECORD_SECTIONS.map((section) => (
        <fieldset key={section.id} className="grid gap-3">
          <SectionTitle icon={section.icon}>{section.title}</SectionTitle>
          <div className={cn("grid gap-3", section.fields.length > 1 && "md:grid-cols-2")}>
            {section.fields.map((f) => (
              <Field
                key={f.name}
                label={f.label}
                htmlFor={`cr-${f.name}`}
                error={e[f.name]}
                className={cn(section.fields.length > 1 && !f.short && f.rows && f.rows >= 4 && "md:col-span-2")}
              >
                {f.short ? (
                  <Input
                    id={`cr-${f.name}`}
                    name={f.name}
                    defaultValue={values[f.name]}
                    placeholder={f.placeholder}
                    className="h-9 bg-card md:max-w-48"
                  />
                ) : (
                  <Textarea
                    id={`cr-${f.name}`}
                    name={f.name}
                    defaultValue={values[f.name]}
                    placeholder={f.placeholder}
                    rows={f.rows}
                    className="bg-card"
                  />
                )}
              </Field>
            ))}
          </div>
        </fieldset>
      ))}

      <fieldset
        className={cn(
          "grid gap-3 rounded-lg border p-3.5 transition-colors",
          risk === "ALTO" ? "border-destructive/40 bg-danger-soft/60" : "bg-muted/30",
        )}
      >
        <SectionTitle icon={ShieldAlert}>Riesgo</SectionTitle>
        <RiskLevelPicker defaultValue={values.riskLevel} onChange={setRisk} />
        {e.riskLevel ? <p className="text-xs text-destructive">{e.riskLevel[0]}</p> : null}
        <Field
          label="Notas de riesgo"
          htmlFor="cr-riskNotes"
          error={e.riskNotes}
          hint={
            risk === "ALTO"
              ? "Registra factores de riesgo, red de apoyo y el plan de seguridad acordado."
              : "Ideación, conductas de riesgo, factores protectores."
          }
        >
          <Textarea id="cr-riskNotes" name="riskNotes" defaultValue={values.riskNotes} rows={2} className="bg-card" />
        </Field>
      </fieldset>

      <fieldset className="grid gap-3">
        <SectionTitle icon={FileSignature}>Consentimiento informado</SectionTitle>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-1 items-start gap-2.5 text-sm text-brand-navy">
            <Checkbox
              name="informedConsent"
              defaultChecked={values.informedConsent}
              onCheckedChange={(v) => setConsent(v === true)}
              className="mt-0.5"
            />
            <span>El paciente (o su apoderado) firmó el consentimiento informado.</span>
          </label>
          <Field
            label="Fecha de firma"
            htmlFor="cr-informedConsentDate"
            error={e.informedConsentDate}
            className="sm:w-48"
          >
            <Input
              id="cr-informedConsentDate"
              name="informedConsentDate"
              type="date"
              defaultValue={values.informedConsentDate}
              max={todayKey()}
              disabled={!consent}
              className="h-9 bg-card"
            />
          </Field>
        </div>
      </fieldset>

      <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <FormMessage message={state.ok ? undefined : state.message} />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="h-9 flex-1 sm:flex-none" onClick={onDone} disabled={pending}>
            Cancelar
          </Button>
          <SubmitButton pending={pending} className="h-9 flex-1 sm:flex-none" pendingText="Guardando…">
            Guardar ficha
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
