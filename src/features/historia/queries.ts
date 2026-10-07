import "server-only";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth";
import { canViewClinical } from "@/lib/permissions";

type ClinicalPatient = { id: string; professionalId: string | null };

/**
 * Ficha de ingreso + notas de evolución. Devuelve null si el usuario no es el psicólogo tratante
 * (defensa en profundidad: la página también lo verifica antes de llamar).
 */
export async function getClinicalData(user: CurrentUser, patient: ClinicalPatient) {
  if (!canViewClinical(user, patient)) return null;

  const [record, notes] = await Promise.all([
    db.clinicalRecord.findUnique({ where: { patientId: patient.id } }),
    db.sessionNote.findMany({
      where: { patientId: patient.id },
      orderBy: [{ sessionDate: "desc" }, { createdAt: "desc" }],
      include: {
        author: { select: { id: true, name: true } },
        appointment: { select: { id: true, startsAt: true } },
      },
    }),
  ]);

  const updatedBy = record?.updatedById
    ? await db.user.findFirst({
        where: { id: record.updatedById, organizationId: user.organizationId },
        select: { name: true },
      })
    : null;

  const maxNumber = notes.reduce((max, n) => Math.max(max, n.sessionNumber ?? 0), 0);
  return {
    record,
    recordUpdatedBy: updatedBy?.name ?? null,
    notes,
    suggestedSessionNumber: Math.max(maxNumber, notes.length) + 1,
  };
}

export type ClinicalData = NonNullable<Awaited<ReturnType<typeof getClinicalData>>>;
export type SessionNoteWithAuthor = ClinicalData["notes"][number];

/** Cita del paciente (misma organización) para vincular una nota de evolución vía ?nota=. */
export async function getAppointmentForNote(user: CurrentUser, patient: ClinicalPatient, appointmentId: string) {
  if (!canViewClinical(user, patient)) return null;
  return db.appointment.findFirst({
    where: { id: appointmentId, organizationId: user.organizationId, patientId: patient.id },
    select: {
      id: true,
      startsAt: true,
      modality: true,
      status: true,
      sessionNote: { select: { id: true, authorId: true } },
    },
  });
}
