"use client";

import { useTransition } from "react";
import { CalendarClock, DoorOpen, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { Pill } from "@/components/common/status-badges";
import { cn } from "@/lib/utils";
import { deleteRoom, setRoomActive } from "../actions";
import type { RoomListItem } from "../queries";
import { RoomFormDialog } from "./room-form-dialog";

export function RoomsManager({ rooms }: { rooms: RoomListItem[] }) {
  if (rooms.length === 0) {
    return (
      <EmptyState
        icon={DoorOpen}
        title="Aún no registras consultorios"
        description="Agrega los ambientes donde atienden para que Neuvi bloquee cruces de consultorio al agendar."
        action={<RoomFormDialog />}
      />
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {rooms.map((room) => (
        <RoomCard key={room.id} room={room} />
      ))}
    </ul>
  );
}

function RoomCard({ room }: { room: RoomListItem }) {
  const [pending, startTransition] = useTransition();

  const toggle = (active: boolean) =>
    startTransition(async () => {
      const result = await setRoomActive(room.id, active);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message ?? "No se pudo actualizar el consultorio.");
    });

  const remove = () =>
    startTransition(async () => {
      const result = await deleteRoom(room.id);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message ?? "No se pudo eliminar el consultorio.");
    });

  return (
    <li
      className={cn(
        "flex flex-col rounded-xl border bg-card p-4 shadow-xs transition-opacity",
        !room.active && "bg-muted/40",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            room.active ? "bg-secondary text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          <DoorOpen className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold text-brand-navy-deep">{room.name}</h3>
            {room.active ? <Pill tone="teal">Activo</Pill> : <Pill tone="gray">Inactivo</Pill>}
          </div>
          <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
            {room.description || "Sin descripción"}
          </p>
        </div>
        <RoomFormDialog room={room} trigger="icon" />
      </div>

      <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarClock className="size-3.5" />
        {room.upcomingAppointments === 0
          ? "Sin citas próximas"
          : `${room.upcomingAppointments} cita(s) próxima(s)`}
      </p>

      <div className="mt-4 flex items-center justify-between gap-2 border-t pt-3">
        <label className="flex items-center gap-2 text-sm text-brand-navy">
          <Switch checked={room.active} onCheckedChange={toggle} disabled={pending} aria-label="Disponible para agendar" />
          Disponible para agendar
          {pending ? <Loader2 className="size-3.5 animate-spin text-muted-foreground" /> : null}
        </label>
        {room.totalAppointments === 0 ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={pending}
                aria-label={`Eliminar ${room.name}`}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar «{room.name}»?</AlertDialogTitle>
                <AlertDialogDescription>
                  Este consultorio no tiene citas registradas, así que se puede eliminar definitivamente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Volver</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={remove}>
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </div>
      {!room.active && room.upcomingAppointments > 0 ? (
        <p className="mt-2 text-xs text-warning">
          Las citas ya agendadas conservan este consultorio; no se podrá elegir en citas nuevas.
        </p>
      ) : null}
    </li>
  );
}
