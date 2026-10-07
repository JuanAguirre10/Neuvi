"use client";

import { startTransition, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { type ActionState, initialActionState } from "@/lib/action-state";
import { cn } from "@/lib/utils";

/**
 * Conecta un <form> a una Server Action SIN que React 19 resetee los campos al terminar
 * (con `<form action={...}>` React limpia el formulario aunque haya errores de validación).
 *
 *   const { state, pending, onSubmit } = useServerForm(createPatientAction);
 *   <form method="post" onSubmit={onSubmit}> ... <SubmitButton pending={pending}>Guardar</SubmitButton>
 *
 * Usa siempre method="post": si alguien envía antes de que cargue el JS, un <form> sin method
 * hace GET y deja los datos (contraseñas, DNI…) en la URL.
 *
 * Para acciones con argumentos extra usa bind: useServerForm(updatePatient.bind(null, id)).
 */
export function useServerForm(
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>,
  opts?: { onSuccess?: (state: ActionState) => void },
) {
  const [state, dispatch, pending] = useActionState(async (prev: ActionState, fd: FormData) => {
    const next = await action(prev, fd);
    if (next.ok) opts?.onSuccess?.(next);
    return next;
  }, initialActionState);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => dispatch(fd));
  };
  return { state, pending, onSubmit };
}

/**
 * Botón de envío con spinner. Pasa `pending` cuando uses useServerForm;
 * si no, usa useFormStatus (formularios con `action={...}`).
 */
export function SubmitButton({
  children,
  pendingText,
  className,
  pending: pendingProp,
  ...props
}: React.ComponentProps<typeof Button> & { pendingText?: string; pending?: boolean }) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  return (
    <Button type="submit" disabled={pending || props.disabled} className={className} {...props}>
      {pending ? <Loader2 className="animate-spin" /> : null}
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}

/** Envoltorio de campo: etiqueta + control + ayuda + error. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string[] | string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const message = Array.isArray(error) ? error[0] : error;
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-[0.8rem] font-medium text-brand-navy">
        {label}
        {required ? <span className="text-destructive">*</span> : null}
      </Label>
      {children}
      {message ? (
        <p className="text-xs text-destructive">{message}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/** Mensaje general de error del formulario. */
export function FormMessage({ message, ok }: { message?: string; ok?: boolean }) {
  if (!message) return null;
  return (
    <p
      role={ok ? "status" : "alert"}
      className={cn(
        "rounded-lg px-3 py-2 text-sm",
        ok ? "bg-success-soft text-success" : "bg-danger-soft text-destructive",
      )}
    >
      {message}
    </p>
  );
}
