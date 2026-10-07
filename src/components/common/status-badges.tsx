import type { AppointmentStatus, PackageStatus, PatientStatus, RiskLevel } from "@prisma/client";
import {
  APPOINTMENT_STATUS_LABEL,
  PACKAGE_STATUS_LABEL,
  PATIENT_STATUS_LABEL,
  RISK_LEVEL_LABEL,
} from "@/lib/format";
import { cn } from "@/lib/utils";

type Tone = "blue" | "teal" | "amber" | "red" | "gray" | "navy";

const TONE_CLASS: Record<Tone, string> = {
  blue: "bg-info-soft text-primary ring-primary/15",
  teal: "bg-success-soft text-success ring-success/20",
  amber: "bg-warning-soft text-warning ring-warning/20",
  red: "bg-danger-soft text-destructive ring-destructive/20",
  gray: "bg-muted text-muted-foreground ring-foreground/10",
  navy: "bg-brand-navy text-white ring-brand-navy",
};

export function Pill({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-full px-2 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const APPOINTMENT_TONE: Record<AppointmentStatus, Tone> = {
  PROGRAMADA: "blue",
  CONFIRMADA: "teal",
  ATENDIDA: "navy",
  NO_ASISTIO: "amber",
  CANCELADA: "gray",
};

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  return <Pill tone={APPOINTMENT_TONE[status]}>{APPOINTMENT_STATUS_LABEL[status]}</Pill>;
}

const PACKAGE_TONE: Record<PackageStatus, Tone> = { ACTIVO: "teal", COMPLETADO: "gray", CANCELADO: "red" };

export function PackageStatusBadge({ status }: { status: PackageStatus }) {
  return <Pill tone={PACKAGE_TONE[status]}>{PACKAGE_STATUS_LABEL[status]}</Pill>;
}

const PATIENT_TONE: Record<PatientStatus, Tone> = { ACTIVO: "teal", EN_PAUSA: "amber", ALTA: "blue", ABANDONO: "gray" };

export function PatientStatusBadge({ status }: { status: PatientStatus }) {
  return <Pill tone={PATIENT_TONE[status]}>{PATIENT_STATUS_LABEL[status]}</Pill>;
}

const RISK_TONE: Record<RiskLevel, Tone> = { NINGUNO: "gray", BAJO: "blue", MODERADO: "amber", ALTO: "red" };

export function RiskBadge({ level }: { level: RiskLevel }) {
  return <Pill tone={RISK_TONE[level]}>{RISK_LEVEL_LABEL[level]}</Pill>;
}

/** Barra "3 de 4 sesiones" para paquetes. */
export function SessionsMeter({ used, total, className }: { used: number; total: number; className?: string }) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const remaining = Math.max(total - used, 0);
  return (
    <div className={cn("grid gap-1", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {used} de {total} sesiones
        </span>
        <span className={cn("font-medium", remaining <= 1 ? "text-warning" : "text-success")}>
          {remaining} restante{remaining === 1 ? "" : "s"}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", remaining <= 1 ? "bg-[#e5a13a]" : "bg-brand-teal")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
