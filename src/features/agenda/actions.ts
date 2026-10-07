"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type AppointmentStatus } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { appointmentScope, canManageAllAppointments, patientScope } from "@/lib/permissions";
import {
  consumingStatuses,
  findPackageForNewAppointment,
  getPackageSummaries,
  syncPackageStatus,
} from "@/lib/domain/packages";
import { SELF_ASSIGN_BLOCKED, canAssignTreating, logAssignment } from "@/lib/domain/assignments";
import { type ActionState, formToObject, fromZodError } from "@/lib/action-state";
import { formatShortDate, formatTime, fromLimaLocal, limaDateKey, todayKey } from "@/lib/dates";
import { APPOINTMENT_STATUS_LABEL, PATIENT_STATUS_LABEL, fullName } from "@/lib/format";
import { EDITABLE_STATUSES, canTransition, isValidTime, parseDateKey } from "./lib";

// ---------- Validación ----------

const baseSchema = z.object({
  professionalId: z
    .string({ error: "Selecciona un profesional." })
    .min(1, { error: "Selecciona un profesional." }),
  date: z
    .string({ error: "Elige la fecha." })
    .refine((v) => parseDateKey(v) !== null, { error: "Fecha inválida." }),
  time: z.string({ error: "Elige la hora de inicio." }).refine(isValidTime, { error: "Hora inválida." }),
  duration: z.coerce
    .number({ error: "Ingresa la duración en minutos." })
    .int({ error: "Usa minutos enteros." })
    .min(10, { error: "Mínimo 10 minutos." })
    .max(480, { error: "Máximo 8 horas." }),
  roomId: z
    .string()
    .optional()
    .transform((v) => (!v || v === "none" ? null : v)),
  modality: z.enum(["PRESENCIAL", "VIRTUAL"], { error: "Elige la modalidad." }),
  notes: z.string().max(500, { error: "Máximo 500 caracteres." }).optional(),
});

const createSchema = baseSchema.extend({
  patientId: z.string({ error: "Selecciona un paciente." }).min(1, { error: "Selecciona un paciente." }),
});

const statusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["PROGRAMADA", "CONFIRMADA", "ATENDIDA", "NO_ASISTIO", "CANCELADA"]),
  reason: z.string().trim().max(300, { error: "Máximo 300 caracteres." }).optional(),
});

const idSchema = z.string().min(1).max(64);

// ---------- Helpers ----------

const NOT_FOUND: ActionState = { ok: false, message: "La cita no existe o no tienes acceso a ella." };

function fieldError(field: string, message: string): ActionState {
  return { ok: false, message, fieldErrors: { [field]: [message] } };
}

function revalidateAgenda(patientId?: string) {
  revalidatePath("/app/agenda");
  revalidatePath("/app/agenda/recordatorios");
  revalidatePath("/app");
  revalidatePath("/app/renovaciones");
  revalidatePath("/app/pacientes");
  if (patientId) revalidatePath(`/app/pacientes/${patientId}`);
}

/** El profesional debe ser de la organización; el psicólogo solo puede agendarse a sí mismo. */
async function resolveProfessional(user: CurrentUser, professionalId: string, currentId?: string) {
  if (!canManageAllAppointments(user) && professionalId !== user.id) return null;
  const unchanged = currentId === professionalId;
  return db.user.findFirst({
    where: {
      id: professionalId,
      organizationId: user.organizationId,
      // Si no cambió (p. ej. editar notas de una cita de alguien ya desactivado), no se exige que siga activo.
      ...(unchanged ? {} : { active: true, OR: [{ isProfessional: true }, { role: "PSICOLOGO" as const }] }),
    },
    select: { id: true, name: true },
  });
}

/** Datos del psicólogo tratante para aplicar la regla «las citas se agendan con el tratante». */
const treatingSelect = {
  id: true,
  name: true,
  active: true,
  isProfessional: true,
  role: true,
} satisfies Prisma.UserSelect;

type TreatingPatient = {
  firstName: string;
  lastName: string;
  professional: Prisma.UserGetPayload<{ select: typeof treatingSelect }> | null;
};

/**
 * Las citas de un paciente con psicólogo tratante se agendan con él (es quien puede abrir su ficha y
 * escribir la nota de evolución). Devuelve el error si `professionalId` no cumple la regla, o null.
 * Si el paciente no tiene tratante no hay restricción: cada acción decide qué hacer.
 */
function treatingRuleError(patient: TreatingPatient, professionalId: string): ActionState | null {
  const treating = patient.professional;
  if (!treating) return null;
  const attends = treating.active && (treating.isProfessional || treating.role === "PSICOLOGO");
  if (!attends) {
    return fieldError(
      "professionalId",
      `${treating.name}, psicólogo tratante de ${fullName(patient)}, ya no está activo como profesional. ` +
        "Asigna otro psicólogo tratante en la ficha del paciente para agendar.",
    );
  }
  if (professionalId !== treating.id) {
    return fieldError(
      "professionalId",
      `Las citas de ${fullName(patient)} se agendan con su psicólogo tratante, ${treating.name}. ` +
        "Para cambiarlo, edita su ficha.",
    );
  }
  return null;
}

async function resolveRoom(user: CurrentUser, roomId: string | null, currentId?: string | null) {
  if (!roomId) return { ok: true as const, roomId: null };
  const room = await db.room.findFirst({
    where: {
      id: roomId,
      organizationId: user.organizationId,
      ...(roomId === currentId ? {} : { active: true }),
    },
    select: { id: true },
  });
  return room ? { ok: true as const, roomId: room.id } : { ok: false as const };
}

type Slot = {
  professionalId: string;
  roomId: string | null;
  startsAt: Date;
  endsAt: Date;
  excludeId?: string;
};

/**
 * Regla anti-cruces: ninguna otra cita activa (≠ CANCELADA) del mismo profesional o del mismo
 * consultorio puede solaparse (startsAt < fin && endsAt > inicio). Devuelve el error o null.
 */
async function findConflict(tx: Prisma.TransactionClient, user: CurrentUser, slot: Slot): Promise<ActionState | null> {
  const rows = await tx.appointment.findMany({
    where: {
      organizationId: user.organizationId,
      status: { not: "CANCELADA" },
      ...(slot.excludeId ? { id: { not: slot.excludeId } } : {}),
      startsAt: { lt: slot.endsAt },
      endsAt: { gt: slot.startsAt },
      OR: [{ professionalId: slot.professionalId }, ...(slot.roomId ? [{ roomId: slot.roomId }] : [])],
    },
    select: {
      startsAt: true,
      endsAt: true,
      professionalId: true,
      roomId: true,
      patient: { select: { firstName: true, lastName: true } },
      professional: { select: { name: true } },
      room: { select: { name: true } },
    },
    orderBy: { startsAt: "asc" },
    take: 10,
  });

  const range = (r: { startsAt: Date; endsAt: Date }) => {
    const sameDay = limaDateKey(r.startsAt) === limaDateKey(slot.startsAt);
    const day = sameDay ? "" : ` del ${formatShortDate(r.startsAt)}`;
    return `de ${formatTime(r.startsAt)} a ${formatTime(r.endsAt)}${day}`;
  };

  const byProfessional = rows.find((r) => r.professionalId === slot.professionalId);
  if (byProfessional) {
    const who = slot.professionalId === user.id ? "Ya tienes" : `${byProfessional.professional.name} ya tiene`;
    const message = `${who} una cita ${range(byProfessional)} (${fullName(byProfessional.patient)}).`;
    return { ok: false, message, fieldErrors: { time: ["El profesional está ocupado en ese horario."] } };
  }

  const byRoom = slot.roomId ? rows.find((r) => r.roomId === slot.roomId) : undefined;
  if (byRoom) {
    // Al psicólogo no se le muestra el nombre del paciente de otro profesional.
    const message = `El consultorio «${byRoom.room?.name ?? ""}» ya está ocupado ${range(byRoom)} (cita de ${byRoom.professional.name}).`;
    return { ok: false, message, fieldErrors: { roomId: ["Consultorio ocupado en ese horario."] } };
  }
  return null;
}

const BUSY: ActionState = {
  ok: false,
  message: "La agenda cambió mientras guardabas (otra persona agendó al mismo tiempo). Intenta nuevamente.",
};

/** Se lanza dentro de la transacción para deshacer lo escrito y devolver el error al usuario. */
class WriteAborted extends Error {
  constructor(readonly state: ActionState) {
    super(state.message);
  }
}

/**
 * Valida cruces y escribe en una transacción serializable, para que dos personas
 * agendando a la vez no puedan crear un cruce. Reintenta una vez ante conflicto de serialización.
 * Si `write` devuelve un error, la transacción se deshace y se devuelve ese error.
 */
async function writeWithoutConflicts(
  user: CurrentUser,
  slot: Slot,
  write: (tx: Prisma.TransactionClient) => Promise<ActionState | void>,
): Promise<ActionState | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await db.$transaction(
        async (tx) => {
          const conflict = await findConflict(tx, user, slot);
          if (conflict) return conflict;
          const failed = await write(tx);
          if (failed) throw new WriteAborted(failed);
          return null;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (error instanceof WriteAborted) return error.state;
      const retryable = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
      if (!retryable) throw error;
    }
  }
  return BUSY;
}

/** ¿El estado ocupa un cupo del paquete (agendada o consumida)? */
function occupiesPackage(status: AppointmentStatus, noShowConsumesSession: boolean): boolean {
  return status === "PROGRAMADA" || status === "CONFIRMADA" || consumingStatuses(noShowConsumesSession).includes(status);
}

/**
 * Paquete que debe quedar asociado tras un cambio de estado:
 * - si el nuevo estado no ocupa cupo (cancelada, inasistencia que no descuenta) se conserva el vínculo como historial;
 * - si ya ocupaba cupo se mantiene;
 * - si vuelve a ocupar cupo (reactivar / deshacer) se verifica que el paquete aún tenga cupo o se busca otro.
 */
async function resolvePackage(
  user: CurrentUser,
  appt: { patientId: string; packageId: string | null; status: AppointmentStatus },
  next: AppointmentStatus,
): Promise<string | null> {
  const org = user.organization;
  if (!occupiesPackage(next, org.noShowConsumesSession)) return appt.packageId;
  if (appt.packageId && occupiesPackage(appt.status, org.noShowConsumesSession)) return appt.packageId;
  if (appt.packageId) {
    const [summary] = await getPackageSummaries({ id: appt.packageId, organizationId: user.organizationId }, org);
    if (summary && summary.status === "ACTIVO" && summary.remainingSessions - summary.scheduledSessions > 0) {
      return appt.packageId;
    }
  }
  return findPackageForNewAppointment(user.organizationId, appt.patientId, org);
}

function whenLabel(startsAt: Date) {
  return `${formatShortDate(startsAt)} a las ${formatTime(startsAt)}`;
}

// ---------- Acciones ----------

export async function createAppointment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = createSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const data = parsed.data;

  const patient = await db.patient.findFirst({
    where: { id: data.patientId, ...patientScope(user) },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      status: true,
      professionalId: true,
      professional: { select: treatingSelect },
    },
  });
  if (!patient) return fieldError("patientId", "Selecciona un paciente válido.");
  if (patient.status !== "ACTIVO" && patient.status !== "EN_PAUSA") {
    return fieldError(
      "patientId",
      `${fullName(patient)} está en estado «${PATIENT_STATUS_LABEL[patient.status]}». Reactívalo en su ficha para agendar.`,
    );
  }

  const treatingError = treatingRuleError(patient, data.professionalId);
  if (treatingError) return treatingError;

  const professional = await resolveProfessional(user, data.professionalId);
  if (!professional) return fieldError("professionalId", "Selecciona un profesional válido.");

  // Paciente sin tratante: quien lo atiende en esta cita queda como su psicólogo tratante.
  const assignTreating = patient.professionalId === null;

  const room = await resolveRoom(user, data.roomId);
  if (!room.ok) return fieldError("roomId", "Elige un consultorio válido.");

  const startsAt = fromLimaLocal(data.date, data.time);
  const endsAt = new Date(startsAt.getTime() + data.duration * 60_000);
  const packageId = await findPackageForNewAppointment(user.organizationId, patient.id, user.organization);

  const treatingChanged = fieldError(
    "professionalId",
    `Mientras agendabas, otra persona asignó un psicólogo tratante a ${fullName(patient)}. Revisa el profesional e intenta nuevamente.`,
  );

  const error = await writeWithoutConflicts(
    user,
    { professionalId: professional.id, roomId: room.roomId, startsAt, endsAt },
    async (tx) => {
      if (assignTreating) {
        if (!(await canAssignTreating(user.id, patient, professional.id, tx))) {
          return fieldError("professionalId", SELF_ASSIGN_BLOCKED);
        }
        // Solo si sigue sin tratante: otra persona pudo asignarle uno mientras tanto.
        const assigned = await tx.patient.updateMany({
          where: { id: patient.id, organizationId: user.organizationId, professionalId: null },
          data: { professionalId: professional.id },
        });
        if (assigned.count === 0) return treatingChanged;
        await logAssignment(tx, {
          organizationId: user.organizationId,
          patientId: patient.id,
          fromUserId: null,
          toUserId: professional.id,
          changedById: user.id,
        });
      }
      await tx.appointment.create({
        data: {
          organizationId: user.organizationId,
          patientId: patient.id,
          professionalId: professional.id,
          roomId: room.roomId,
          packageId,
          startsAt,
          endsAt,
          modality: data.modality,
          notes: data.notes ?? null,
          createdById: user.id,
        },
      });
    },
  );
  if (error) {
    // Refresca la agenda para que el formulario muestre el tratante que se acaba de asignar.
    if (error === treatingChanged) revalidateAgenda(patient.id);
    return error;
  }

  revalidateAgenda(patient.id);
  let message = `Cita agendada: ${fullName(patient)}, ${whenLabel(startsAt)}.`;
  if (assignTreating) {
    revalidatePath(`/app/pacientes/${patient.id}/editar`);
    message +=
      professional.id === user.id
        ? " Quedas como su psicólogo tratante."
        : ` ${professional.name} queda como su psicólogo tratante.`;
  }
  return { ok: true, message };
}

export async function updateAppointment(
  appointmentId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!idSchema.safeParse(appointmentId).success) return NOT_FOUND;
  const parsed = baseSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const data = parsed.data;

  const appt = await db.appointment.findFirst({
    where: { id: appointmentId, ...appointmentScope(user) },
    select: {
      id: true,
      status: true,
      patientId: true,
      professionalId: true,
      roomId: true,
      packageId: true,
      startsAt: true,
      patient: { select: { firstName: true, lastName: true, professional: { select: treatingSelect } } },
    },
  });
  if (!appt) return NOT_FOUND;
  if (!EDITABLE_STATUSES.includes(appt.status)) {
    return { ok: false, message: "Solo se pueden reprogramar citas programadas o confirmadas." };
  }

  // Si no cambia el profesional se permite editar aunque ya no sea el tratante (p. ej. citas previas
  // a una reasignación). Si cambia, solo puede pasar al psicólogo tratante actual.
  if (data.professionalId !== appt.professionalId) {
    if (!appt.patient.professional) {
      return fieldError(
        "professionalId",
        `${fullName(appt.patient)} no tiene psicólogo tratante. Asígnale uno en su ficha para pasar la cita a otro profesional.`,
      );
    }
    const treatingError = treatingRuleError(appt.patient, data.professionalId);
    if (treatingError) return treatingError;
  }

  const professional = await resolveProfessional(user, data.professionalId, appt.professionalId);
  if (!professional) return fieldError("professionalId", "Selecciona un profesional válido.");

  const room = await resolveRoom(user, data.roomId, appt.roomId);
  if (!room.ok) return fieldError("roomId", "Elige un consultorio válido.");

  const startsAt = fromLimaLocal(data.date, data.time);
  const endsAt = new Date(startsAt.getTime() + data.duration * 60_000);
  const moved = startsAt.getTime() !== appt.startsAt.getTime();
  // Si la cita aún no descuenta de ningún paquete, se intenta asociar uno (p. ej. lo compró después de agendar).
  const packageId =
    appt.packageId ?? (await findPackageForNewAppointment(user.organizationId, appt.patientId, user.organization));

  const error = await writeWithoutConflicts(
    user,
    { professionalId: professional.id, roomId: room.roomId, startsAt, endsAt, excludeId: appt.id },
    async (tx) => {
      await tx.appointment.update({
        where: { id: appt.id },
        data: {
          professionalId: professional.id,
          roomId: room.roomId,
          packageId,
          startsAt,
          endsAt,
          modality: data.modality,
          notes: data.notes ?? null,
          // El recordatorio enviado era para el horario anterior.
          ...(moved ? { reminderSentAt: null } : {}),
        },
      });
    },
  );
  if (error) return error;

  revalidateAgenda(appt.patientId);
  return { ok: true, message: moved ? `Cita reprogramada para el ${whenLabel(startsAt)}.` : "Cita actualizada." };
}

const STATUS_MESSAGE: Record<AppointmentStatus, string> = {
  PROGRAMADA: "La cita volvió a estado Programada.",
  CONFIRMADA: "Cita confirmada.",
  ATENDIDA: "Cita marcada como atendida.",
  NO_ASISTIO: "Se registró la inasistencia.",
  CANCELADA: "Cita cancelada.",
};

export async function changeAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus,
  reason?: string,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = statusSchema.safeParse({ id: appointmentId, status, reason: reason?.trim() || undefined });
  if (!parsed.success) return { ok: false, message: "Solicitud inválida." };
  const next = parsed.data.status;

  const appt = await db.appointment.findFirst({
    where: { id: parsed.data.id, ...appointmentScope(user) },
    select: {
      id: true,
      status: true,
      patientId: true,
      professionalId: true,
      roomId: true,
      packageId: true,
      startsAt: true,
      endsAt: true,
    },
  });
  if (!appt) return NOT_FOUND;
  if (appt.status === next) return { ok: true, message: STATUS_MESSAGE[next] };
  if (!canTransition(appt.status, next)) {
    return {
      ok: false,
      message: `No se puede pasar de «${APPOINTMENT_STATUS_LABEL[appt.status]}» a «${APPOINTMENT_STATUS_LABEL[next]}».`,
    };
  }
  if ((next === "ATENDIDA" || next === "NO_ASISTIO") && limaDateKey(appt.startsAt) > todayKey()) {
    return { ok: false, message: "Esta cita es de un día futuro: aún no puedes marcar asistencia." };
  }

  const packageId = await resolvePackage(user, appt, next);
  const data: Prisma.AppointmentUncheckedUpdateInput = {
    status: next,
    packageId,
    cancelReason: next === "CANCELADA" ? (parsed.data.reason ?? null) : null,
  };

  if (appt.status === "CANCELADA") {
    // Reactivar: el horario pudo ocuparse mientras estuvo cancelada.
    const error = await writeWithoutConflicts(
      user,
      {
        professionalId: appt.professionalId,
        roomId: appt.roomId,
        startsAt: appt.startsAt,
        endsAt: appt.endsAt,
        excludeId: appt.id,
      },
      async (tx) => {
        await tx.appointment.update({ where: { id: appt.id }, data });
      },
    );
    if (error) return error;
  } else {
    await db.appointment.update({ where: { id: appt.id }, data });
  }

  const touched = new Set([appt.packageId, packageId].filter((id): id is string => !!id));
  for (const id of touched) await syncPackageStatus(id, user.organization);

  revalidateAgenda(appt.patientId);
  return { ok: true, message: STATUS_MESSAGE[next] };
}

/** Solo citas programadas que nunca se atendieron (sin nota). Para lo demás, cancelar. */
export async function deleteAppointment(appointmentId: string): Promise<ActionState> {
  const user = await requireUser();
  if (!idSchema.safeParse(appointmentId).success) return NOT_FOUND;

  const appt = await db.appointment.findFirst({
    where: { id: appointmentId, ...appointmentScope(user) },
    select: { id: true, status: true, patientId: true, packageId: true, sessionNote: { select: { id: true } } },
  });
  if (!appt) return NOT_FOUND;
  if (appt.status !== "PROGRAMADA" || appt.sessionNote) {
    return { ok: false, message: "Solo se pueden eliminar citas programadas que no se atendieron. Cancélala en su lugar." };
  }

  await db.appointment.delete({ where: { id: appt.id } });
  if (appt.packageId) await syncPackageStatus(appt.packageId, user.organization);

  revalidateAgenda(appt.patientId);
  return { ok: true, message: "Cita eliminada." };
}

/** Registra que se abrió el recordatorio de WhatsApp (el envío lo hace el personal desde su WhatsApp). */
export async function markReminderSent(appointmentId: string): Promise<ActionState> {
  const user = await requireUser();
  if (!idSchema.safeParse(appointmentId).success) return NOT_FOUND;

  const appt = await db.appointment.findFirst({
    where: { id: appointmentId, ...appointmentScope(user) },
    select: { id: true, status: true },
  });
  if (!appt) return NOT_FOUND;
  if (appt.status !== "PROGRAMADA" && appt.status !== "CONFIRMADA") {
    return { ok: false, message: "Solo se envían recordatorios de citas programadas o confirmadas." };
  }

  await db.appointment.update({ where: { id: appt.id }, data: { reminderSentAt: new Date() } });
  revalidatePath("/app/agenda");
  revalidatePath("/app/agenda/recordatorios");
  revalidatePath("/app");
  return { ok: true, message: "Recordatorio registrado como enviado." };
}
