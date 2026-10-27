"use server";

import { revalidatePath } from "next/cache";
import { hash } from "bcryptjs";
import { Prisma, type PlatformRole } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { emailInUse } from "@/lib/accounts";
import { type ActionState, formToObject, fromZodError } from "@/lib/action-state";
import { PLATFORM_ROLE_LABEL } from "@/lib/format";
import { generateTempPassword } from "@/features/equipo/password";
import { ActionError, DENIED, authorize, isUniqueViolation, runAction } from "./guard";

// Equipo de Neuvi (solo SUPERADMIN). Reglas: nadie se desactiva ni se quita el rol a sí mismo,
// y siempre queda al menos un SUPERADMIN activo.

/** Resultado que además devuelve (una sola vez) la contraseña temporal generada. */
export type AdminMemberActionState = ActionState & {
  tempPassword?: string;
  memberName?: string;
  memberEmail?: string;
};

const ROLES = ["SUPERADMIN", "FINANZAS", "SOPORTE"] as const;
const role = z.enum(ROLES, { error: "Elige un rol." });

const createSchema = z.object({
  name: z
    .string({ error: "Ingresa el nombre completo." })
    .min(3, { error: "Ingresa el nombre completo." })
    .max(120, { error: "Máximo 120 caracteres." }),
  email: z.email({ error: "Ingresa un correo válido." }).transform((v) => v.toLowerCase()),
  role,
  password: z
    .string()
    .min(10, { error: "Mínimo 10 caracteres." })
    .max(72, { error: "Máximo 72 caracteres." })
    .optional(),
});

const EMAIL_TAKEN: ActionState = {
  ok: false,
  message: "Ya existe un miembro con ese correo.",
  fieldErrors: { email: ["Este correo ya está registrado en Neuvi (equipo o cuenta de un cliente)."] },
};

const NOT_FOUND: ActionState = { ok: false, message: "No encontramos a este miembro del equipo." };

function validId(id: unknown): id is string {
  return typeof id === "string" && id.length > 0 && id.length <= 40;
}

/** Transacción serializable: dos superadmins no pueden quitarse el rol a la vez y dejar el panel sin ninguno. */
function serializable<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) {
  return db.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

async function ensureAnotherSuperadmin(tx: Prisma.TransactionClient, excludeId: string) {
  const others = await tx.platformAdmin.count({ where: { role: "SUPERADMIN", active: true, id: { not: excludeId } } });
  if (others === 0) throw new ActionError("Debe quedar al menos un superadmin activo.");
}

function revalidateTeam() {
  revalidatePath("/admin/equipo");
  revalidatePath("/admin/actividad");
}

export async function createPlatformAdminAction(_prev: ActionState, formData: FormData): Promise<AdminMemberActionState> {
  const admin = await authorize("team");
  if (!admin) return DENIED;
  const parsed = createSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const data = parsed.data;

  const password = data.password ?? generateTempPassword();
  const passwordHash = await hash(password, 10);
  try {
    await db.$transaction(async (tx) => {
      if (await emailInUse(data.email, tx)) throw new ActionError(EMAIL_TAKEN.message!, EMAIL_TAKEN.fieldErrors as Record<string, string[]>);
      await tx.platformAdmin.create({ data: { name: data.name, email: data.email, role: data.role, passwordHash } });
    });
  } catch (e) {
    if (e instanceof ActionError || isUniqueViolation(e, "email")) return EMAIL_TAKEN;
    throw e;
  }

  revalidateTeam();
  return {
    ok: true,
    message: `${data.name} ya puede ingresar al panel como ${PLATFORM_ROLE_LABEL[data.role]}.`,
    tempPassword: password,
    memberName: data.name,
    memberEmail: data.email,
  };
}

export async function updatePlatformAdminRoleAction(
  memberId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await authorize("team");
  if (!admin) return DENIED;
  if (!validId(memberId)) return NOT_FOUND;
  const parsed = z.object({ role }).safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const nextRole: PlatformRole = parsed.data.role;

  if (memberId === admin.id) {
    return { ok: false, message: "No puedes cambiar tu propio rol.", fieldErrors: { role: ["Pide a otro superadmin que lo haga."] } };
  }

  return runAction(async () => {
    const name = await serializable(async (tx) => {
      const member = await tx.platformAdmin.findUnique({ where: { id: memberId }, select: { id: true, name: true, role: true, active: true } });
      if (!member) throw new ActionError(NOT_FOUND.message!);
      if (member.role === nextRole) throw new ActionError("Ya tiene ese rol.");
      if (member.role === "SUPERADMIN" && member.active) await ensureAnotherSuperadmin(tx, member.id);
      await tx.platformAdmin.update({ where: { id: member.id }, data: { role: nextRole } });
      return member.name;
    });
    revalidateTeam();
    return { ok: true, message: `${name} ahora es ${PLATFORM_ROLE_LABEL[nextRole]}.` };
  });
}

export async function setPlatformAdminActiveAction(memberId: string, active: boolean): Promise<ActionState> {
  const admin = await authorize("team");
  if (!admin) return DENIED;
  if (!validId(memberId)) return NOT_FOUND;
  if (!active && memberId === admin.id) return { ok: false, message: "No puedes desactivar tu propia cuenta." };

  return runAction(async () => {
    const name = await serializable(async (tx) => {
      const member = await tx.platformAdmin.findUnique({ where: { id: memberId }, select: { id: true, name: true, role: true, active: true } });
      if (!member) throw new ActionError(NOT_FOUND.message!);
      if (member.active === Boolean(active)) throw new ActionError(active ? "Ya tiene acceso." : "Ya estaba desactivado.");
      if (!active && member.role === "SUPERADMIN") await ensureAnotherSuperadmin(tx, member.id);
      await tx.platformAdmin.update({ where: { id: member.id }, data: { active: Boolean(active) } });
      return member.name;
    });
    revalidateTeam();
    return { ok: true, message: active ? `${name} vuelve a tener acceso.` : `${name} ya no puede ingresar al panel.` };
  });
}

export async function resetPlatformAdminPasswordAction(memberId: string): Promise<AdminMemberActionState> {
  const admin = await authorize("team");
  if (!admin) return DENIED;
  if (!validId(memberId)) return NOT_FOUND;
  if (memberId === admin.id) return { ok: false, message: "No puedes restablecer tu propia contraseña desde aquí." };

  const password = generateTempPassword();
  const passwordHash = await hash(password, 10);
  return runAction(async () => {
    const member = await db.$transaction(async (tx) => {
      const found = await tx.platformAdmin.findUnique({ where: { id: memberId }, select: { id: true } });
      if (!found) throw new ActionError(NOT_FOUND.message!);
      return tx.platformAdmin.update({ where: { id: found.id }, data: { passwordHash }, select: { name: true, email: true } });
    });
    return {
      ok: true,
      message: "Se generó una nueva contraseña temporal.",
      tempPassword: password,
      memberName: member.name,
      memberEmail: member.email,
    };
  });
}
