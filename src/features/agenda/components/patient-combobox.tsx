"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronsUpDown, UserRoundPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Pill } from "@/components/common/status-badges";
import { cn } from "@/lib/utils";
import { normalizeText } from "../lib";
import type { AgendaPatientOption } from "../types";

/** Cada palabra buscada debe aparecer (sin importar tildes ni mayúsculas). */
function filterPatients(value: string, search: string): number {
  const haystack = normalizeText(value);
  const tokens = normalizeText(search).split(/\s+/).filter(Boolean);
  return tokens.every((t) => haystack.includes(t)) ? 1 : 0;
}

export function PatientCombobox({
  id,
  patients,
  value,
  onChange,
  invalid,
}: {
  id?: string;
  patients: AgendaPatientOption[];
  value: string;
  onChange: (patientId: string) => void;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = patients.find((p) => p.id === value);

  return (
    // modal: permite hacer scroll en la lista aunque esté dentro de un Dialog.
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid || undefined}
          className="h-10 w-full justify-between px-3 font-normal"
        >
          {selected ? (
            <span className="truncate text-foreground">{selected.name}</span>
          ) : (
            <span className="text-muted-foreground">Buscar por nombre o DNI…</span>
          )}
          <ChevronsUpDown className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-72 p-0" align="start">
        <Command filter={filterPatients}>
          <CommandInput placeholder="Nombre, apellido o documento…" />
          <CommandList>
            <CommandEmpty>
              <div className="grid justify-items-center gap-3 px-3">
                <p className="text-muted-foreground">
                  {patients.length === 0 ? "Aún no hay pacientes registrados." : "No se encontraron pacientes."}
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link href="/app/pacientes/nuevo">
                    <UserRoundPlus /> Registrar paciente
                  </Link>
                </Button>
              </div>
            </CommandEmpty>
            <CommandGroup>
              {patients.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`${p.name} ${p.documentNumber ?? ""} ${p.id}`}
                  data-checked={p.id === value}
                  onSelect={() => {
                    onChange(p.id);
                    setOpen(false);
                  }}
                  className="py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate font-medium", p.id === value && "text-primary")}>{p.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.documentNumber ? `Doc. ${p.documentNumber}` : "Sin documento"}
                      {p.freePackage ? ` · ${p.freePackage.free} sesión(es) libre(s)` : ""}
                    </p>
                  </div>
                  {p.status === "EN_PAUSA" ? <Pill tone="amber">En pausa</Pill> : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
