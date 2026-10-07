"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FormMessage, SubmitButton, useServerForm } from "@/components/common/form";
import { createRoom, updateRoom } from "../actions";

type RoomValues = { id: string; name: string; description: string | null };

export function RoomFormDialog({ room, trigger }: { room?: RoomValues; trigger?: "button" | "icon" }) {
  const [open, setOpen] = useState(false);
  const editing = !!room;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger === "icon" ? (
          <Button variant="ghost" size="icon-sm" aria-label={`Editar ${room?.name ?? "consultorio"}`}>
            <Pencil />
          </Button>
        ) : (
          <Button>
            <Plus /> Nuevo consultorio
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-brand-navy-deep">
            {editing ? "Editar consultorio" : "Nuevo consultorio"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Los cambios se reflejan en las citas ya agendadas."
              : "Podrás asignarlo al agendar y Neuvi evitará que dos citas lo usen a la vez."}
          </DialogDescription>
        </DialogHeader>
        {open ? <RoomForm room={room} onDone={() => setOpen(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function RoomForm({ room, onDone }: { room?: RoomValues; onDone: () => void }) {
  const action = room ? updateRoom.bind(null, room.id) : createRoom;
  const { state, pending, onSubmit } = useServerForm(action, {
    onSuccess: (s) => {
      toast.success(s.message ?? "Consultorio guardado.");
      onDone();
    },
  });
  const e = state.fieldErrors ?? {};

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <FormMessage message={state.ok ? undefined : state.message} />
      <Field label="Nombre" htmlFor="room-name" error={e.name} required>
        <Input
          id="room-name"
          name="name"
          defaultValue={room?.name ?? ""}
          placeholder="Consultorio 1, Sala de terapia familiar…"
          maxLength={60}
          className="h-10"
          autoFocus
        />
      </Field>
      <Field
        label="Descripción"
        htmlFor="room-description"
        error={e.description}
        hint="Opcional: piso, equipamiento o uso preferente."
      >
        <Textarea
          id="room-description"
          name="description"
          defaultValue={room?.description ?? ""}
          maxLength={200}
          rows={3}
          placeholder="2.º piso · ideal para terapia de pareja"
        />
      </Field>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </DialogClose>
        <SubmitButton pending={pending} pendingText="Guardando…">
          {room ? "Guardar cambios" : "Crear consultorio"}
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}
