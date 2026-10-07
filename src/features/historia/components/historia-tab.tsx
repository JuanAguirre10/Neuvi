import { Info, Lock, NotebookPen, Phone, ShieldAlert } from "lucide-react";
import type { ClinicalRecord } from "@prisma/client";
import { RiskBadge } from "@/components/common/status-badges";
import type { CurrentUser } from "@/lib/auth";
import { formatDate, formatLongDate, formatTime, limaDateKey, todayKey } from "@/lib/dates";
import { canManagePayments, canViewClinical } from "@/lib/permissions";
import { formatPhone } from "@/lib/whatsapp";
import type { PatientDetail } from "@/features/pacientes/queries";
import type { NoteFormValues, RecordFormValues } from "../fields";
import { getAppointmentForNote, getClinicalData } from "../queries";
import { ClinicalRecordPanel } from "./clinical-record-panel";
import { ClinicalRecordView } from "./clinical-record-view";
import { LockedClinical } from "./locked-clinical";
import { SessionNoteDialog } from "./session-note-dialog";
import { SessionNotesTimeline } from "./session-notes-timeline";

function toRecordFormValues(r: ClinicalRecord | null): RecordFormValues {
  return {
    consultationReason: r?.consultationReason ?? "",
    currentProblemHistory: r?.currentProblemHistory ?? "",
    personalHistory: r?.personalHistory ?? "",
    previousTreatments: r?.previousTreatments ?? "",
    familyHistory: r?.familyHistory ?? "",
    currentMedication: r?.currentMedication ?? "",
    substanceUse: r?.substanceUse ?? "",
    mentalStatusExam: r?.mentalStatusExam ?? "",
    diagnosticImpression: r?.diagnosticImpression ?? "",
    diagnosisCode: r?.diagnosisCode ?? "",
    treatmentGoals: r?.treatmentGoals ?? "",
    treatmentPlan: r?.treatmentPlan ?? "",
    riskLevel: r?.riskLevel ?? "NINGUNO",
    riskNotes: r?.riskNotes ?? "",
    informedConsent: r?.informedConsent ?? false,
    informedConsentDate: r?.informedConsentDate ? limaDateKey(r.informedConsentDate) : "",
  };
}

/** Pestaña "Historia clínica": solo para el psicólogo tratante; el resto ve un estado bloqueado. */
export async function HistoriaTab({
  user,
  patient,
  nota,
}: {
  user: CurrentUser;
  patient: PatientDetail;
  /** ?nota=<appointmentId>: abrir "Nueva nota" prellenada desde esa cita. */
  nota?: string;
}) {
  const allowed = canViewClinical(user, patient);
  const data = allowed ? await getClinicalData(user, patient) : null;
  if (!data) {
    return (
      <LockedClinical
        patientId={patient.id}
        professionalName={patient.professional?.name ?? null}
        isTreatingButNotProfessional={patient.professionalId === user.id && !user.isProfessional}
        canReassign={canManagePayments(user)}
      />
    );
  }

  const { record, recordUpdatedBy, notes, suggestedSessionNumber } = data;

  let createValues: NoteFormValues = {
    sessionDate: todayKey(),
    sessionNumber: String(suggestedSessionNumber),
    modality: "PRESENCIAL",
    moodObserved: "",
    topics: "",
    development: "",
    interventions: "",
    homework: "",
    nextSessionPlan: "",
    riskLevel: "NINGUNO",
    appointmentId: "",
  };
  let autoOpenCreate = false;
  let linkedLabel: string | undefined;
  let openNoteId: string | undefined;
  let notaMessage: string | null = null;

  if (nota) {
    const appt = await getAppointmentForNote(user, patient, nota);
    if (!appt) {
      notaMessage = "La cita indicada no existe o no pertenece a este paciente.";
    } else if (appt.sessionNote) {
      if (appt.sessionNote.authorId === user.id) openNoteId = appt.sessionNote.id;
      else notaMessage = "Esta cita ya tiene una nota de evolución registrada.";
    } else if (appt.status === "CANCELADA" || appt.status === "NO_ASISTIO") {
      notaMessage = "La cita está cancelada o el paciente no asistió: no corresponde registrar una nota de evolución.";
    } else if (limaDateKey(appt.startsAt) > todayKey()) {
      notaMessage = "La cita aún no se realiza. Podrás registrar la nota el día de la sesión.";
    } else {
      createValues = {
        ...createValues,
        sessionDate: limaDateKey(appt.startsAt),
        modality: appt.modality,
        appointmentId: appt.id,
      };
      autoOpenCreate = true;
      linkedLabel = `${formatLongDate(appt.startsAt)} · ${formatTime(appt.startsAt)}`;
    }
  }

  const latestNote = notes[0];
  const recordHigh = record?.riskLevel === "ALTO";
  const noteHigh = latestNote?.riskLevel === "ALTO";

  return (
    <div className="grid gap-5">
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="size-3.5 text-success" />
        Información confidencial · visible solo para ti como psicólogo(a) tratante (Ley N.º 29733).
      </p>

      {notaMessage ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-primary/20 bg-info-soft px-4 py-3 text-sm text-primary">
          <Info className="mt-0.5 size-4 shrink-0" />
          <p>{notaMessage}</p>
        </div>
      ) : null}

      {recordHigh || noteHigh ? (
        <div role="alert" className="flex gap-3 rounded-xl border border-destructive/30 bg-danger-soft px-4 py-3.5">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div className="grid min-w-0 gap-1 text-sm">
            <p className="font-semibold text-destructive">Riesgo alto registrado</p>
            <p className="text-brand-navy-deep">
              {recordHigh
                ? record?.riskNotes || "La ficha de ingreso registra riesgo alto."
                : `La última nota de evolución (${formatDate(latestNote!.sessionDate)}) registra riesgo alto.`}{" "}
              Revisa el plan de seguridad y mantén a mano el contacto de emergencia.
            </p>
            {patient.emergencyContactName || patient.emergencyContactPhone ? (
              <p className="inline-flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <Phone className="size-3.5" />
                Emergencia: {patient.emergencyContactName ?? "Sin nombre"}
                {patient.emergencyContactRelationship ? ` (${patient.emergencyContactRelationship})` : ""}
                {patient.emergencyContactPhone ? ` · ${formatPhone(patient.emergencyContactPhone)}` : ""}
              </p>
            ) : (
              <p className="text-xs text-destructive">No hay contacto de emergencia registrado en la ficha.</p>
            )}
          </div>
        </div>
      ) : null}

      <ClinicalRecordPanel
        patientId={patient.id}
        hasRecord={record !== null}
        highRisk={recordHigh}
        values={toRecordFormValues(record)}
        heading={
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="text-base font-semibold text-brand-navy-deep">Ficha de ingreso</h2>
            {record ? <RiskBadge level={record.riskLevel} /> : null}
            {record ? (
              <span className="text-xs text-muted-foreground">
                Actualizada el {formatDate(record.updatedAt)}
                {recordUpdatedBy ? ` por ${recordUpdatedBy}` : ""}
              </span>
            ) : null}
          </div>
        }
        view={<ClinicalRecordView record={record} />}
      />

      <section className="grid gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-brand-navy-deep">Notas de evolución</h2>
            <p className="text-xs text-muted-foreground">
              {notes.length
                ? `${notes.length} ${notes.length === 1 ? "nota registrada" : "notas registradas"} · la más reciente primero`
                : "Registra una nota después de cada sesión."}
            </p>
          </div>
          <SessionNoteDialog
            key={nota ?? "nueva"}
            patientId={patient.id}
            mode="create"
            values={createValues}
            defaultOpen={autoOpenCreate}
            clearParamOnClose={Boolean(nota)}
            linkedAppointmentLabel={linkedLabel}
          />
        </div>

        {notes.length ? (
          <SessionNotesTimeline
            notes={notes}
            patientId={patient.id}
            currentUserId={user.id}
            openNoteId={openNoteId}
          />
        ) : (
          <div className="flex flex-col items-center rounded-xl border border-dashed bg-card px-6 py-10 text-center">
            <span className="mb-3 flex size-11 items-center justify-center rounded-full bg-secondary text-primary">
              <NotebookPen className="size-5" />
            </span>
            <p className="font-semibold text-brand-navy-deep">Aún no hay notas de evolución</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Documenta cada sesión: estado emocional, temas, desarrollo, intervenciones, tareas y nivel de riesgo.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
