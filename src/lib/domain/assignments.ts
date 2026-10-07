import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

// Psicólogo tratante = quien accede a la historia clínica (canViewClinical). Por eso:
//   1. Todo cambio de tratante se registra en PatientAssignment (bitácora visible en la ficha).
//   2. Nadie puede asignarse a sí mismo un paciente que ya tiene historia clínica escrita por otro
//      profesional: así un administrador no puede usar su rol para leer notas ajenas. El traspaso
//      legítimo lo hace otra persona (otro administrador o recepción) y queda en la bitácora.

type Db = Prisma.TransactionClient | typeof db;

/** ¿El paciente tiene ficha de ingreso o notas de evolución escritas por alguien distinto de `userId`? */
export async function hasClinicalDataFromOthers(patientId: string, userId: string, client: Db = db): Promise<boolean> {
  const [record, notes] = await Promise.all([
    client.clinicalRecord.count({
      where: { patientId, OR: [{ updatedById: null }, { updatedById: { not: userId } }] },
    }),
    client.sessionNote.count({ where: { patientId, authorId: { not: userId } } }),
  ]);
  return record + notes > 0;
}

export const SELF_ASSIGN_BLOCKED =
  "Este paciente tiene historia clínica de otro profesional: no puedes asignártelo a ti mismo. " +
  "Pide a otro administrador o a recepción que haga el traspaso (quedará registrado).";

/**
 * ¿Puede `actorId` dejar como tratante a `toUserId`? Bloquea la autoasignación de un paciente con
 * historia clínica ajena. Para pacientes nuevos (sin `patientId`) siempre se permite.
 */
export async function canAssignTreating(
  actorId: string,
  patient: { id: string; professionalId: string | null } | null,
  toUserId: string | null,
  client: Db = db,
): Promise<boolean> {
  if (!patient || !toUserId || toUserId !== actorId) return true;
  if (patient.professionalId === actorId) return true; // ya era el tratante: no cambia nada
  return !(await hasClinicalDataFromOthers(patient.id, actorId, client));
}

/**
 * Registra un cambio de tratante. No hace nada si no cambió.
 * Llamar en la misma transacción que actualiza `patient.professionalId`.
 */
export async function logAssignment(
  client: Db,
  data: {
    organizationId: string;
    patientId: string;
    fromUserId: string | null;
    toUserId: string | null;
    changedById: string;
  },
): Promise<void> {
  if (data.fromUserId === data.toUserId) return;
  await client.patientAssignment.create({ data });
}

/** Bitácora del paciente, más reciente primero (solo datos administrativos, nunca clínicos). */
export async function getAssignmentHistory(organizationId: string, patientId: string) {
  return db.patientAssignment.findMany({
    where: { organizationId, patientId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      createdAt: true,
      fromUser: { select: { name: true } },
      toUser: { select: { name: true } },
      changedBy: { select: { name: true } },
    },
  });
}

export type AssignmentEntry = Awaited<ReturnType<typeof getAssignmentHistory>>[number];
