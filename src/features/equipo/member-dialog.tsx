"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Field, FormMessage, SubmitButton, useServerForm } from "@/components/common/form";
import { ROLE_LABEL } from "@/lib/format";
import { CalendarColorPicker } from "./color-picker";
import { CredentialsNotice } from "./credentials-notice";
import { DEFAULT_CALENDAR_COLOR, ROLE_DESCRIPTION } from "./constants";
import { type MemberActionState, createMemberAction, updateMemberAction } from "./actions";

export type MemberFormValues = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isProfessional: boolean;
  specialty: string | null;
  licenseNumber: string | null;
  phone: string | null;
  calendarColor: string;
};

const ROLES: Role[] = ["ADMIN", "PSICOLOGO", "RECEPCION"];

/** Diálogo "Agregar miembro" (con botón propio). */
export function AddMemberDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus /> Agregar miembro
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <MemberForm onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

/** Diálogo "Editar miembro" controlado desde las acciones de la fila. */
export function EditMemberDialog({
  member,
  isSelf,
  open,
  onOpenChange,
}: {
  member: MemberFormValues;
  isSelf: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <MemberForm member={member} isSelf={isSelf} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function MemberForm({
  member,
  isSelf = false,
  onDone,
}: {
  member?: MemberFormValues;
  isSelf?: boolean;
  onDone: () => void;
}) {
  const editing = Boolean(member);
  const action = member ? updateMemberAction.bind(null, member.id) : createMemberAction;
  const { state, pending, onSubmit } = useServerForm(action, {
    onSuccess: (s) => {
      if (editing) {
        toast.success(s.message ?? "Cambios guardados.");
        onDone();
      }
    },
  });
  const result = state as MemberActionState;

  const [role, setRole] = useState<Role>(member?.role ?? "PSICOLOGO");
  const [adminAttends, setAdminAttends] = useState(member?.role === "ADMIN" ? member.isProfessional : false);
  const attends = role === "PSICOLOGO" ? true : role === "RECEPCION" ? false : adminAttends;
  const e = state.fieldErrors ?? {};
  const idp = member ? `m-${member.id}` : "m-new";

  // Alta exitosa: se muestran las credenciales una sola vez.
  if (!editing && result.ok && result.tempPassword) {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="text-brand-navy-deep">Miembro agregado</DialogTitle>
          <DialogDescription>{result.message}</DialogDescription>
        </DialogHeader>
        <CredentialsNotice
          name={result.memberName ?? ""}
          email={result.memberEmail ?? ""}
          password={result.tempPassword}
        />
        <DialogFooter>
          <Button type="button" onClick={onDone}>
            Listo
          </Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle className="text-brand-navy-deep">{editing ? "Editar miembro" : "Agregar miembro del equipo"}</DialogTitle>
        <DialogDescription>
          {editing
            ? "Actualiza los datos, el rol y los permisos de este usuario."
            : "Crea el acceso de un psicólogo, recepcionista u otro administrador de tu centro."}
        </DialogDescription>
      </DialogHeader>

      <FormMessage message={state.ok ? undefined : state.message} />

      <Field label="Nombre completo" htmlFor={`${idp}-name`} error={e.name} required>
        <Input id={`${idp}-name`} name="name" defaultValue={member?.name} autoComplete="off" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Correo electrónico" htmlFor={`${idp}-email`} error={e.email} required>
          <Input id={`${idp}-email`} name="email" type="email" defaultValue={member?.email} autoComplete="off" />
        </Field>
        <Field label="Celular" htmlFor={`${idp}-phone`} error={e.phone}>
          <Input
            id={`${idp}-phone`}
            name="phone"
            type="tel"
            inputMode="tel"
            placeholder="987 654 321"
            defaultValue={member?.phone ?? ""}
          />
        </Field>
      </div>

      <Field
        label="Rol"
        htmlFor={`${idp}-role`}
        error={e.role}
        hint={isSelf ? "No puedes cambiar tu propio rol." : ROLE_DESCRIPTION[role]}
        required
      >
        {isSelf ? (
          <>
            <input type="hidden" name="role" value="ADMIN" />
            <Input id={`${idp}-role`} value={ROLE_LABEL.ADMIN} disabled readOnly />
          </>
        ) : (
          <Select name="role" value={role} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger id={`${idp}-role`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABEL[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </Field>

      <label
        htmlFor={`${idp}-attends`}
        className="flex items-start justify-between gap-4 rounded-lg border bg-muted/40 px-3 py-2.5"
      >
        <span className="grid gap-0.5">
          <span className="text-sm font-medium text-brand-navy">Atiende pacientes</span>
          <span className="text-xs text-muted-foreground">
            {role === "PSICOLOGO"
              ? "Los psicólogos siempre tienen agenda y pacientes propios."
              : role === "RECEPCION"
                ? "Recepción no atiende pacientes ni ve historia clínica."
                : "Actívalo si este administrador también tiene agenda y pacientes."}
          </span>
        </span>
        <Switch
          id={`${idp}-attends`}
          name="attends"
          checked={attends}
          onCheckedChange={setAdminAttends}
          disabled={role !== "ADMIN"}
        />
      </label>

      {attends ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Especialidad" htmlFor={`${idp}-specialty`} error={e.specialty}>
              <Input
                id={`${idp}-specialty`}
                name="specialty"
                placeholder="Psicología clínica"
                defaultValue={member?.specialty ?? ""}
              />
            </Field>
            <Field label="N.º de colegiatura (C.Ps.P.)" htmlFor={`${idp}-license`} error={e.licenseNumber}>
              <Input
                id={`${idp}-license`}
                name="licenseNumber"
                inputMode="numeric"
                placeholder="12345"
                defaultValue={member?.licenseNumber ?? ""}
              />
            </Field>
          </div>
          <Field label="Color en la agenda" error={e.calendarColor}>
            <CalendarColorPicker idPrefix={idp} defaultValue={member?.calendarColor} />
          </Field>
        </>
      ) : (
        <input type="hidden" name="calendarColor" value={member?.calendarColor ?? DEFAULT_CALENDAR_COLOR} />
      )}

      {!editing ? (
        <Field
          label="Contraseña temporal"
          htmlFor={`${idp}-password`}
          error={e.password}
          hint="Déjala vacía y Neuvi generará una segura. Se mostrará una sola vez."
        >
          <Input id={`${idp}-password`} name="password" type="text" autoComplete="new-password" placeholder="Generar automáticamente" />
        </Field>
      ) : null}

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </DialogClose>
        <SubmitButton pending={pending} pendingText="Guardando…">
          {editing ? "Guardar cambios" : "Crear acceso"}
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}
