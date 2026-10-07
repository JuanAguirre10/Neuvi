"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { type ActionState, formToObject, fromZodError } from "@/lib/action-state";

const roomSchema = z.object({
  name: z
    .string({ error: "Ingresa el nombre del consultorio." })
    .min(2, { error: "Mínimo 2 caracteres." })
    .max(60, { error: "Máximo 60 caracteres." }),
  description: z.string().max(200, { error: "Máximo 200 caracteres." }).optional(),
});

const idSchema = z.string().min(1).max(64);

const NOT_FOUND: ActionState = { ok: false, message: "El consultorio no existe." };
const DUPLICATE: ActionState = {
  ok: false,
  message: "Ya existe un consultorio con ese nombre.",
  fieldErrors: { name: ["Ya existe un consultorio con ese nombre."] },
};

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function revalidateRooms() {
  revalidatePath("/app/configuracion/consultorios");
  revalidatePath("/app/agenda");
  revalidatePath("/app");
}

export async function createRoom(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("ADMIN");
  const parsed = roomSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    await db.room.create({
      data: {
        organizationId: user.organizationId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) return DUPLICATE;
    throw error;
  }

  revalidateRooms();
  return { ok: true, message: `Consultorio «${parsed.data.name}» creado.` };
}

export async function updateRoom(roomId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("ADMIN");
  if (!idSchema.safeParse(roomId).success) return NOT_FOUND;
  const parsed = roomSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const room = await db.room.findFirst({
    where: { id: roomId, organizationId: user.organizationId },
    select: { id: true },
  });
  if (!room) return NOT_FOUND;

  try {
    await db.room.update({
      where: { id: room.id },
      data: { name: parsed.data.name, description: parsed.data.description ?? null },
    });
  } catch (error) {
    if (isUniqueViolation(error)) return DUPLICATE;
    throw error;
  }

  revalidateRooms();
  return { ok: true, message: "Consultorio actualizado." };
}

export async function setRoomActive(roomId: string, active: boolean): Promise<ActionState> {
  const user = await requireRole("ADMIN");
  if (!idSchema.safeParse(roomId).success || typeof active !== "boolean") return NOT_FOUND;

  const room = await db.room.findFirst({
    where: { id: roomId, organizationId: user.organizationId },
    select: { id: true, name: true },
  });
  if (!room) return NOT_FOUND;

  await db.room.update({ where: { id: room.id }, data: { active } });
  revalidateRooms();
  return {
    ok: true,
    message: active ? `«${room.name}» está disponible para agendar.` : `«${room.name}» se desactivó.`,
  };
}

/** Solo si nunca se usó; con citas registradas se desactiva para conservar el historial. */
export async function deleteRoom(roomId: string): Promise<ActionState> {
  const user = await requireRole("ADMIN");
  if (!idSchema.safeParse(roomId).success) return NOT_FOUND;

  const room = await db.room.findFirst({
    where: { id: roomId, organizationId: user.organizationId },
    select: { id: true, name: true, _count: { select: { appointments: true } } },
  });
  if (!room) return NOT_FOUND;
  if (room._count.appointments > 0) {
    return {
      ok: false,
      message: "Este consultorio tiene citas registradas. Desactívalo para que no se use en nuevas citas.",
    };
  }

  await db.room.delete({ where: { id: room.id } });
  revalidateRooms();
  return { ok: true, message: `Consultorio «${room.name}» eliminado.` };
}
