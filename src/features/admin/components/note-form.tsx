"use client";

import { useRef } from "react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormMessage, SubmitButton, useServerForm } from "@/components/common/form";
import { addAccountNoteAction } from "../actions";

export function NoteForm({ orgId }: { orgId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const { state, pending, onSubmit } = useServerForm(addAccountNoteAction.bind(null, orgId), {
    onSuccess: (s) => {
      toast.success(s.message ?? "Nota agregada.");
      formRef.current?.reset();
    },
  });
  return (
    <form ref={formRef} method="post" onSubmit={onSubmit} noValidate className="grid gap-3 rounded-xl border bg-card p-4 shadow-xs">
      <FormMessage message={state.ok ? undefined : state.message} />
      <Field
        label="Nueva nota interna"
        htmlFor="note-body"
        error={state.fieldErrors?.body}
        hint="Solo la ve el equipo de Neuvi. No registres datos de pacientes."
      >
        <Textarea id="note-body" name="body" rows={3} placeholder="Ej. llamó para consultar por el plan anual" />
      </Field>
      <div className="flex justify-end">
        <SubmitButton pending={pending} pendingText="Guardando…" className="h-9">
          Agregar nota
        </SubmitButton>
      </div>
    </form>
  );
}
