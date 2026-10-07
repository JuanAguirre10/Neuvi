"use client";

import { Input } from "@/components/ui/input";
import { Field, FormMessage, SubmitButton, useServerForm } from "@/components/common/form";
import { loginAction } from "../actions";

export function LoginForm({ next }: { next?: string }) {
  const { state, pending, onSubmit } = useServerForm(loginAction);
  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <FormMessage message={state.message} ok={state.ok} />
      <Field label="Correo electrónico" htmlFor="email" error={state.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="tu@correo.com" className="h-10" />
      </Field>
      <Field label="Contraseña" htmlFor="password" error={state.fieldErrors?.password}>
        <Input id="password" name="password" type="password" autoComplete="current-password" className="h-10" />
      </Field>
      <SubmitButton pending={pending} className="mt-2 h-10 w-full" pendingText="Ingresando…">
        Iniciar sesión
      </SubmitButton>
    </form>
  );
}
