import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { requireUser } from "@/lib/auth";
import { isScopedToOwnPatients } from "@/lib/permissions";
import { createPatientAction } from "@/features/pacientes/actions";
import { BackLink } from "@/features/pacientes/components/back-link";
import { PatientForm } from "@/features/pacientes/components/patient-form";
import { EMPTY_PATIENT_VALUES } from "@/features/pacientes/form-values";
import { NONE } from "@/features/pacientes/options";
import { getOrgProfessionals } from "@/features/pacientes/queries";

export const metadata: Metadata = { title: "Nuevo paciente" };

export default async function NuevoPacientePage() {
  const user = await requireUser();
  const locked = isScopedToOwnPatients(user);
  const professionals = locked ? [] : await getOrgProfessionals(user);
  const active = professionals.filter((p) => p.active);

  // Por defecto: el propio usuario si atiende (independiente), o el único profesional del centro.
  const defaultProfessional = active.some((p) => p.id === user.id)
    ? user.id
    : active.length === 1
      ? active[0]!.id
      : NONE;

  return (
    <>
      <BackLink href="/app/pacientes">Pacientes</BackLink>
      <PageHeader
        title="Nuevo paciente"
        description="Registra los datos administrativos. La historia clínica la completa luego el psicólogo tratante desde la ficha."
      />
      <PatientForm
        mode="create"
        action={createPatientAction}
        defaults={{ ...EMPTY_PATIENT_VALUES, professionalId: defaultProfessional }}
        professionals={professionals}
        lockedProfessionalName={locked ? user.name : undefined}
        cancelHref="/app/pacientes"
      />
    </>
  );
}
