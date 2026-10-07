"use server";

import { revalidatePath } from "next/cache";
import { compare, hash } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { type ActionState, formToObject, fromZodError } from "@/lib/action-state";

const profileSchema = z.object({
  name: z
    .string({ error: "Ingresa tu nombre completo." })
    .min(3, { error: "Ingresa tu nombre completo." })
    .max(120, { error: "Máximo 120 caracteres." }),
  phone: z
    .string()
    .regex(/^\+?[\d\s-]{9,15}$/, { error: "Ingresa un celular válido (9 dígitos)." })
    .optional(),
  specialty: z.string().max(120, { error: "Máximo 120 caracteres." }).optional(),
  licenseNumber: z
    .string()
    .max(20, { error: "Máximo 20 caracteres." })
    .regex(/^[\w\s.-]+$/, { error: "Usa solo números y letras." })
    .optional(),
  calendarColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, { error: "Color inválido." })
    .optional(),
});

/** Cualquier usuario edita SUS datos. Especialidad, colegiatura y color solo si atiende pacientes. */
export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const d = parsed.data;

  await db.user.update({
    where: { id: user.id },
    data: {
      name: d.name,
      phone: d.phone ?? null,
      ...(user.isProfessional
        ? {
            specialty: d.specialty ?? null,
            licenseNumber: d.licenseNumber ?? null,
            ...(d.calendarColor ? { calendarColor: d.calendarColor.toUpperCase() } : {}),
          }
        : {}),
    },
  });

  revalidatePath("/app", "layout");
  return { ok: true, message: "Perfil actualizado." };
}

const passwordSchema = z
  .object({
    currentPassword: z
      .string({ error: "Ingresa tu contraseña actual." })
      .min(1, { error: "Ingresa tu contraseña actual." }),
    newPassword: z
      .string({ error: "Crea una nueva contraseña." })
      .min(8, { error: "Mínimo 8 caracteres." })
      .max(72, { error: "Máximo 72 caracteres." }),
    confirmPassword: z.string({ error: "Repite la nueva contraseña." }),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    error: "Las contraseñas no coinciden.",
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    path: ["newPassword"],
    error: "La nueva contraseña debe ser distinta a la actual.",
  });

export async function changePasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  // Las contraseñas no se recortan: se leen tal cual del FormData.
  const raw = {
    currentPassword: formData.get("currentPassword") || undefined,
    newPassword: formData.get("newPassword") || undefined,
    confirmPassword: formData.get("confirmPassword") || undefined,
  };
  const parsed = passwordSchema.safeParse(raw);
  if (!parsed.success) return fromZodError(parsed.error);

  const record = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!record || !(await compare(parsed.data.currentPassword, record.passwordHash))) {
    return {
      ok: false,
      message: "La contraseña actual no es correcta.",
      fieldErrors: { currentPassword: ["La contraseña actual no es correcta."] },
    };
  }

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hash(parsed.data.newPassword, 10) },
  });
  return { ok: true, message: "Contraseña actualizada." };
}
