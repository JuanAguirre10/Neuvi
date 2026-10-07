"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Plus, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormMessage, SubmitButton, useServerForm } from "@/components/common/form";
import { todayKey } from "@/lib/dates";
import { centsToInput, formatPEN, parseAmountToCents, PAYMENT_METHOD_LABEL, toOptions } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SelectInput } from "@/features/pacientes/components/select-input";
import { patientHref } from "@/features/pacientes/utils";
import { createPackageAction } from "../actions";

const PRESETS = [
  { id: "single", label: "Sesión individual", sessions: 1 },
  { id: "p4", label: "Paquete 4 sesiones", sessions: 4 },
  { id: "p8", label: "Paquete 8 sesiones", sessions: 8 },
  { id: "custom", label: "Personalizado", sessions: null },
] as const;
type PresetId = (typeof PRESETS)[number]["id"];

export type PackagePrefill = { name: string; totalSessions: number; priceCents: number };

function presetFor(total: number, name: string): PresetId {
  const match = PRESETS.find((p) => p.sessions === total && p.label === name);
  return match?.id ?? "custom";
}

/**
 * Diálogo "Nuevo paquete" / "Renovar paquete" (solo ADMIN / RECEPCION).
 * Con `prefill` (último paquete del paciente) funciona como renovación.
 */
export function PackageDialog({
  patientId,
  prefill,
  defaultOpen = false,
  clearParamOnClose = false,
  triggerVariant = "default",
}: {
  patientId: string;
  prefill?: PackagePrefill | null;
  defaultOpen?: boolean;
  /** Quita ?renovar= de la URL al cerrar o guardar. */
  clearParamOnClose?: boolean;
  triggerVariant?: "default" | "outline";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next && clearParamOnClose) {
      router.replace(patientHref(patientId, { tab: "paquetes" }), { scroll: false });
    }
  }

  const renewing = Boolean(prefill);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant={triggerVariant}>
          {renewing ? <RefreshCcw /> : <Plus />}
          {renewing ? "Renovar paquete" : "Nuevo paquete"}
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[92dvh] flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-5 py-4 pr-12">
          <DialogTitle className="flex items-center gap-2 text-brand-navy-deep">
            <Package className="size-4 text-primary" />
            {renewing ? "Renovar paquete" : "Nuevo paquete"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {renewing
              ? "Prellenado con el último paquete del paciente. Ajusta lo que necesites."
              : "Una sesión suelta es un paquete de 1 sesión. Las citas descuentan automáticamente."}
          </DialogDescription>
        </DialogHeader>
        <PackageForm
          patientId={patientId}
          prefill={prefill}
          onCancel={() => handleOpenChange(false)}
          onSaved={(msg) => {
            toast.success(msg);
            handleOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function PackageForm({
  patientId,
  prefill,
  onCancel,
  onSaved,
}: {
  patientId: string;
  prefill?: PackagePrefill | null;
  onCancel: () => void;
  onSaved: (message: string) => void;
}) {
  const { state, pending, onSubmit } = useServerForm(createPackageAction.bind(null, patientId), {
    onSuccess: (s) => onSaved(s.message ?? "Paquete creado."),
  });
  const e = state.fieldErrors ?? {};

  const [preset, setPreset] = useState<PresetId>(prefill ? presetFor(prefill.totalSessions, prefill.name) : "p4");
  const [name, setName] = useState(prefill?.name ?? "Paquete 4 sesiones");
  const [sessions, setSessions] = useState(String(prefill?.totalSessions ?? 4));
  const [price, setPrice] = useState(prefill ? centsToInput(prefill.priceCents) : "");
  const [payNow, setPayNow] = useState(false);
  const [initialAmount, setInitialAmount] = useState("");

  const priceCents = parseAmountToCents(price);
  const total = Number(sessions);
  const perSession = priceCents !== null && total > 0 ? Math.round(priceCents / total) : null;

  function choosePreset(id: PresetId) {
    setPreset(id);
    const p = PRESETS.find((x) => x.id === id);
    if (p?.sessions) {
      setName(p.label);
      setSessions(String(p.sessions));
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="grid gap-4 overflow-y-auto px-5 py-4">
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-[0.8rem] font-medium text-brand-navy">Tipo de paquete</legend>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => choosePreset(p.id)}
                aria-pressed={preset === p.id}
                className={cn(
                  "flex flex-col items-start rounded-lg border bg-card px-3 py-2 text-left transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  preset === p.id ? "border-primary bg-secondary/60 ring-1 ring-primary" : "hover:border-brand-sky",
                )}
              >
                <span className="text-sm font-medium text-brand-navy-deep">{p.label}</span>
                <span className="text-xs text-muted-foreground">
                  {p.sessions ? `${p.sessions} ${p.sessions === 1 ? "sesión" : "sesiones"}` : "Define nombre y sesiones"}
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        <Field label="Nombre del paquete" htmlFor="pkg-name" error={e.name} required>
          <Input
            id="pkg-name"
            name="name"
            value={name}
            onChange={(ev) => {
              setName(ev.target.value);
              setPreset("custom");
            }}
            className="h-9"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Sesiones" htmlFor="pkg-sessions" error={e.totalSessions} required>
            <Input
              id="pkg-sessions"
              name="totalSessions"
              type="number"
              min={1}
              max={100}
              inputMode="numeric"
              value={sessions}
              onChange={(ev) => {
                setSessions(ev.target.value);
                setPreset("custom");
              }}
              className="h-9"
            />
          </Field>
          <Field
            label="Precio total (S/)"
            htmlFor="pkg-price"
            error={e.price}
            required
            hint={perSession !== null && total > 1 ? `${formatPEN(perSession)} por sesión` : undefined}
          >
            <Input
              id="pkg-price"
              name="price"
              inputMode="decimal"
              placeholder="0.00"
              value={price}
              onChange={(ev) => setPrice(ev.target.value)}
              className="h-9"
            />
          </Field>
          <Field label="Fecha de inicio" htmlFor="pkg-start" error={e.startDate}>
            <Input id="pkg-start" name="startDate" type="date" defaultValue={todayKey()} className="h-9" />
          </Field>
        </div>

        <Field label="Notas" htmlFor="pkg-notes" error={e.notes}>
          <Textarea
            id="pkg-notes"
            name="notes"
            rows={2}
            placeholder="Ej. Precio promocional, convenio con empresa."
          />
        </Field>

        <div className={cn("grid gap-3 rounded-lg border p-3", payNow ? "bg-secondary/40" : "bg-muted/30")}>
          <label className="flex items-start gap-2.5 text-sm font-medium text-brand-navy">
            <Checkbox
              name="payNow"
              checked={payNow}
              onCheckedChange={(v) => {
                const checked = v === true;
                setPayNow(checked);
                if (checked && !initialAmount && priceCents) setInitialAmount(centsToInput(priceCents));
              }}
              className="mt-0.5"
            />
            Registrar un pago ahora
          </label>
          {payNow ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Monto (S/)" htmlFor="pkg-initialAmount" error={e.initialAmount} required>
                <Input
                  id="pkg-initialAmount"
                  name="initialAmount"
                  inputMode="decimal"
                  value={initialAmount}
                  onChange={(ev) => setInitialAmount(ev.target.value)}
                  className="h-9 bg-card"
                />
              </Field>
              <Field label="Método" htmlFor="pkg-initialMethod" error={e.initialMethod} required>
                <SelectInput
                  id="pkg-initialMethod"
                  name="initialMethod"
                  defaultValue="YAPE"
                  options={toOptions(PAYMENT_METHOD_LABEL)}
                />
              </Field>
              <Field label="N.º de operación" htmlFor="pkg-initialReference" error={e.initialReference}>
                <Input id="pkg-initialReference" name="initialReference" className="h-9 bg-card" />
              </Field>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t bg-muted/40 px-5 py-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <FormMessage message={state.ok ? undefined : state.message} />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="h-9 flex-1 sm:flex-none" onClick={onCancel} disabled={pending}>
            Cancelar
          </Button>
          <SubmitButton pending={pending} className="h-9 flex-1 sm:flex-none" pendingText="Guardando…">
            Crear paquete
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
