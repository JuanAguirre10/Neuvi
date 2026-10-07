import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/common/page-header";
import { requireUser } from "@/lib/auth";
import { fullName } from "@/lib/format";
import { isScopedToOwnPatients } from "@/lib/permissions";
import { updatePatientAction } from "@/features/pacientes/actions";
import { BackLink } from "@/features/pacientes/components/back-link";
import { PatientForm } from "@/features/pacientes/components/patient-form";
import { toPatientFormValues } from "@/features/pacientes/form-values";
import { getOrgProfessionals, getPatientInScope } from "@/features/pacientes/queries";

export const metadata: Metadata = { title: "Editar paciente" };

export default async function EditarPacientePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const patient = await getPatientInScope(user, id);
  if (!patient) notFound();

  const locked = isScopedToOwnPatients(user);
  const professionals = locked ? [] : await getOrgProfessionals(user);

  return (
    <>
      <BackLink href={`/app/pacientes/${patient.id}`}>Volver a la ficha</BackLink>
      <PageHeader title="Editar paciente" description={fullName(patient)} />
      <PatientForm
        mode="edit"
        action={updatePatientAction.bind(null, patient.id)}
        defaults={toPatientFormValues(patient)}
        professionals={professionals}
        lockedProfessionalName={locked ? (patient.professional?.name ?? user.name) : undefined}
        currentProfessionalId={patient.professionalId}
        cancelHref={`/app/pacientes/${patient.id}`}
      />
    </>
  );
}
