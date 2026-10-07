"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { type ActionState, formToObject, fromZodError } from "@/lib/action-state";
import { syncPackageStatus } from "@/lib/domain/packages";
import { DEFAULT_REMINDER_TEMPLATE, DEFAULT_RENEWAL_TEMPLATE } from "@/lib/whatsapp";
import { REMINDER_VARIABLES, RENEWAL_VARIABLES, TEMPLATE_MAX_LENGTH, unknownVariables } from "./templates";

// ---------------------------------------------------------------------------
// General: datos de la organización y reglas de agenda / paquetes
// ---------------------------------------------------------------------------

const orgSchema = z.object({
  name: z
    .string({ error: "Ingresa el nombre del consultorio o centro." })
    .min(2, { error: "Ingresa el nombre del consultorio o centro." })
    .max(120, { error: "Máximo 120 caracteres." }),
  phone: z
    .string()
    .regex(/^\+?[\d\s-]{9,15}$/, { error: "Ingresa un teléfono válido (9 dígitos)." })
    .optional(),
  email: z.email({ error: "Ingresa un correo válido." }).transform((v) => v.toLowerCase()).optional(),
  address: z.string().max(200, { error: "Máximo 200 caracteres." }).optional(),
  ruc: z
    .string()
    .regex(/^\d{11}$/, { error: "El RUC debe tener 11 dígitos." })
    .optional(),
  defaultSessionMinutes: z.coerce
    .number({ error: "Ingresa la duración en minutos." })
    .int({ error: "Usa minutos enteros." })
    .min(15, { error: "Mínimo 15 minutos." })
    .max(240, { error: "Máximo 240 minutos." }),
  renewalThreshold: z.coerce
    .number({ error: "Ingresa un número de sesiones." })
    .int({ error: "Usa un número entero." })
    .min(1, { error: "Mínimo 1 sesión." })
    .max(10, { error: "Máximo 10 sesiones." }),
  noShowConsumesSession: z.string().optional(),
});

export async function updateOrganizationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("ADMIN");
  const parsed = orgSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const d = parsed.data;
  const noShowConsumesSession = d.noShowConsumesSession === "on";

  const before = await db.organization.findUniqueOrThrow({
    where: { id: user.organizationId },
    select: { noShowConsumesSession: true },
  });

  await db.organization.update({
    where: { id: user.organizationId },
    data: {
      name: d.name,
      phone: d.phone ?? null,
      email: d.email ?? null,
      address: d.address ?? null,
      ruc: d.ruc ?? null,
      defaultSessionMinutes: d.defaultSessionMinutes,
      renewalThreshold: d.renewalThreshold,
      noShowConsumesSession,
    },
  });

  // Si cambia la regla de inasistencias, cambian las sesiones usadas: recalcula el estado
  // (ACTIVO / COMPLETADO) de los paquetes que tienen alguna inasistencia.
  if (before.noShowConsumesSession !== noShowConsumesSession) {
    const affected = await db.package.findMany({
      where: {
        organizationId: user.organizationId,
        status: { not: "CANCELADO" },
        appointments: { some: { status: "NO_ASISTIO" } },
      },
      select: { id: true },
    });
    const rules = { renewalThreshold: d.renewalThreshold, noShowConsumesSession };
    for (const p of affected) await syncPackageStatus(p.id, rules);
  }

  revalidatePath("/app", "layout");
  return { ok: true, message: "Configuración guardada." };
}

// ---------------------------------------------------------------------------
// Plantillas de WhatsApp
// ---------------------------------------------------------------------------

function templateField(allowed: readonly { key: string }[]) {
  return z
    .string()
    .max(TEMPLATE_MAX_LENGTH, { error: `Máximo ${TEMPLATE_MAX_LENGTH} caracteres.` })
    .superRefine((value, ctx) => {
      const unknown = unknownVariables(value, allowed);
      if (unknown.length > 0) {
        ctx.addIssue({
          code: "custom",
          message: `Variable no reconocida: ${unknown.join(", ")}. Usa solo las variables disponibles.`,
        });
      }
    })
    .optional();
}

const templatesSchema = z.object({
  reminderTemplate: templateField(REMINDER_VARIABLES),
  renewalTemplate: templateField(RENEWAL_VARIABLES),
});

/** Vacío o igual al texto por defecto => null (se usa el texto por defecto). */
function normalizeTemplate(value: string | undefined, fallback: string): string | null {
  const v = value?.trim();
  if (!v || v === fallback.trim()) return null;
  return v;
}

export async function updateTemplatesAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("ADMIN");
  const parsed = templatesSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  await db.organization.update({
    where: { id: user.organizationId },
    data: {
      reminderTemplate: normalizeTemplate(parsed.data.reminderTemplate, DEFAULT_REMINDER_TEMPLATE),
      renewalTemplate: normalizeTemplate(parsed.data.renewalTemplate, DEFAULT_RENEWAL_TEMPLATE),
    },
  });

  revalidatePath("/app", "layout");
  return { ok: true, message: "Plantillas guardadas." };
}
