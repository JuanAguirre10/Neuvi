import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { SESSION_COOKIE, decryptSession, encryptSession, sessionCookieOptions } from "./session";

/** Crea la cookie de sesión para un usuario (login / registro). */
export async function createSession(user: { id: string; organizationId: string; role: Role }) {
  const token = await encryptSession({
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role,
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions);
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/**
 * Usuario autenticado con su organización, o null.
 * Se consulta a la BD en cada request (cacheado por request con React.cache) para que
 * cambios de rol o desactivaciones apliquen de inmediato.
 */
export const getCurrentUser = cache(async () => {
  const store = await cookies();
  const session = await decryptSession(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isProfessional: true,
      specialty: true,
      calendarColor: true,
      active: true,
      organizationId: true,
      organization: {
        select: {
          id: true,
          name: true,
          type: true,
          plan: true,
          trialEndsAt: true,
          phone: true,
          renewalThreshold: true,
          defaultSessionMinutes: true,
          noShowConsumesSession: true,
          reminderTemplate: true,
          renewalTemplate: true,
        },
      },
    },
  });
  if (!user || !user.active) return null;
  return user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/**
 * Para páginas y server actions: redirige a /login si no hay sesión.
 * Si hay cookie pero el usuario ya no existe o fue desactivado, pasa por /salir para borrarla
 * (los Server Components no pueden modificar cookies y el proxy la seguiría tomando por válida).
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    const store = await cookies();
    redirect(store.has(SESSION_COOKIE) ? "/salir" : "/login");
  }
  return user;
}

/** Exige uno de los roles indicados; si no, redirige al panel. */
export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/app?denegado=1");
  return user;
}
