"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { isScopedToOwnPatients, patientScope } from "@/lib/permissions";
import { dateOnlyFromKey } from "@/lib/dates";
import { canAssignTreating, logAssignment, SELF_ASSIGN_BLOCKED } from "@/lib/domain/assignments";
import { type ActionState, formToObject, fromZodError } from "@/lib/action-state";
import { cleanPhone, patientSchema, type PatientInput } from "./schema";
import { patientHref } from "./utils";

const DUPLICATE_DOCUMENT: ActionState = {
  ok: false,
  message: "Ya existe un paciente con ese número de documento en tu organización.",
  fieldErrors: { documentNumber: ["Este N.º de documento ya está registrado. Búscalo en la lista de pacientes."] },
};

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/**
 * Psicólogo tratante que se guardará.
 * - PSICOLOGO: siempre él mismo (solo gestiona sus pacientes).
 * - ADMIN / RECEPCION: un profesional activo de la organización, o ninguno.
 *   Si no cambia el que ya tenía, se conserva aunque esté inactivo.
 */
async function resolveProfessionalId(
  user: CurrentUser,
  requested: string | undefined,
  current: string | null,
): Promise<{ ok: true; id: string | null } | { ok: false }> {
  if (isScopedToOwnPatients(user)) return { ok: true, id: user.id };
  if (!requested) return { ok: true, id: null };
  if (requested === current) return { ok: true, id: requested };
  const pro = await db.user.findFirst({
    where: { id: requested, organizationId: user.organizationId, isProfessional: true, active: true },
    select: { id: true },
  });
  return pro ? { ok: true, id: pro.id } : { ok: false };
}

function toPatientData(d: PatientInput) {
  return {
    firstName: d.firstName,
    lastName: d.lastName,
    documentType: d.documentType,
    documentNumber: d.documentNumber ?? null,
    birthDate: d.birthDate ? dateOnlyFromKey(d.birthDate) : null,
    sex: d.sex ?? null,
    maritalStatus: d.maritalStatus ?? null,
    educationLevel: d.educationLevel ?? null,
    occupation: d.occupation ?? null,
    phone: cleanPhone(d.phone),
    email: d.email?.toLowerCase() ?? null,
    address: d.address ?? null,
    district: d.district ?? null,
    guardianName: d.guardianName ?? null,
    guardianRelationship: d.guardianRelationship ?? null,
    guardianPhone: cleanPhone(d.guardianPhone),
    emergencyContactName: d.emergencyContactName ?? null,
    emergencyContactRelationship: d.emergencyContactRelationship ?? null,
    emergencyContactPhone: cleanPhone(d.emergencyContactPhone),
    referralSource: d.referralSource ?? null,
    status: d.status,
    adminNotes: d.adminNotes ?? null,
  };
}

async function documentTaken(organizationId: string, documentNumber: string | undefined, exceptId?: string) {
  if (!documentNumber) return false;
  const found = await db.patient.findFirst({
    where: { organizationId, documentNumber, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    select: { id: true },
  });
  return found !== null;
}

const INVALID_PROFESSIONAL: ActionState = {
  ok: false,
  message: "Revisa los campos marcados.",
  fieldErrors: { professionalId: ["Elige un profesional activo de tu organización."] },
};

const SELF_ASSIGN_ERROR: ActionState = {
  ok: false,
  message: SELF_ASSIGN_BLOCKED,
  fieldErrors: { professionalId: [SELF_ASSIGN_BLOCKED] },
};

export async function createPatientAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = patientSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const data = parsed.data;

  const pro = await resolveProfessionalId(user, data.professionalId, null);
  if (!pro.ok) return INVALID_PROFESSIONAL;
  if (await documentTaken(user.organizationId, data.documentNumber)) return DUPLICATE_DOCUMENT;

  let id: string;
  try {
    // La asignación inicial también queda en la bitácora de tratantes (no hace nada si es "Sin asignar").
    id = await db.$transaction(async (tx) => {
      const created = await tx.patient.create({
        data: { ...toPatientData(data), organizationId: user.organizationId, professionalId: pro.id },
        select: { id: true },
      });
      await logAssignment(tx, {
        organizationId: user.organizationId,
        patientId: created.id,
        fromUserId: null,
        toUserId: pro.id,
        changedById: user.id,
      });
      return created.id;
    });
  } catch (error) {
    if (isUniqueViolation(error)) return DUPLICATE_DOCUMENT;
    throw error;
  }

  revalidatePath("/app/pacientes");
  revalidatePath("/app");
  redirect(`/app/pacientes/${id}`);
}

export async function updatePatientAction(
  patientId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const existing = await db.patient.findFirst({
    where: { AND: [{ id: patientId }, patientScope(user)] },
    select: { id: true, professionalId: true },
  });
  if (!existing) return { ok: false, message: "El paciente no existe o no tienes acceso a él." };

  const parsed = patientSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const data = parsed.data;

  const pro = await resolveProfessionalId(user, data.professionalId, existing.professionalId);
  if (!pro.ok) return INVALID_PROFESSIONAL;
  const changed = pro.id !== existing.professionalId;
  if (await documentTaken(user.organizationId, data.documentNumber, existing.id)) return DUPLICATE_DOCUMENT;

  try {
    const blocked = await db.$transaction(async (tx) => {
      // Nadie se asigna a sí mismo un paciente con historia clínica de otro profesional.
      if (changed && !(await canAssignTreating(user.id, existing, pro.id, tx))) return true;
      await tx.patient.update({
        where: { id: existing.id },
        data: { ...toPatientData(data), professionalId: pro.id },
      });
      await logAssignment(tx, {
        organizationId: user.organizationId,
        patientId: existing.id,
        fromUserId: existing.professionalId,
        toUserId: pro.id,
        changedById: user.id,
      });
      return false;
    });
    if (blocked) return SELF_ASSIGN_ERROR;
  } catch (error) {
    if (isUniqueViolation(error)) return DUPLICATE_DOCUMENT;
    throw error;
  }

  // Las citas próximas con otro profesional (el tratante anterior, o uno de antes si el paciente
  // pasó por "Sin asignar") no se mueven solas: la ficha avisa (?traspaso=N) para reprogramarlas.
  const pendingWithPrevious = changed
    ? await db.appointment.count({
        where: {
          organizationId: user.organizationId,
          patientId: existing.id,
          ...(pro.id ? { professionalId: { not: pro.id } } : {}),
          status: { in: ["PROGRAMADA", "CONFIRMADA"] },
          startsAt: { gte: new Date() },
        },
      })
    : 0;

  revalidatePath("/app/pacientes");
  revalidatePath(`/app/pacientes/${existing.id}`);
  revalidatePath("/app/renovaciones");
  redirect(patientHref(existing.id, { traspaso: pendingWithPrevious ? String(pendingWithPrevious) : undefined }));
}
