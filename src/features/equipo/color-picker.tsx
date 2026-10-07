"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { CALENDAR_COLORS, DEFAULT_CALENDAR_COLOR } from "./constants";

/** Selector de color de agenda (radios nativos => funciona con FormData). */
export function CalendarColorPicker({
  name = "calendarColor",
  defaultValue,
  idPrefix = "color",
}: {
  name?: string;
  defaultValue?: string | null;
  idPrefix?: string;
}) {
  const initial = (defaultValue ?? DEFAULT_CALENDAR_COLOR).toUpperCase();
  const known = CALENDAR_COLORS.some((c) => c.value === initial);
  const options: { value: string; label: string }[] = known
    ? [...CALENDAR_COLORS]
    : [...CALENDAR_COLORS, { value: initial, label: "Color actual" }];

  return (
    <div role="radiogroup" aria-label="Color en la agenda" className="flex flex-wrap gap-2">
      {options.map((c) => (
        <label
          key={c.value}
          htmlFor={`${idPrefix}-${c.value}`}
          title={c.label}
          className="relative flex size-8 cursor-pointer items-center justify-center rounded-full ring-offset-2 ring-offset-background has-checked:ring-2 has-checked:ring-brand-navy-deep has-focus-visible:ring-2 has-focus-visible:ring-ring"
          style={{ backgroundColor: c.value }}
        >
          <input
            id={`${idPrefix}-${c.value}`}
            type="radio"
            name={name}
            value={c.value}
            defaultChecked={c.value === initial}
            className="peer sr-only"
          />
          <Check className={cn("size-4 text-white opacity-0 drop-shadow peer-checked:opacity-100")} aria-hidden />
          <span className="sr-only">{c.label}</span>
        </label>
      ))}
    </div>
  );
}
