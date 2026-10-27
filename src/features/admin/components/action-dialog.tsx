"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormMessage, SubmitButton, useServerForm } from "@/components/common/form";
import type { ActionState } from "@/lib/action-state";
import { cn } from "@/lib/utils";

type FieldErrors = NonNullable<ActionState["fieldErrors"]>;

/**
 * Diálogo con un formulario conectado a una server action (patrón useServerForm + method="post").
 * El formulario se monta al abrir, así cada apertura empieza limpia. Al guardar: toast y cierre;
 * la action ya revalida la pantalla.
 */
export function ActionDialog({
  trigger,
  title,
  description,
  action,
  submitLabel,
  pendingText = "Guardando…",
  destructive = false,
  className,
  children,
}: {
  trigger: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
  pendingText?: string;
  destructive?: boolean;
  className?: string;
  /** Campos del formulario; recibe los errores por campo de la última respuesta. */
  children: (errors: FieldErrors) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className={cn("flex max-h-[92dvh] flex-col gap-0 p-0 sm:max-w-md", className)}>
        <DialogHeader className="border-b px-5 py-4 pr-12">
          <DialogTitle className="text-brand-navy-deep">{title}</DialogTitle>
          {description ? <DialogDescription className="text-xs">{description}</DialogDescription> : null}
        </DialogHeader>
        <ActionDialogForm
          action={action}
          submitLabel={submitLabel}
          pendingText={pendingText}
          destructive={destructive}
          onCancel={() => setOpen(false)}
          onDone={(message) => {
            toast.success(message);
            setOpen(false);
          }}
        >
          {children}
        </ActionDialogForm>
      </DialogContent>
    </Dialog>
  );
}

function ActionDialogForm({
  action,
  submitLabel,
  pendingText,
  destructive,
  onCancel,
  onDone,
  children,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
  pendingText: string;
  destructive: boolean;
  onCancel: () => void;
  onDone: (message: string) => void;
  children: (errors: FieldErrors) => React.ReactNode;
}) {
  const { state, pending, onSubmit } = useServerForm(action, {
    onSuccess: (s) => onDone(s.message ?? "Cambios guardados."),
  });
  return (
    <form method="post" onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="grid gap-4 overflow-y-auto px-5 py-4">
        <FormMessage message={state.ok ? undefined : state.message} />
        {children(state.fieldErrors ?? {})}
      </div>
      <div className="flex flex-col-reverse gap-2 border-t bg-muted/40 px-5 py-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" className="h-9" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
        <SubmitButton
          pending={pending}
          pendingText={pendingText}
          variant={destructive ? "destructive" : "default"}
          className="h-9"
        >
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}
