"use client";

import { useState, useTransition } from "react";
import type { PlatformRole } from "@prisma/client";
import { Check, Copy, KeyRound, MoreHorizontal, ShieldCheck, UserCheck, UserPlus, UserX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Field, FormMessage, SubmitButton, useServerForm } from "@/components/common/form";
import { SelectInput } from "@/features/pacientes/components/select-input";
import { PLATFORM_ROLE_LABEL, toOptions } from "@/lib/format";
import {
  type AdminMemberActionState,
  createPlatformAdminAction,
  resetPlatformAdminPasswordAction,
  setPlatformAdminActiveAction,
  updatePlatformAdminRoleAction,
} from "../team-actions";
import { PLATFORM_ROLE_DESCRIPTION } from "../format";

type Credentials = { name: string; email: string; password: string };

/** Muestra UNA vez las credenciales de un miembro del equipo. */
function CredentialsNotice({ email, password }: Credentials) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="grid gap-3">
      <div className="rounded-xl border border-brand-sky/50 bg-info-soft p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-brand-navy-deep">
          <KeyRound className="size-4 text-primary" /> Acceso al panel
        </p>
        <dl className="mt-3 grid gap-2 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-x-3">
            <dt className="text-muted-foreground">Correo</dt>
            <dd className="font-medium break-all text-brand-navy-deep">{email}</dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-3">
            <dt className="text-muted-foreground">Contraseña temporal</dt>
            <dd className="flex items-center gap-1">
              <code className="rounded-md bg-white px-2 py-1 font-mono text-sm font-semibold tracking-wide text-brand-navy-deep ring-1 ring-border select-all">
                {password}
              </code>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Copiar contraseña"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(password);
                    setCopied(true);
                    toast.success("Contraseña copiada.");
                  } catch {
                    toast.error("No se pudo copiar. Selecciónala y cópiala manualmente.");
                  }
                }}
              >
                {copied ? <Check className="text-success" /> : <Copy />}
              </Button>
            </dd>
          </div>
        </dl>
      </div>
      <p className="text-xs text-muted-foreground">
        Esta contraseña no se volverá a mostrar. Compártela por un canal privado; el ingreso es en{" "}
        <span className="font-medium text-brand-navy">/login</span>.
      </p>
    </div>
  );
}

function RoleField({ id, error, defaultValue }: { id: string; error?: string[]; defaultValue: PlatformRole }) {
  const [role, setRole] = useState<PlatformRole>(defaultValue);
  return (
    <Field label="Rol" htmlFor={id} error={error} hint={PLATFORM_ROLE_DESCRIPTION[role]} required>
      <SelectInput id={id} name="role" value={role} onValueChange={(v) => setRole(v as PlatformRole)} options={toOptions(PLATFORM_ROLE_LABEL)} />
    </Field>
  );
}

export function AddPlatformAdminDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus /> Agregar miembro
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
        <AddPlatformAdminForm onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function AddPlatformAdminForm({ onDone }: { onDone: () => void }) {
  const { state, pending, onSubmit } = useServerForm(createPlatformAdminAction);
  const result = state as AdminMemberActionState;
  const e = state.fieldErrors ?? {};

  if (result.ok && result.tempPassword) {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="text-brand-navy-deep">Miembro agregado</DialogTitle>
          <DialogDescription>{result.message}</DialogDescription>
        </DialogHeader>
        <CredentialsNotice name={result.memberName ?? ""} email={result.memberEmail ?? ""} password={result.tempPassword} />
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
        <DialogTitle className="text-brand-navy-deep">Agregar al equipo de Neuvi</DialogTitle>
        <DialogDescription>Acceso al panel interno. No da acceso a ningún consultorio.</DialogDescription>
      </DialogHeader>
      <FormMessage message={state.ok ? undefined : state.message} />
      <Field label="Nombre completo" htmlFor="pa-name" error={e.name} required>
        <Input id="pa-name" name="name" autoComplete="off" className="h-9" />
      </Field>
      <Field label="Correo" htmlFor="pa-email" error={e.email} required>
        <Input id="pa-email" name="email" type="email" autoComplete="off" placeholder="nombre@neuvi.pe" className="h-9" />
      </Field>
      <RoleField id="pa-role" error={e.role} defaultValue="SOPORTE" />
      <Field
        label="Contraseña temporal"
        htmlFor="pa-password"
        error={e.password}
        hint="Déjala vacía y se generará una segura. Se mostrará una sola vez."
      >
        <Input id="pa-password" name="password" type="text" autoComplete="new-password" placeholder="Generar automáticamente" className="h-9" />
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <SubmitButton pending={pending} pendingText="Creando…">
          Crear acceso
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}

function RoleDialog({
  member,
  open,
  onOpenChange,
}: {
  member: { id: string; name: string; role: PlatformRole };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <RoleForm member={member} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function RoleForm({ member, onDone }: { member: { id: string; name: string; role: PlatformRole }; onDone: () => void }) {
  const { state, pending, onSubmit } = useServerForm(updatePlatformAdminRoleAction.bind(null, member.id), {
    onSuccess: (s) => {
      toast.success(s.message ?? "Rol actualizado.");
      onDone();
    },
  });
  return (
    <form method="post" onSubmit={onSubmit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle className="text-brand-navy-deep">Cambiar rol de {member.name}</DialogTitle>
        <DialogDescription>El cambio aplica desde su siguiente acción en el panel.</DialogDescription>
      </DialogHeader>
      <FormMessage message={state.ok ? undefined : state.message} />
      <RoleField id={`role-${member.id}`} error={state.fieldErrors?.role} defaultValue={member.role} />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <SubmitButton pending={pending} pendingText="Guardando…">
          Guardar rol
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}

type Confirm = "deactivate" | "reset" | null;

/** Acciones de cada miembro. Para uno mismo no hay acciones (ni rol ni desactivación). */
export function PlatformAdminRowActions({
  member,
}: {
  member: { id: string; name: string; email: string; role: PlatformRole; active: boolean };
}) {
  const [roleOpen, setRoleOpen] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [pending, startTransition] = useTransition();

  const toggleActive = (active: boolean) =>
    startTransition(async () => {
      const res = await setPlatformAdminActiveAction(member.id, active);
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
      setConfirm(null);
    });

  const resetPassword = () =>
    startTransition(async () => {
      const res = await resetPlatformAdminPasswordAction(member.id);
      setConfirm(null);
      if (res.ok && res.tempPassword) {
        setCredentials({ name: res.memberName ?? member.name, email: res.memberEmail ?? member.email, password: res.tempPassword });
      } else {
        toast.error(res.message ?? "No se pudo restablecer la contraseña.");
      }
    });

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Acciones para ${member.name}`} disabled={pending}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onSelect={() => setRoleOpen(true)}>
            <ShieldCheck /> Cambiar rol
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setConfirm("reset")}>
            <KeyRound /> Restablecer contraseña
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {member.active ? (
            <DropdownMenuItem variant="destructive" onSelect={() => setConfirm("deactivate")}>
              <UserX /> Desactivar acceso
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => toggleActive(true)}>
              <UserCheck /> Reactivar acceso
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <RoleDialog member={member} open={roleOpen} onOpenChange={setRoleOpen} />

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "reset" ? "¿Restablecer la contraseña?" : `¿Desactivar el acceso de ${member.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "reset"
                ? "Se generará una contraseña temporal nueva y la actual dejará de funcionar."
                : "No podrá ingresar al panel. Su historial de acciones se conserva."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <Button
              variant={confirm === "reset" ? "default" : "destructive"}
              disabled={pending}
              onClick={() => (confirm === "reset" ? resetPassword() : toggleActive(false))}
            >
              {confirm === "reset" ? "Generar contraseña" : "Desactivar"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={credentials !== null} onOpenChange={(o) => !o && setCredentials(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-brand-navy-deep">Nueva contraseña temporal</DialogTitle>
            <DialogDescription>Compártela con {credentials?.name}.</DialogDescription>
          </DialogHeader>
          {credentials ? <CredentialsNotice {...credentials} /> : null}
          <DialogFooter>
            <Button type="button" onClick={() => setCredentials(null)}>
              Listo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
