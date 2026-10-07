"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PATIENT_STATUS_LABEL, toOptions } from "@/lib/format";
import { SelectInput } from "./select-input";

const ALL = "todos";

type Filters = { q?: string; estado?: string; profesional?: string };

export function PatientsFilters({
  q,
  estado,
  profesional,
  professionals,
}: Filters & {
  /** null oculta el filtro de profesional (rol PSICOLOGO). */
  professionals: { id: string; name: string }[] | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(q ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function navigate(next: Filters) {
    const merged: Filters = { q, estado, profesional, ...next };
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v && v !== ALL) sp.set(k, v);
    const qs = sp.toString();
    startTransition(() => router.replace(`/app/pacientes${qs ? `?${qs}` : ""}`, { scroll: false }));
  }

  function onSearchChange(value: string) {
    setSearch(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => navigate({ q: value.trim() || undefined }), 350);
  }

  const hasFilters = Boolean(q || estado || profesional || search);

  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
      <form
        role="search"
        className="relative flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          clearTimeout(timer.current);
          navigate({ q: search.trim() || undefined });
        }}
      >
        <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
        </span>
        <Input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por nombre, apellido, documento o celular"
          aria-label="Buscar pacientes"
          className="h-9 bg-card pl-8"
        />
      </form>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <SelectInput
          value={estado ?? ALL}
          onValueChange={(v) => navigate({ estado: v })}
          options={[{ value: ALL, label: "Todos los estados" }, ...toOptions(PATIENT_STATUS_LABEL)]}
          className="sm:w-44"
        />
        {professionals ? (
          <SelectInput
            value={profesional ?? ALL}
            onValueChange={(v) => navigate({ profesional: v })}
            options={[
              { value: ALL, label: "Todos los psicólogos" },
              { value: "sin", label: "Sin psicólogo asignado" },
              ...professionals.map((p) => ({ value: p.id, label: p.name })),
            ]}
            className="sm:w-52"
          />
        ) : null}
      </div>
      {hasFilters ? (
        <Button
          type="button"
          variant="ghost"
          className="h-9 text-muted-foreground"
          onClick={() => {
            clearTimeout(timer.current);
            setSearch("");
            startTransition(() => router.replace("/app/pacientes", { scroll: false }));
          }}
        >
          <X /> Limpiar
        </Button>
      ) : null}
    </div>
  );
}
