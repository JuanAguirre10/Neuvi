"use client";

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addDaysKey } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { AgendaQuery, AgendaView } from "../lib";
import type { AgendaProfessional } from "../types";

const VIEWS: { value: AgendaView; label: string }[] = [
  { value: "semana", label: "Semana" },
  { value: "dia", label: "Día" },
];

export function AgendaToolbar({
  query,
  today,
  rangeLabel,
  professionals,
  canFilter,
  cancelledCount,
  pending,
  onChange,
}: {
  query: AgendaQuery;
  today: string;
  rangeLabel: string;
  professionals: AgendaProfessional[];
  canFilter: boolean;
  cancelledCount: number;
  pending: boolean;
  onChange: (patch: Partial<AgendaQuery>) => void;
}) {
  const step = query.vista === "semana" ? 7 : 1;
  const unit = query.vista === "semana" ? "semana" : "día";

  return (
    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex shrink-0 items-center rounded-lg border bg-card p-0.5 shadow-xs">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`${unit === "semana" ? "Semana" : "Día"} anterior`}
            onClick={() => onChange({ fecha: addDaysKey(query.fecha, -step) })}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="px-3"
            onClick={() => onChange({ fecha: today })}
            disabled={query.fecha === today}
          >
            Hoy
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`${unit === "semana" ? "Semana" : "Día"} siguiente`}
            onClick={() => onChange({ fecha: addDaysKey(query.fecha, step) })}
          >
            <ChevronRight />
          </Button>
        </div>
        <h2 className="truncate text-base font-semibold text-brand-navy-deep first-letter:uppercase sm:text-lg">
          {rangeLabel}
        </h2>
        {pending ? <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-label="Cargando" /> : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div role="tablist" aria-label="Vista" className="hidden h-8 items-center rounded-lg border bg-muted/50 p-0.5 md:flex">
          {VIEWS.map((v) => (
            <button
              key={v.value}
              type="button"
              role="tab"
              aria-selected={query.vista === v.value}
              onClick={() => onChange({ vista: v.value })}
              className={cn(
                "h-full rounded-md px-3 text-sm font-medium transition-colors",
                query.vista === v.value
                  ? "bg-card text-primary shadow-xs ring-1 ring-border"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v.label}
            </button>
          ))}
        </div>

        {canFilter ? (
          <Select value={query.profesional} onValueChange={(v) => onChange({ profesional: v })}>
            <SelectTrigger className="h-8 min-w-48 bg-card" aria-label="Filtrar por profesional">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="end">
              <SelectItem value="todos">Todos los profesionales</SelectItem>
              {professionals.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        <div className="flex items-center gap-2">
          <Switch
            id="show-cancelled"
            size="sm"
            checked={query.canceladas}
            onCheckedChange={(checked) => onChange({ canceladas: checked })}
          />
          <Label htmlFor="show-cancelled" className="text-sm font-normal text-muted-foreground">
            Ver canceladas{cancelledCount > 0 && !query.canceladas ? ` (${cancelledCount})` : ""}
          </Label>
        </div>
      </div>
    </div>
  );
}
