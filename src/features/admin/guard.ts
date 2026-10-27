import "server-only";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { requirePlatformAdmin, type PlatformAdminUser } from "@/lib/platform-auth";
import { can, type PlatformCapability } from "@/lib/platform-auth/permissions";
import type { ActionState } from "@/lib/action-state";

// Utilidades comunes de las server actions de /admin.

export const DENIED: ActionState = { ok: false, message: "Tu rol no permite realizar esta acción." };

/** Exige sesión de admin (si no, redirige) y la capacidad pedida (si no, devuelve null). */
export async function authorize(capability: PlatformCapability): Promise<PlatformAdminUser | null> {
  const admin = await requirePlatformAdmin();
  return can(admin.role, capability) ? admin : null;
}

/** Error de negocio dentro de una transacción: la revierte y se muestra al usuario. */
export class ActionError extends Error {
  constructor(
    message: string,
    readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
  }
}

/** Ejecuta la acción y convierte un ActionError en ActionState. */
export async function runAction(fn: () => Promise<ActionState>): Promise<ActionState> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ActionError) return { ok: false, message: e.message, fieldErrors: e.fieldErrors };
    throw e;
  }
}

/** ¿Violación de unicidad? Si se indica `field`, solo cuando el índice incluye esa columna. */
export function isUniqueViolation(e: unknown, field?: string): boolean {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== "P2002") return false;
  if (!field) return true;
  const target = e.meta?.target;
  return Array.isArray(target) ? target.includes(field) : String(target ?? "").includes(field);
}

/** Pantallas de /admin que muestran datos de cuentas (todas son dinámicas). */
export function revalidateAccounts(orgId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/cuentas");
  revalidatePath("/admin/facturacion");
  revalidatePath("/admin/actividad");
  if (orgId) revalidatePath(`/admin/cuentas/${orgId}`);
}
