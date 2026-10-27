import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * El ingreso es único (/login): un correo identifica a una sola persona, sea personal de un
 * consultorio (User) o del equipo de Neuvi (PlatformAdmin). Antes de crear o cambiar un correo
 * hay que revisar ambas tablas.
 */
export async function emailInUse(email: string, client: Prisma.TransactionClient = db): Promise<boolean> {
  const [user, admin] = await Promise.all([
    client.user.findUnique({ where: { email }, select: { id: true } }),
    client.platformAdmin.findUnique({ where: { email }, select: { id: true } }),
  ]);
  return Boolean(user || admin);
}
