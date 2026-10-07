"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type SelectOption = { value: string; label: string; disabled?: boolean };

/**
 * Select de Radix listo para formularios: envía su valor con `name` (Radix renderiza un <select> oculto).
 * Recuerda: ningún item puede tener value="" — usa un sentinel como "none".
 */
export function SelectInput({
  id,
  name,
  options,
  defaultValue,
  value,
  onValueChange,
  placeholder = "Selecciona…",
  invalid,
  disabled,
  className,
}: {
  id?: string;
  name?: string;
  options: SelectOption[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Select name={name} defaultValue={defaultValue} value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger id={id} aria-invalid={invalid || undefined} className={cn("h-9 w-full bg-card", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper" className="max-h-72">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
