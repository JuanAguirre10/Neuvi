"use client";

import { useState, useTransition } from "react";
import { KeyRound, MoreHorizontal, Pencil, UserCheck, UserX } from "lucide-react";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CredentialsNotice } from "./credentials-notice";
import { EditMemberDialog, type MemberFormValues } from "./member-dialog";
import { resetMemberPasswordAction, setMemberActiveAction } from "./actions";

type Confirm = "reset" | "deactivate" | null;

export function MemberRowActions({
  member,
  active,
  isSelf,
}: {
  member: MemberFormValues;
  active: boolean;
  isSelf: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [credentials, setCredentials] = useState<{ name: string; email: string; password: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<void>) => startTransition(fn);

  const toggleActive = (next: boolean) =>
    run(async () => {
      const res = await setMemberActiveAction(member.id, next);
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
      setConfirm(null);
    });

  const resetPassword = () =>
    run(async () => {
      const res = await resetMemberPasswordAction(member.id);
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
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil /> Editar datos y rol
          </DropdownMenuItem>
          {!isSelf ? (
            <DropdownMenuItem onSelect={() => setConfirm("reset")}>
              <KeyRound /> Restablecer contraseña
            </DropdownMenuItem>
          ) : null}
          {!isSelf ? <DropdownMenuSeparator /> : null}
          {!isSelf && active ? (
            <DropdownMenuItem variant="destructive" onSelect={() => setConfirm("deactivate")}>
              <UserX /> Desactivar acceso
            </DropdownMenuItem>
          ) : null}
          {!isSelf && !active ? (
            <DropdownMenuItem onSelect={() => toggleActive(true)}>
              <UserCheck /> Reactivar acceso
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <EditMemberDialog member={member} isSelf={isSelf} open={editOpen} onOpenChange={setEditOpen} />

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "reset" ? "¿Restablecer la contraseña?" : `¿Desactivar el acceso de ${member.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "reset"
                ? "Se generará una nueva contraseña temporal y la actual dejará de funcionar."
                : "No podrá ingresar a Neuvi. Sus pacientes, citas y notas se conservan; si ya no atenderá, reasigna sus pacientes."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <Button
              variant={confirm === "reset" ? "default" : "destructive"}
              disabled={pending}
              onClick={() => (confirm === "reset" ? resetPassword() : toggleActive(false))}
            >
              {confirm === "reset" ? "Generar nueva contraseña" : "Desactivar"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={credentials !== null} onOpenChange={(o) => !o && setCredentials(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-brand-navy-deep">Nueva contraseña temporal</DialogTitle>
            <DialogDescription>Comparte estas credenciales con {credentials?.name}.</DialogDescription>
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
