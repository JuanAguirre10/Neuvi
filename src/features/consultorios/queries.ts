import "server-only";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth";

export type RoomListItem = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  totalAppointments: number;
  upcomingAppointments: number;
};

/** Consultorios de la organización con el uso que tienen en la agenda. */
export async function loadRooms(user: CurrentUser): Promise<RoomListItem[]> {
  const [rooms, upcoming] = await Promise.all([
    db.room.findMany({
      where: { organizationId: user.organizationId },
      orderBy: [{ active: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        active: true,
        _count: { select: { appointments: true } },
      },
    }),
    db.appointment.groupBy({
      by: ["roomId"],
      where: {
        organizationId: user.organizationId,
        roomId: { not: null },
        status: { in: ["PROGRAMADA", "CONFIRMADA"] },
        startsAt: { gte: new Date() },
      },
      _count: { _all: true },
    }),
  ]);

  const upcomingByRoom = new Map(upcoming.map((u) => [u.roomId, u._count._all]));
  return rooms.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    active: r.active,
    totalAppointments: r._count.appointments,
    upcomingAppointments: upcomingByRoom.get(r.id) ?? 0,
  }));
}
