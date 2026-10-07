"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { packageScope } from "@/lib/permissions";
import type { ActionState } from "@/lib/action-state";

/** Registra que se envió (abrió) el aviso de renovación por WhatsApp para un paquete. */
export async function markRenewalNotifiedAction(packageId: string): Promise<ActionState> {
  const user = await requireUser();
  if (typeof packageId !== "string" || !packageId) return { ok: false, message: "Paquete inválido." };

  const pkg = await db.package.findFirst({
    where: { AND: [{ id: packageId }, packageScope(user)] },
    select: { id: true, patientId: true },
  });
  if (!pkg) return { ok: false, message: "El paquete no existe o no tienes acceso a él." };

  await db.package.update({ where: { id: pkg.id }, data: { renewalNotifiedAt: new Date() } });

  revalidatePath("/app/renovaciones");
  revalidatePath(`/app/pacientes/${pkg.patientId}`);
  revalidatePath("/app");
  return { ok: true, message: "Aviso registrado." };
}
