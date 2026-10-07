"use server";

// Historia clínica y notas de evolución. Datos sensibles de salud (Ley N.º 29733):
// cada acción vuelve a verificar que el usuario sea el psicólogo tratante (canViewClinical).
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { canViewClinical, patientScope } from "@/lib/permissions";
import { fromLimaLocal, limaDateKey } from "@/lib/dates";
import { type ActionState, formToObject, fromZodError } from "@/lib/action-state";
import { clinicalRecordSchema, sessionNoteSchema } from "./schema";

const NO_ACCESS: ActionState = {
  ok: false,
  message: "Solo el psicólogo tratante puede ver y registrar la historia clínica de este paciente.",
};

/** Paciente de la organización (y del alcance del usuario) sobre el que el usuario es tratante. */
async function clinicalPatient(user: CurrentUser, patientId: string) {
  if (typeof patientId !== "string" || !patientId) return null;
  const patient = await db.patient.findFirst({
    where: { AND: [{ id: patientId }, patientScope(user)] },
    select: { id: true, professionalId: true },
  });
  return patient && canViewClinical(user, patient) ? patient : null;
}

/** Fecha de la sesión: conserva la hora de la referencia (cita / nota previa) si es el mismo día. */
function toSessionDate(dateKey: string, reference?: Date | null): Date {
  if (reference && limaDateKey(reference) === dateKey) return reference;
  return fromLimaLocal(dateKey, "12:00");
}

const opt = (v: string | undefined) => v ?? null;

// ---------------------------------------------------------------------------
// Ficha de ingreso (una por paciente)
// ---------------------------------------------------------------------------

export async function upsertClinicalRecordAction(
  patientId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const patient = await clinicalPatient(user, patientId);
  if (!patient) return NO_ACCESS;

  const parsed = clinicalRecordSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const d = parsed.data;

  const consentDate = d.informedConsent
    ? fromLimaLocal(d.informedConsentDate ?? limaDateKey(new Date()), "12:00")
    : null;

  const data = {
    consultationReason: opt(d.consultationReason),
    currentProblemHistory: opt(d.currentProblemHistory),
    personalHistory: opt(d.personalHistory),
    previousTreatments: opt(d.previousTreatments),
    familyHistory: opt(d.familyHistory),
    currentMedication: opt(d.currentMedication),
    substanceUse: opt(d.substanceUse),
    mentalStatusExam: opt(d.mentalStatusExam),
    diagnosticImpression: opt(d.diagnosticImpression),
    diagnosisCode: d.diagnosisCode?.toUpperCase() ?? null,
    treatmentGoals: opt(d.treatmentGoals),
    treatmentPlan: opt(d.treatmentPlan),
    riskLevel: d.riskLevel,
    riskNotes: opt(d.riskNotes),
    informedConsent: d.informedConsent,
    informedConsentDate: consentDate,
    updatedById: user.id,
  };

  await db.clinicalRecord.upsert({
    where: { patientId: patient.id },
    create: { ...data, patientId: patient.id },
    update: data,
  });

  revalidatePath(`/app/pacientes/${patient.id}`);
  return { ok: true, message: "Ficha de ingreso guardada." };
}

// ---------------------------------------------------------------------------
// Notas de evolución
// ---------------------------------------------------------------------------

export async function createSessionNoteAction(
  patientId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const patient = await clinicalPatient(user, patientId);
  if (!patient) return NO_ACCESS;

  const parsed = sessionNoteSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const d = parsed.data;

  // Vincular a una cita: debe ser de este paciente y de la organización, y no tener nota aún.
  let appointment: { id: string; startsAt: Date } | null = null;
  if (d.appointmentId) {
    const appt = await db.appointment.findFirst({
      where: { id: d.appointmentId, organizationId: user.organizationId, patientId: patient.id },
      select: { id: true, startsAt: true, status: true, sessionNote: { select: { id: true } } },
    });
    if (!appt) return { ok: false, message: "La cita indicada no pertenece a este paciente." };
    if (appt.status === "CANCELADA" || appt.status === "NO_ASISTIO") {
      return { ok: false, message: "No corresponde registrar una nota para una cita cancelada o sin asistencia." };
    }
    if (appt.sessionNote) return { ok: false, message: "Esta cita ya tiene una nota de evolución registrada." };
    appointment = { id: appt.id, startsAt: appt.startsAt };
  }

  try {
    await db.sessionNote.create({
      data: {
        patientId: patient.id,
        authorId: user.id,
        appointmentId: appointment?.id ?? null,
        sessionDate: toSessionDate(d.sessionDate, appointment?.startsAt),
        sessionNumber: d.sessionNumber ?? null,
        modality: d.modality,
        moodObserved: opt(d.moodObserved),
        topics: opt(d.topics),
        development: d.development,
        interventions: opt(d.interventions),
        homework: opt(d.homework),
        nextSessionPlan: opt(d.nextSessionPlan),
        riskLevel: d.riskLevel,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, message: "Esta cita ya tiene una nota de evolución registrada." };
    }
    throw error;
  }

  revalidatePath(`/app/pacientes/${patient.id}`);
  return { ok: true, message: "Nota de evolución registrada." };
}

export async function updateSessionNoteAction(
  noteId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (typeof noteId !== "string" || !noteId) return { ok: false, message: "Nota inválida." };

  const note = await db.sessionNote.findFirst({
    where: { id: noteId, patient: { organizationId: user.organizationId } },
    select: {
      id: true,
      authorId: true,
      sessionDate: true,
      patient: { select: { id: true, professionalId: true } },
    },
  });
  if (!note || !canViewClinical(user, note.patient)) return NO_ACCESS;
  if (note.authorId !== user.id) return { ok: false, message: "Solo el autor de la nota puede editarla." };

  const parsed = sessionNoteSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const d = parsed.data;

  // El vínculo con la cita no se modifica al editar.
  await db.sessionNote.update({
    where: { id: note.id },
    data: {
      sessionDate: toSessionDate(d.sessionDate, note.sessionDate),
      sessionNumber: d.sessionNumber ?? null,
      modality: d.modality,
      moodObserved: opt(d.moodObserved),
      topics: opt(d.topics),
      development: d.development,
      interventions: opt(d.interventions),
      homework: opt(d.homework),
      nextSessionPlan: opt(d.nextSessionPlan),
      riskLevel: d.riskLevel,
    },
  });

  revalidatePath(`/app/pacientes/${note.patient.id}`);
  return { ok: true, message: "Nota de evolución actualizada." };
}
