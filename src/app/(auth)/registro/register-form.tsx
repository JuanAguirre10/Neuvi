"use client";

import { useState } from "react";
import { Building2, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FormMessage, SubmitButton, useServerForm } from "@/components/common/form";
import { cn } from "@/lib/utils";
import { registerAction } from "../actions";

type OrgType = "INDIVIDUAL" | "CENTRO";

const TYPES: { value: OrgType; title: string; text: string; icon: typeof UserRound }[] = [
  { value: "INDIVIDUAL", title: "Psicólogo independiente", text: "Atiendo por mi cuenta", icon: UserRound },
  { value: "CENTRO", title: "Centro psicológico", text: "Varios psicólogos y recepción", icon: Building2 },
];

export function RegisterForm({ defaultType }: { defaultType: OrgType }) {
  const { state, pending, onSubmit } = useServerForm(registerAction);
  const [type, setType] = useState<OrgType>(defaultType);
  const e = state.fieldErrors ?? {};

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <FormMessage message={state.message} ok={state.ok} />

      <fieldset className="grid grid-cols-2 gap-3">
        <legend className="sr-only">Tipo de cuenta</legend>
        {TYPES.map(({ value, title, text, icon: Icon }) => (
          <label
            key={value}
            className={cn(
              "flex cursor-pointer flex-col gap-2 rounded-xl border bg-card p-3.5 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
              type === value ? "border-primary bg-secondary/60 ring-1 ring-primary" : "hover:border-brand-sky",
            )}
          >
            <input
              type="radio"
              name="orgType"
              value={value}
              checked={type === value}
              onChange={() => setType(value)}
              className="sr-only"
            />
            <Icon className={cn("size-5", type === value ? "text-primary" : "text-muted-foreground")} />
            <span className="text-sm leading-tight font-semibold text-brand-navy-deep">{title}</span>
            <span className="text-xs text-muted-foreground">{text}</span>
          </label>
        ))}
      </fieldset>

      <Field
        label={type === "CENTRO" ? "Nombre del centro" : "Nombre de tu consultorio"}
        htmlFor="orgName"
        error={e.orgName}
        required
      >
        <Input
          id="orgName"
          name="orgName"
          placeholder={type === "CENTRO" ? "Centro Psicológico Bienestar" : "Consultorio Psic. Ana Torres"}
          className="h-10"
        />
      </Field>
      <Field label="Tu nombre completo" htmlFor="name" error={e.name} required>
        <Input id="name" name="name" autoComplete="name" className="h-10" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Correo electrónico" htmlFor="email" error={e.email} required>
          <Input id="email" name="email" type="email" autoComplete="email" className="h-10" />
        </Field>
        <Field label="Celular (WhatsApp)" htmlFor="phone" error={e.phone} required>
          <Input id="phone" name="phone" type="tel" inputMode="tel" placeholder="987 654 321" className="h-10" />
        </Field>
      </div>
      <Field label="Contraseña" htmlFor="password" error={e.password} hint="Mínimo 8 caracteres." required>
        <Input id="password" name="password" type="password" autoComplete="new-password" className="h-10" />
      </Field>

      {type === "CENTRO" ? (
        <label className="flex items-start gap-2.5 text-sm text-brand-navy">
          <Checkbox name="attends" className="mt-0.5" />
          <span>Yo también atiendo pacientes (tendré mi propia agenda y pacientes).</span>
        </label>
      ) : null}

      <div className="grid gap-1">
        <label className="flex items-start gap-2.5 text-sm text-brand-navy">
          <Checkbox name="consent" className="mt-0.5" />
          <span>
            Acepto el tratamiento de datos personales conforme a la Ley N.º 29733 y me comprometo a registrar datos de
            pacientes con su consentimiento.
          </span>
        </label>
        {e.consent ? <p className="text-xs text-destructive">{e.consent[0]}</p> : null}
      </div>

      <SubmitButton pending={pending} className="mt-2 h-10 w-full" pendingText="Creando tu cuenta…">
        Empezar prueba gratuita
      </SubmitButton>
    </form>
  );
}
