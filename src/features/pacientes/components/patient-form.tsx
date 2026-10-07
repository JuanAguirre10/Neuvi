"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ContactRound,
  HeartHandshake,
  LifeBuoy,
  ShieldAlert,
  Stethoscope,
  UserRound,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormMessage, SubmitButton, useServerForm } from "@/components/common/form";
import { Pill } from "@/components/common/status-badges";
import type { ActionState } from "@/lib/action-state";
import { DOCUMENT_TYPE_LABEL, PATIENT_STATUS_LABEL, SEX_LABEL, toOptions } from "@/lib/format";
import { todayKey } from "@/lib/dates";
import {
  EDUCATION_LEVEL_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  NONE,
  REFERRAL_SOURCE_SUGGESTIONS,
  RELATIONSHIP_SUGGESTIONS,
} from "../options";
import { ageFromKey } from "../utils";
import type { PatientFormValues } from "../form-values";
import { FormSection } from "./form-section";
import { SelectInput, type SelectOption } from "./select-input";

/** Opciones fijas + el valor actual si no está entre ellas (datos antiguos o importados). */
function withCurrent(options: readonly string[], current: string): SelectOption[] {
  const list: SelectOption[] = [{ value: NONE, label: "Sin especificar" }, ...options.map((o) => ({ value: o, label: o }))];
  if (current && current !== NONE && !options.includes(current)) list.push({ value: current, label: current });
  return list;
}

const DOC_PLACEHOLDER: Record<string, string> = {
  DNI: "8 dígitos",
  CE: "Carné de extranjería",
  PASAPORTE: "N.º de pasaporte",
  OTRO: "N.º de documento",
};

export function PatientForm({
  mode,
  action,
  defaults,
  professionals,
  lockedProfessionalName,
  currentProfessionalId,
  cancelHref,
}: {
  mode: "create" | "edit";
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  defaults: PatientFormValues;
  /** Profesionales elegibles (ADMIN / RECEPCION). */
  professionals: { id: string; name: string; active: boolean }[];
  /** Si viene, el paciente queda asignado a este psicólogo y no se puede cambiar (rol PSICOLOGO). */
  lockedProfessionalName?: string;
  currentProfessionalId?: string | null;
  cancelHref: string;
}) {
  const { state, pending, onSubmit } = useServerForm(action);
  const e = state.fieldErrors ?? {};
  const [birthDate, setBirthDate] = useState(defaults.birthDate);
  const [documentType, setDocumentType] = useState(defaults.documentType);
  const age = ageFromKey(birthDate);
  const minor = age !== null && age < 18;

  const professionalOptions: SelectOption[] = [
    { value: NONE, label: "Sin asignar" },
    ...professionals
      .filter((p) => p.active || p.id === currentProfessionalId)
      .map((p) => ({ value: p.id, label: p.active ? p.name : `${p.name} (inactivo)` })),
  ];

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      <datalist id="referral-suggestions">
        {REFERRAL_SOURCE_SUGGESTIONS.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <datalist id="relationship-suggestions">
        {RELATIONSHIP_SUGGESTIONS.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      <FormSection icon={UserRound} title="Datos personales" description="Identificación del paciente.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombres" htmlFor="firstName" error={e.firstName} required>
            <Input id="firstName" name="firstName" defaultValue={defaults.firstName} autoComplete="off" className="h-9" />
          </Field>
          <Field label="Apellidos" htmlFor="lastName" error={e.lastName} required>
            <Input id="lastName" name="lastName" defaultValue={defaults.lastName} autoComplete="off" className="h-9" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Tipo de documento" htmlFor="documentType" error={e.documentType}>
            <SelectInput
              id="documentType"
              name="documentType"
              value={documentType}
              onValueChange={setDocumentType}
              options={toOptions(DOCUMENT_TYPE_LABEL)}
            />
          </Field>
          <Field label="N.º de documento" htmlFor="documentNumber" error={e.documentNumber}>
            <Input
              id="documentNumber"
              name="documentNumber"
              defaultValue={defaults.documentNumber}
              placeholder={DOC_PLACEHOLDER[documentType]}
              inputMode={documentType === "DNI" ? "numeric" : "text"}
              maxLength={documentType === "DNI" ? 8 : 20}
              autoComplete="off"
              className="h-9"
            />
          </Field>
          <Field
            label="Fecha de nacimiento"
            htmlFor="birthDate"
            error={e.birthDate}
            hint={age !== null ? `${age} ${age === 1 ? "año" : "años"}${minor ? " · menor de edad" : ""}` : undefined}
          >
            <Input
              id="birthDate"
              name="birthDate"
              type="date"
              value={birthDate}
              max={todayKey()}
              onChange={(ev) => setBirthDate(ev.target.value)}
              className="h-9"
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Sexo" htmlFor="sex" error={e.sex}>
            <SelectInput
              id="sex"
              name="sex"
              defaultValue={defaults.sex}
              options={[{ value: NONE, label: "Sin especificar" }, ...toOptions(SEX_LABEL)]}
            />
          </Field>
          <Field label="Estado civil" htmlFor="maritalStatus" error={e.maritalStatus}>
            <SelectInput
              id="maritalStatus"
              name="maritalStatus"
              defaultValue={defaults.maritalStatus}
              options={withCurrent(MARITAL_STATUS_OPTIONS, defaults.maritalStatus)}
            />
          </Field>
          <Field label="Grado de instrucción" htmlFor="educationLevel" error={e.educationLevel}>
            <SelectInput
              id="educationLevel"
              name="educationLevel"
              defaultValue={defaults.educationLevel}
              options={withCurrent(EDUCATION_LEVEL_OPTIONS, defaults.educationLevel)}
            />
          </Field>
          <Field label="Ocupación" htmlFor="occupation" error={e.occupation}>
            <Input
              id="occupation"
              name="occupation"
              defaultValue={defaults.occupation}
              placeholder="Ej. Estudiante, docente"
              className="h-9"
            />
          </Field>
        </div>
      </FormSection>

      <FormSection
        icon={ContactRound}
        title="Contacto"
        description="El celular se usa para recordatorios y avisos por WhatsApp (nunca con información clínica)."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Celular (WhatsApp)" htmlFor="phone" error={e.phone}>
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              defaultValue={defaults.phone}
              placeholder="987 654 321"
              className="h-9"
            />
          </Field>
          <Field label="Correo electrónico" htmlFor="email" error={e.email}>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={defaults.email}
              placeholder="paciente@correo.com"
              className="h-9"
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <Field label="Dirección" htmlFor="address" error={e.address}>
            <Input id="address" name="address" defaultValue={defaults.address} className="h-9" />
          </Field>
          <Field label="Distrito" htmlFor="district" error={e.district}>
            <Input
              id="district"
              name="district"
              defaultValue={defaults.district}
              placeholder="Ej. Miraflores"
              className="h-9"
            />
          </Field>
        </div>
      </FormSection>

      <div className="grid gap-5 lg:grid-cols-2">
        <FormSection
          icon={UsersRound}
          title="Apoderado"
          tone={minor ? "warning" : "default"}
          badge={minor ? <Pill tone="amber">Menor de edad</Pill> : <Pill tone="gray">Opcional</Pill>}
          description={
            minor
              ? "El paciente es menor de edad: registra a su padre, madre o tutor responsable."
              : "Obligatorio en la práctica para menores de edad."
          }
        >
          <Field label="Nombre completo" htmlFor="guardianName" error={e.guardianName}>
            <Input id="guardianName" name="guardianName" defaultValue={defaults.guardianName} className="h-9" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Parentesco" htmlFor="guardianRelationship" error={e.guardianRelationship}>
              <Input
                id="guardianRelationship"
                name="guardianRelationship"
                list="relationship-suggestions"
                defaultValue={defaults.guardianRelationship}
                placeholder="Ej. Madre"
                className="h-9"
              />
            </Field>
            <Field label="Celular" htmlFor="guardianPhone" error={e.guardianPhone}>
              <Input
                id="guardianPhone"
                name="guardianPhone"
                type="tel"
                inputMode="tel"
                defaultValue={defaults.guardianPhone}
                placeholder="987 654 321"
                className="h-9"
              />
            </Field>
          </div>
        </FormSection>

        <FormSection
          icon={LifeBuoy}
          title="Contacto de emergencia"
          description="A quién llamar si ocurre una emergencia durante la atención."
        >
          <Field label="Nombre completo" htmlFor="emergencyContactName" error={e.emergencyContactName}>
            <Input
              id="emergencyContactName"
              name="emergencyContactName"
              defaultValue={defaults.emergencyContactName}
              className="h-9"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Parentesco" htmlFor="emergencyContactRelationship" error={e.emergencyContactRelationship}>
              <Input
                id="emergencyContactRelationship"
                name="emergencyContactRelationship"
                list="relationship-suggestions"
                defaultValue={defaults.emergencyContactRelationship}
                placeholder="Ej. Hermano(a)"
                className="h-9"
              />
            </Field>
            <Field label="Celular" htmlFor="emergencyContactPhone" error={e.emergencyContactPhone}>
              <Input
                id="emergencyContactPhone"
                name="emergencyContactPhone"
                type="tel"
                inputMode="tel"
                defaultValue={defaults.emergencyContactPhone}
                placeholder="987 654 321"
                className="h-9"
              />
            </Field>
          </div>
        </FormSection>
      </div>

      <FormSection
        icon={Stethoscope}
        title="Atención"
        description="Psicólogo tratante, estado del paciente y datos administrativos."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Psicólogo tratante"
            htmlFor="professionalId"
            error={e.professionalId}
            hint={
              lockedProfessionalName
                ? "Los pacientes que registras quedan asignados a ti."
                : "Solo el psicólogo tratante podrá ver la historia clínica."
            }
          >
            {lockedProfessionalName ? (
              <div className="flex h-9 items-center gap-2 rounded-lg border bg-muted/50 px-2.5 text-sm text-brand-navy">
                <HeartHandshake className="size-4 text-primary" />
                <span className="truncate">{lockedProfessionalName}</span>
              </div>
            ) : (
              <SelectInput
                id="professionalId"
                name="professionalId"
                defaultValue={defaults.professionalId}
                options={professionalOptions}
                invalid={!!e.professionalId}
              />
            )}
          </Field>
          <Field label="Estado" htmlFor="status" error={e.status}>
            <SelectInput
              id="status"
              name="status"
              defaultValue={defaults.status}
              options={toOptions(PATIENT_STATUS_LABEL)}
            />
          </Field>
          <Field label="¿Cómo nos conoció?" htmlFor="referralSource" error={e.referralSource}>
            <Input
              id="referralSource"
              name="referralSource"
              list="referral-suggestions"
              defaultValue={defaults.referralSource}
              placeholder="Elige o escribe"
              className="h-9"
            />
          </Field>
        </div>
        {mode === "edit" && !lockedProfessionalName ? (
          <p className="-mt-1 text-xs text-muted-foreground">
            Si cambias el psicólogo tratante, el nuevo profesional verá toda la historia clínica y las notas, y el
            anterior dejará de verlas. El cambio queda registrado en la ficha; nadie puede asignarse a sí mismo un
            paciente con historia clínica de otro profesional.
          </p>
        ) : null}
        <Field label="Notas administrativas" htmlFor="adminNotes" error={e.adminNotes}>
          <Textarea
            id="adminNotes"
            name="adminNotes"
            defaultValue={defaults.adminNotes}
            rows={3}
            placeholder="Ej. Prefiere citas por la tarde. Solicita boleta a nombre de su madre."
            className="min-h-20 bg-card"
          />
        </Field>
        <div className="flex items-start gap-2.5 rounded-lg bg-warning-soft px-3 py-2.5 text-xs text-warning">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <p>
            Las notas administrativas las ve recepción. <strong>No registres aquí información clínica</strong>{" "}
            (diagnósticos, motivo de consulta, evolución): eso va en la historia clínica, visible solo para el
            psicólogo tratante.
          </p>
        </div>
      </FormSection>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:flex-row sm:items-center sm:px-6 lg:-mx-8 lg:px-8">
        <div className="min-w-0 flex-1">
          <FormMessage message={state.message} ok={state.ok} />
        </div>
        <div className="flex gap-2 sm:justify-end">
          <Button variant="outline" className="h-9 flex-1 sm:flex-none" asChild>
            <Link href={cancelHref}>Cancelar</Link>
          </Button>
          <SubmitButton pending={pending} className="h-9 flex-1 sm:flex-none" pendingText="Guardando…">
            {mode === "create" ? "Registrar paciente" : "Guardar cambios"}
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
