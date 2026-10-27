import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { PlatformRole } from "@prisma/client";
import { db } from "@/lib/db";
import { ADMIN_SESSION_COOKIE, adminCookieOptions, decryptAdminSession, encryptAdminSession } from "./session";

export async function createAdminSession(adminId: string) {
  const token = await encryptAdminSession({ adminId });
  const store = await cookies();
  store.set(ADMIN_SESSION_COOKIE, token, adminCookieOptions);
}

export async function destroyAdminSession() {
  const store = await cookies();
  store.delete({ name: ADMIN_SESSION_COOKIE, path: adminCookieOptions.path });
}

/**
 * Miembro del equipo de Neuvi autenticado, o null.
 * Se consulta a la BD en cada request (cacheado por request) para que una desactivación
 * o un cambio de rol apliquen de inmediato.
 */
export const getCurrentPlatformAdmin = cache(async () => {
  const store = await cookies();
  const session = await decryptAdminSession(store.get(ADMIN_SESSION_COOKIE)?.value);
  if (!session) return null;

  const admin = await db.platformAdmin.findUnique({
    where: { id: session.adminId },
    select: { id: true, name: true, email: true, role: true, active: true },
  });
  if (!admin || !admin.active) return null;
  return admin;
});

export type PlatformAdminUser = NonNullable<Awaited<ReturnType<typeof getCurrentPlatformAdmin>>>;

/**
 * Para páginas y server actions de /admin. Sin sesión va al ingreso único (/login); con una cookie que ya no
 * corresponde a un admin activo pasa por /admin/salir para borrarla (evita el bucle con el proxy).
 * Si se indican roles y el admin no tiene ninguno, vuelve al inicio del panel.
 */
export async function requirePlatformAdmin(...roles: PlatformRole[]): Promise<PlatformAdminUser> {
  const admin = await getCurrentPlatformAdmin();
  if (!admin) {
    const store = await cookies();
    redirect(store.has(ADMIN_SESSION_COOKIE) ? "/admin/salir" : "/login?next=%2Fadmin");
  }
  if (roles.length > 0 && !roles.includes(admin.role)) redirect("/admin?denegado=1");
  return admin;
}
