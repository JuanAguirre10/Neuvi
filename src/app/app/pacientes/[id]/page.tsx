import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { canViewClinical } from "@/lib/permissions";
import { BackLink } from "@/features/pacientes/components/back-link";
import { PatientHeader } from "@/features/pacientes/components/patient-header";
import { PatientTabs } from "@/features/pacientes/components/patient-tabs";
import { SummaryTab } from "@/features/pacientes/components/summary-tab";
import { AppointmentsTab } from "@/features/pacientes/components/appointments-tab";
import { getPatientInScope } from "@/features/pacientes/queries";
import { firstParam, parsePatientTab } from "@/features/pacientes/utils";
import { HistoriaTab } from "@/features/historia/components/historia-tab";
import { PackagesTab } from "@/features/paquetes/components/packages-tab";

// El nombre del paciente no va en el <title> (historial del navegador, pantallas compartidas).
export const metadata: Metadata = { title: "Ficha del paciente" };

type SearchParams = Promise<{
  tab?: string | string[];
  nota?: string | string[];
  renovar?: string | string[];
  pagar?: string | string[];
  traspaso?: string | string[];
}>;

export default async function PacientePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const [{ id }, sp] = await Promise.all([params, searchParams]);

  const patient = await getPatientInScope(user, id);
  if (!patient) notFound();

  const nota = firstParam(sp.nota);
  // ?nota= implica la pestaña de historia clínica; ?renovar= / ?pagar= la de paquetes.
  const tab = parsePatientTab(
    firstParam(sp.tab) ?? (nota ? "historia" : sp.renovar || sp.pagar ? "paquetes" : undefined),
  );
  const clinicalAllowed = canViewClinical(user, patient);
  // ?traspaso=N lo pone updatePatientAction: N citas próximas quedaron con el tratante anterior.
  const traspaso = Math.max(0, Number.parseInt(firstParam(sp.traspaso) ?? "", 10) || 0);

  return (
    <>
      <BackLink href="/app/pacientes">Pacientes</BackLink>
      <PatientHeader patient={patient} orgName={user.organization.name} />
      <PatientTabs patientId={patient.id} active={tab} clinicalLocked={!clinicalAllowed} />

      {tab === "resumen" ? <SummaryTab user={user} patient={patient} traspaso={traspaso} /> : null}
      {tab === "historia" ? <HistoriaTab user={user} patient={patient} nota={nota} /> : null}
      {tab === "paquetes" ? (
        <PackagesTab
          user={user}
          patient={patient}
          renovar={firstParam(sp.renovar) === "1"}
          pagar={firstParam(sp.pagar)}
        />
      ) : null}
      {tab === "citas" ? <AppointmentsTab user={user} patient={patient} /> : null}
    </>
  );
}
