"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RecordFormValues } from "../fields";
import { ClinicalRecordForm } from "./clinical-record-form";

/** Ficha de ingreso: alterna entre la vista (renderizada en el servidor) y el formulario de edición. */
export function ClinicalRecordPanel({
  patientId,
  hasRecord,
  highRisk,
  heading,
  view,
  values,
}: {
  patientId: string;
  hasRecord: boolean;
  highRisk: boolean;
  /** Título, badge de riesgo y "actualizada el…" (servidor). */
  heading: React.ReactNode;
  view: React.ReactNode;
  values: RecordFormValues;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <section
      className={cn(
        "rounded-xl border bg-card shadow-xs",
        highRisk && !editing && "border-destructive/40 ring-1 ring-destructive/15",
      )}
    >
      <header className="flex flex-wrap items-center gap-3 border-b px-4 py-3 sm:px-5">
        <div className="min-w-0 flex-1">{heading}</div>
        {editing ? (
          <span className="text-xs font-medium text-primary">Editando ficha de ingreso</span>
        ) : (
          <Button size="sm" variant={hasRecord ? "outline" : "default"} onClick={() => setEditing(true)}>
            {hasRecord ? <Pencil /> : <Plus />}
            {hasRecord ? "Editar ficha" : "Completar ficha"}
          </Button>
        )}
      </header>
      {editing ? (
        <ClinicalRecordForm patientId={patientId} values={values} onDone={() => setEditing(false)} />
      ) : (
        view
      )}
    </section>
  );
}
