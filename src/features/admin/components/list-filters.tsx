"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectInput } from "@/features/pacientes/components/select-input";
import { cn } from "@/lib/utils";
import { listHref } from "../filters";

const ALL = "todos";

export type SelectFilter = {
  name: string;
  label: string;
  /** Texto de la opción "todos" (si no se indica, el filtro siempre tiene un valor). */
  allLabel?: string;
  options: { value: string; label: string }[];
  className?: string;
};

/**
 * Barra de filtros de un listado. Todo vive en la URL (se puede compartir o recargar):
 * cada cambio reemplaza los parámetros y vuelve a la página 1.
 */
export function ListFilters({
  basePath,
  current,
  search,
  selects,
  defaults = {},
}: {
  basePath: string;
  current: Record<string, string | undefined>;
  search?: { placeholder: string; label: string };
  selects: SelectFilter[];
  /** Valores que no se escriben en la URL (p. ej. el orden por defecto). */
  defaults?: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState(current.q ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function navigate(next: Record<string, string | undefined>) {
    const merged: Record<string, string | undefined> = { ...current, ...next, page: undefined };
    for (const [k, v] of Object.entries(merged)) {
      if (v === ALL || (v !== undefined && defaults[k] === v)) merged[k] = undefined;
    }
    startTransition(() => router.replace(listHref(basePath, merged), { scroll: false }));
  }

  function onTextChange(value: string) {
    setText(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => navigate({ q: value.trim() || undefined }), 350);
  }

  const hasFilters = Object.entries(current).some(([k, v]) => k !== "page" && v !== undefined && defaults[k] !== v) || text !== "";

  return (
    <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center">
      {search ? (
        <form
          role="search"
          className="relative flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            clearTimeout(timer.current);
            navigate({ q: text.trim() || undefined });
          }}
        >
          <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          </span>
          <Input
            type="search"
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder={search.placeholder}
            aria-label={search.label}
            className="h-9 bg-card pl-8"
          />
        </form>
      ) : null}
      <div className={cn("grid grid-cols-2 gap-2 sm:flex sm:flex-wrap", !search && "flex-1")}>
        {selects.map((f) => (
          <div key={f.name} className={cn("min-w-0", f.className ?? "sm:w-44")}>
            <label htmlFor={`filtro-${f.name}`} className="sr-only">
              {f.label}
            </label>
            <SelectInput
              id={`filtro-${f.name}`}
              value={current[f.name] ?? (f.allLabel ? ALL : defaults[f.name])}
              onValueChange={(v) => navigate({ [f.name]: v })}
              options={f.allLabel ? [{ value: ALL, label: f.allLabel }, ...f.options] : f.options}
            />
          </div>
        ))}
        {!search && pending ? <Loader2 className="size-4 animate-spin self-center text-muted-foreground" /> : null}
      </div>
      {hasFilters ? (
        <Button
          type="button"
          variant="ghost"
          className="h-9 text-muted-foreground"
          onClick={() => {
            clearTimeout(timer.current);
            setText("");
            startTransition(() => router.replace(basePath, { scroll: false }));
          }}
        >
          <X /> Limpiar
        </Button>
      ) : null}
    </div>
  );
}
