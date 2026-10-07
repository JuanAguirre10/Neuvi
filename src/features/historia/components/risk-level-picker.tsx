"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { RISK_LEVELS, RISK_SHORT_LABEL, type RiskLevelValue } from "../fields";

const ACTIVE: Record<RiskLevelValue, string> = {
  NINGUNO: "border-foreground/20 bg-muted text-brand-navy-deep",
  BAJO: "border-primary/40 bg-info-soft text-primary",
  MODERADO: "border-warning/40 bg-warning-soft text-warning",
  ALTO: "border-destructive/50 bg-danger-soft text-destructive",
};

const DOT: Record<RiskLevelValue, string> = {
  NINGUNO: "bg-muted-foreground/40",
  BAJO: "bg-primary",
  MODERADO: "bg-warning",
  ALTO: "bg-destructive",
};

/** Selector segmentado de nivel de riesgo (radios nativos: se envía con el formulario). */
export function RiskLevelPicker({
  name = "riskLevel",
  defaultValue = "NINGUNO",
  onChange,
}: {
  name?: string;
  defaultValue?: RiskLevelValue;
  onChange?: (value: RiskLevelValue) => void;
}) {
  const [value, setValue] = useState<RiskLevelValue>(defaultValue);
  return (
    <div role="radiogroup" aria-label="Nivel de riesgo" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {RISK_LEVELS.map((level) => {
        const checked = value === level;
        return (
          <label
            key={level}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
              checked ? ACTIVE[level] : "text-muted-foreground hover:border-brand-sky",
            )}
          >
            <input
              type="radio"
              name={name}
              value={level}
              checked={checked}
              onChange={() => {
                setValue(level);
                onChange?.(level);
              }}
              className="sr-only"
            />
            <span className={cn("size-2 rounded-full", DOT[level])} aria-hidden />
            {RISK_SHORT_LABEL[level]}
          </label>
        );
      })}
    </div>
  );
}
