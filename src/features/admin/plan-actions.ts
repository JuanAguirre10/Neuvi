"use server";

import { revalidatePath } from "next/cache";
import type { Plan } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { type ActionState, formToObject, fromZodError } from "@/lib/action-state";
import { parseAmountToCents } from "@/lib/format";
import { ActionError, DENIED, authorize, runAction } from "./guard";

// Catálogo de planes (solo SUPERADMIN). Un precio de lista vacío = "Por definir": cada cuenta
// se cobra con su precio pactado.

const MAX_CENTS = 100_000_000;

const planSchema = z.object({
  name: z
    .string({ error: "Ingresa el nombre del plan." })
    .min(3, { error: "Ingresa el nombre del plan." })
    .max(80, { error: "Máximo 80 caracteres." }),
  description: z.string().max(300, { error: "Máximo 300 caracteres." }).optional(),
  listPrice: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (v === undefined) return null;
      const cents = parseAmountToCents(v);
      if (cents === null || cents > MAX_CENTS) {
        ctx.addIssue({ code: "custom", message: "Ingresa un monto válido (ej. 60 o 59.90)." });
        return z.NEVER;
      }
      return cents;
    }),
  perProfessional: z
    .string()
    .optional()
    .transform((v) => v === "on"),
  maxProfessionals: z.preprocess(
    (v) => (v === undefined ? null : Number(v)),
    z
      .number({ error: "Debe ser un número." })
      .int({ error: "Debe ser un número entero." })
      .min(1, { error: "Mínimo 1." })
      .max(500, { error: "Máximo 500." })
      .nullable(),
  ),
  active: z
    .string()
    .optional()
    .transform((v) => v === "on"),
});

export async function updatePlanAction(code: Plan, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await authorize("plans");
  if (!admin) return DENIED;
  if (code !== "INDIVIDUAL" && code !== "CENTRO") return { ok: false, message: "No encontramos el plan." };
  const parsed = planSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const data = parsed.data;

  return runAction(async () => {
    await db.$transaction(async (tx) => {
      const plan = await tx.subscriptionPlan.findUnique({ where: { code }, select: { code: true } });
      if (!plan) throw new ActionError("No encontramos el plan.");
      await tx.subscriptionPlan.update({
        where: { code },
        data: {
          name: data.name,
          description: data.description ?? null,
          listPriceCents: data.listPrice,
          perProfessional: data.perProfessional,
          maxProfessionals: data.maxProfessionals,
          active: data.active,
        },
      });
    });
    revalidatePath("/admin/planes");
    revalidatePath("/admin/cuentas");
    revalidatePath("/admin");
    return { ok: true, message: "Plan actualizado." };
  });
}
