"use client";

import { useRef, useState } from "react";
import { CheckCheck, RotateCcw, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { FormMessage, SubmitButton, useServerForm } from "@/components/common/form";
import { DEFAULT_REMINDER_TEMPLATE, DEFAULT_RENEWAL_TEMPLATE, fillTemplate } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { WhatsAppIcon } from "@/components/landing/whatsapp-icon";
import { updateTemplatesAction } from "./actions";
import {
  REMINDER_VARIABLES,
  RENEWAL_VARIABLES,
  TEMPLATE_MAX_LENGTH,
  sampleVars,
  unknownVariables,
} from "./templates";

export function TemplatesForm({
  orgName,
  reminderTemplate,
  renewalTemplate,
}: {
  orgName: string;
  reminderTemplate: string | null;
  renewalTemplate: string | null;
}) {
  const { state, pending, onSubmit } = useServerForm(updateTemplatesAction, {
    onSuccess: (s) => toast.success(s.message ?? "Plantillas guardadas."),
  });
  const e = state.fieldErrors ?? {};

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6">
      <FormMessage message={state.ok ? undefined : state.message} />

      <TemplateEditor
        id="reminderTemplate"
        title="Recordatorio de cita"
        description="Se envía desde la agenda para recordar y confirmar la cita."
        variables={REMINDER_VARIABLES}
        defaultTemplate={DEFAULT_REMINDER_TEMPLATE}
        initialValue={reminderTemplate ?? DEFAULT_REMINDER_TEMPLATE}
        orgName={orgName}
        error={e.reminderTemplate}
      />
      <TemplateEditor
        id="renewalTemplate"
        title="Aviso de renovación"
        description="Se envía desde Renovaciones cuando a un paquete le quedan pocas sesiones."
        variables={RENEWAL_VARIABLES}
        defaultTemplate={DEFAULT_RENEWAL_TEMPLATE}
        initialValue={renewalTemplate ?? DEFAULT_RENEWAL_TEMPLATE}
        orgName={orgName}
        error={e.renewalTemplate}
      />

      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Nunca incluyas información clínica en los mensajes. Si dejas un texto vacío se usará el texto por defecto.
        </p>
        <SubmitButton pending={pending} pendingText="Guardando…" className="shrink-0">
          Guardar plantillas
        </SubmitButton>
      </div>
    </form>
  );
}

function TemplateEditor({
  id,
  title,
  description,
  variables,
  defaultTemplate,
  initialValue,
  orgName,
  error,
}: {
  id: string;
  title: string;
  description: string;
  variables: readonly { key: string; label: string }[];
  defaultTemplate: string;
  initialValue: string;
  orgName: string;
  error?: string[];
}) {
  const [value, setValue] = useState(initialValue);
  const ref = useRef<HTMLTextAreaElement>(null);
  const unknown = unknownVariables(value, variables);
  const preview = fillTemplate(value.trim() ? value : defaultTemplate, sampleVars(orgName));
  const isDefault = value.trim() === defaultTemplate.trim();

  const insert = (key: string) => {
    const el = ref.current;
    const token = `{${key}}`;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + token + value.slice(end);
    setValue(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-semibold text-brand-navy-deep">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <div className="grid content-start gap-3">
          <div>
            <p className="mb-2 text-xs font-medium text-brand-navy">Insertar variable</p>
            <div className="flex flex-wrap gap-1.5">
              {variables.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => insert(v.key)}
                  title={v.label}
                  className="rounded-full border border-brand-sky/60 bg-info-soft px-2.5 py-1 font-mono text-xs font-medium text-primary transition-colors hover:border-primary hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  {`{${v.key}}`}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-1.5">
            <label htmlFor={id} className="sr-only">
              Texto de la plantilla: {title}
            </label>
            <Textarea
              ref={ref}
              id={id}
              name={id}
              value={value}
              onChange={(ev) => setValue(ev.target.value)}
              maxLength={TEMPLATE_MAX_LENGTH}
              rows={5}
              aria-invalid={error ? true : undefined}
              className="min-h-32 leading-relaxed"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              {error ? (
                <p className="text-destructive">{error[0]}</p>
              ) : unknown.length > 0 ? (
                <p className="flex items-center gap-1 text-warning">
                  <TriangleAlert className="size-3.5" /> No reconocida: {unknown.join(", ")}
                </p>
              ) : (
                <p className="text-muted-foreground">{isDefault ? "Usando el texto por defecto." : "Texto personalizado."}</p>
              )}
              <span className="text-muted-foreground tabular-nums">
                {value.length}/{TEMPLATE_MAX_LENGTH}
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-fit text-muted-foreground"
            disabled={isDefault}
            onClick={() => setValue(defaultTemplate)}
          >
            <RotateCcw /> Restaurar texto por defecto
          </Button>
        </div>

        <div className="grid content-start gap-2">
          <p className="flex items-center gap-1.5 text-xs font-medium text-brand-navy">
            <WhatsAppIcon className="size-3.5 text-success" /> Vista previa con datos de ejemplo
          </p>
          <div className="rounded-xl bg-muted/70 p-4 ring-1 ring-border">
            <div
              className={cn(
                "relative ml-auto max-w-[92%] rounded-2xl rounded-tr-sm bg-success-soft px-3.5 pt-2.5 pb-1.5 text-sm leading-relaxed whitespace-pre-wrap text-brand-navy-deep shadow-sm ring-1 ring-brand-teal/20",
              )}
            >
              {preview}
              <span className="mt-1 flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
                15:02 <CheckCheck className="size-3.5 text-brand-blue" />
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Al enviar, Neuvi reemplaza las variables con los datos reales de la cita o del paquete.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
