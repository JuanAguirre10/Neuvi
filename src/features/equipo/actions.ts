"use server";

import { revalidatePath } from "next/cache";
import { hash } from "bcryptjs";
import { Prisma, type Role } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole, type CurrentUser } from "@/lib/auth";
import { type ActionState, formToObject, fromZodError } from "@/lib/action-state";
import { DEFAULT_CALENDAR_COLOR } from "./constants";
import { generateTempPassword } from "./password";

/** Resultado que además devuelve (una sola vez) la contraseña temporal generada. */
export type MemberActionState = ActionState & {
  tempPassword?: string;
  memberName?: string;
  memberEmail?: string;
};

const NOT_CENTER: ActionState = {
  ok: false,
  message: "La gestión de equipo es parte del Plan Centro Psicológico.",
};

const memberSchema = z.object({
  name: z
    .string({ error: "Ingresa el nombre completo." })
    .min(3, { error: "Ingresa el nombre completo." })
    .max(120, { error: "Máximo 120 caracteres." }),
  email: z.email({ error: "Ingresa un correo válido." }).transform((v) => v.toLowerCase()),
  role: z.enum(["ADMIN", "PSICOLOGO", "RECEPCION"], { error: "Elige un rol." }),
  attends: z.string().optional(),
  specialty: z.string().max(120, { error: "Máximo 120 caracteres." }).optional(),
  licenseNumber: z
    .string()
    .max(20, { error: "Máximo 20 caracteres." })
    .regex(/^[\w\s.-]+$/, { error: "Usa solo números y letras." })
    .optional(),
  phone: z
    .string()
    .regex(/^\+?[\d\s-]{9,15}$/, { error: "Ingresa un celular válido (9 dígitos)." })
    .optional(),
  calendarColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, { error: "Color inválido." })
    .optional(),
});

const createSchema = memberSchema.extend({
  password: z
    .string()
    .min(8, { error: "Mínimo 8 caracteres." })
    .max(72, { error: "Máximo 72 caracteres." })
    .optional(),
});

type MemberInput = z.infer<typeof memberSchema>;

/** Psicólogo => siempre atiende; recepción => nunca; administrador => opcional. */
function resolveProfessional(role: Role, attends: string | undefined): boolean {
  if (role === "PSICOLOGO") return true;
  if (role === "RECEPCION") return false;
  return attends === "on";
}

function memberData(input: MemberInput) {
  const isProfessional = resolveProfessional(input.role, input.attends);
  return {
    name: input.name,
    email: input.email,
    role: input.role,
    isProfessional,
    specialty: isProfessional ? (input.specialty ?? null) : null,
    licenseNumber: isProfessional ? (input.licenseNumber ?? null) : null,
    phone: input.phone ?? null,
    calendarColor: (input.calendarColor ?? DEFAULT_CALENDAR_COLOR).toUpperCase(),
  };
}

const EMAIL_TAKEN: ActionState = {
  ok: false,
  message: "Ya existe un usuario con ese correo.",
  fieldErrors: { email: ["Este correo ya está registrado en Neuvi (puede pertenecer a otra cuenta)."] },
};

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

async function findMember(user: CurrentUser, memberId: string) {
  if (typeof memberId !== "string" || !memberId) return null;
  return db.user.findFirst({
    where: { id: memberId, organizationId: user.organizationId },
    select: { id: true, role: true, active: true, email: true, isProfessional: true },
  });
}

/** ¿Queda al menos otro administrador activo además de `excludeId`? */
async function hasAnotherActiveAdmin(organizationId: string, excludeId: string): Promise<boolean> {
  const count = await db.user.count({
    where: { organizationId, role: "ADMIN", active: true, id: { not: excludeId } },
  });
  return count > 0;
}

export async function createMemberAction(_prev: ActionState, formData: FormData): Promise<MemberActionState> {
  const user = await requireRole("ADMIN");
  if (user.organization.type !== "CENTRO") return NOT_CENTER;

  const parsed = createSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const data = memberData(parsed.data);

  const exists = await db.user.findUnique({ where: { email: data.email }, select: { id: true } });
  if (exists) return EMAIL_TAKEN;

  const password = parsed.data.password ?? generateTempPassword();
  const passwordHash = await hash(password, 10);

  try {
    await db.user.create({
      data: { ...data, organizationId: user.organizationId, passwordHash, active: true },
    });
  } catch (e) {
    if (isUniqueViolation(e)) return EMAIL_TAKEN;
    throw e;
  }

  revalidatePath("/app/equipo");
  return {
    ok: true,
    message: `${data.name} ya puede ingresar a Neuvi.`,
    tempPassword: password,
    memberName: data.name,
    memberEmail: data.email,
  };
}

export async function updateMemberAction(
  memberId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("ADMIN");
  if (user.organization.type !== "CENTRO") return NOT_CENTER;

  const member = await findMember(user, memberId);
  if (!member) return { ok: false, message: "No encontramos a este miembro del equipo." };

  const parsed = memberSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const data = memberData(parsed.data);

  if (member.id === user.id && data.role !== "ADMIN") {
    return {
      ok: false,
      message: "No puedes quitarte el rol de administrador.",
      fieldErrors: { role: ["Pide a otro administrador que cambie tu rol."] },
    };
  }
  if (member.role === "ADMIN" && data.role !== "ADMIN" && member.active) {
    if (!(await hasAnotherActiveAdmin(user.organizationId, member.id))) {
      return { ok: false, message: "El centro debe tener al menos un administrador activo." };
    }
  }

  if (member.isProfessional && !data.isProfessional) {
    const [patients, upcoming] = await Promise.all([
      db.patient.count({ where: { organizationId: user.organizationId, professionalId: member.id } }),
      db.appointment.count({
        where: {
          organizationId: user.organizationId,
          professionalId: member.id,
          status: { in: ["PROGRAMADA", "CONFIRMADA"] },
          startsAt: { gte: new Date() },
        },
      }),
    ]);
    if (patients > 0 || upcoming > 0) {
      return {
        ok: false,
        message:
          `Tiene ${patients} paciente(s) asignado(s) y ${upcoming} cita(s) próxima(s). ` +
          "Reasígnalos a otro psicólogo antes de quitarle la atención de pacientes.",
      };
    }
  }

  if (data.email !== member.email) {
    const taken = await db.user.findUnique({ where: { email: data.email }, select: { id: true } });
    if (taken && taken.id !== member.id) return EMAIL_TAKEN;
  }

  try {
    await db.user.update({ where: { id: member.id }, data });
  } catch (e) {
    if (isUniqueViolation(e)) return EMAIL_TAKEN;
    throw e;
  }

  revalidatePath("/app/equipo");
  if (member.id === user.id) revalidatePath("/app", "layout");
  return { ok: true, message: "Cambios guardados." };
}

export async function setMemberActiveAction(memberId: string, active: boolean): Promise<ActionState> {
  const user = await requireRole("ADMIN");
  if (user.organization.type !== "CENTRO") return NOT_CENTER;

  const member = await findMember(user, memberId);
  if (!member) return { ok: false, message: "No encontramos a este miembro del equipo." };

  if (!active) {
    if (member.id === user.id) return { ok: false, message: "No puedes desactivar tu propia cuenta." };
    if (member.role === "ADMIN" && !(await hasAnotherActiveAdmin(user.organizationId, member.id))) {
      return { ok: false, message: "El centro debe tener al menos un administrador activo." };
    }
  }

  await db.user.update({ where: { id: member.id }, data: { active: Boolean(active) } });
  revalidatePath("/app/equipo");
  return {
    ok: true,
    message: active ? "Acceso reactivado." : "Acceso desactivado. Sus pacientes y citas se conservan.",
  };
}

export async function resetMemberPasswordAction(memberId: string): Promise<MemberActionState> {
  const user = await requireRole("ADMIN");
  if (user.organization.type !== "CENTRO") return NOT_CENTER;

  const member = await findMember(user, memberId);
  if (!member) return { ok: false, message: "No encontramos a este miembro del equipo." };
  if (member.id === user.id) {
    return { ok: false, message: "Para cambiar tu propia contraseña usa Mi perfil." };
  }

  const password = generateTempPassword();
  const passwordHash = await hash(password, 10);
  const updated = await db.user.update({
    where: { id: member.id },
    data: { passwordHash },
    select: { name: true, email: true },
  });

  return {
    ok: true,
    message: "Se generó una nueva contraseña temporal.",
    tempPassword: password,
    memberName: updated.name,
    memberEmail: updated.email,
  };
}
