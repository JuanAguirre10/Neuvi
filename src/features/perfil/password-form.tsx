"use client";

import { useRef } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, FormMessage, SubmitButton, useServerForm } from "@/components/common/form";
import { changePasswordAction } from "./actions";

export function PasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const { state, pending, onSubmit } = useServerForm(changePasswordAction, {
    onSuccess: (s) => {
      toast.success(s.message ?? "Contraseña actualizada.");
      formRef.current?.reset();
    },
  });
  const e = state.fieldErrors ?? {};

  return (
    <form ref={formRef} method="post" onSubmit={onSubmit} noValidate>
      <Card>
        <CardHeader>
          <CardTitle className="font-semibold text-brand-navy-deep">Cambiar contraseña</CardTitle>
          <CardDescription>
            Si te dieron una contraseña temporal, cámbiala por una que solo tú conozcas.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <FormMessage message={state.ok ? undefined : state.message} />
          <Field label="Contraseña actual" htmlFor="currentPassword" error={e.currentPassword} required>
            <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nueva contraseña" htmlFor="newPassword" error={e.newPassword} hint="Mínimo 8 caracteres." required>
              <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" />
            </Field>
            <Field label="Repite la nueva contraseña" htmlFor="confirmPassword" error={e.confirmPassword} required>
              <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" />
            </Field>
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <SubmitButton pending={pending} pendingText="Actualizando…">
            Actualizar contraseña
          </SubmitButton>
        </CardFooter>
      </Card>
    </form>
  );
}
