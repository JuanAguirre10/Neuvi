import type { PlatformRole, SubscriptionEventType, SubscriptionStatus } from "@prisma/client";
import {
  Ban,
  CircleCheck,
  CircleDollarSign,
  Clock,
  PauseCircle,
  Play,
  Repeat,
  Sparkles,
  TimerReset,
  TriangleAlert,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { Pill } from "@/components/common/status-badges";
import { PLATFORM_ROLE_LABEL, SUBSCRIPTION_EVENT_LABEL, SUBSCRIPTION_STATUS_LABEL, formatPEN } from "@/lib/format";
import { INVOICE_STATUS_LABEL, type AccountHealth, type InvoiceStatus } from "../billing";

type Tone = React.ComponentProps<typeof Pill>["tone"];

const STATUS_TONE: Record<SubscriptionStatus, Tone> = {
  PRUEBA: "blue",
  ACTIVA: "teal",
  SUSPENDIDA: "red",
  CANCELADA: "gray",
};

export function SubscriptionStatusBadge({ status }: { status: SubscriptionStatus }) {
  return <Pill tone={STATUS_TONE[status]}>{SUBSCRIPTION_STATUS_LABEL[status]}</Pill>;
}

/** Estado de la cuenta + avisos derivados (prueba vencida o por vencer, deuda, sin precio). */
export function AccountStatusPills({
  status,
  health,
  showAmount = false,
}: {
  status: SubscriptionStatus;
  health: AccountHealth;
  showAmount?: boolean;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {health.trialExpired ? (
        <Pill tone="amber">
          <TriangleAlert className="size-3" aria-hidden /> Prueba vencida
        </Pill>
      ) : (
        <SubscriptionStatusBadge status={status} />
      )}
      {health.trialEndingSoon ? (
        <Pill tone="amber">
          <Clock className="size-3" aria-hidden />
          {health.trialDaysLeft === 1 ? "Vence mañana" : `Vence en ${health.trialDaysLeft} días`}
        </Pill>
      ) : null}
      {health.hasDebt ? (
        <Pill tone="red">
          <CircleDollarSign className="size-3" aria-hidden />
          {showAmount ? `Debe ${formatPEN(health.overdueCents)}` : "Con deuda"}
        </Pill>
      ) : null}
      {health.missingPrice ? <Pill tone="gray">Sin precio</Pill> : null}
    </span>
  );
}

const INVOICE_TONE: Record<InvoiceStatus, Tone> = {
  PENDIENTE: "blue",
  PAGADA: "teal",
  VENCIDA: "red",
  ANULADA: "gray",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return <Pill tone={INVOICE_TONE[status]}>{INVOICE_STATUS_LABEL[status]}</Pill>;
}

export const EVENT_ICON: Record<SubscriptionEventType, LucideIcon> = {
  ALTA: UserPlus,
  PRUEBA_EXTENDIDA: TimerReset,
  PLAN_ACTIVADO: Sparkles,
  PLAN_CAMBIADO: Repeat,
  PRECIO_ACTUALIZADO: CircleDollarSign,
  SUSPENDIDA: PauseCircle,
  REACTIVADA: Play,
  CANCELADA: Ban,
};

const EVENT_TONE: Record<SubscriptionEventType, string> = {
  ALTA: "bg-info-soft text-primary",
  PRUEBA_EXTENDIDA: "bg-info-soft text-primary",
  PLAN_ACTIVADO: "bg-success-soft text-success",
  PLAN_CAMBIADO: "bg-secondary text-brand-navy",
  PRECIO_ACTUALIZADO: "bg-secondary text-brand-navy",
  SUSPENDIDA: "bg-danger-soft text-destructive",
  REACTIVADA: "bg-success-soft text-success",
  CANCELADA: "bg-muted text-muted-foreground",
};

/** Ícono redondo del tipo de evento (para timelines). */
export function EventIcon({ type }: { type: SubscriptionEventType }) {
  const Icon = EVENT_ICON[type];
  return (
    <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${EVENT_TONE[type]}`} title={SUBSCRIPTION_EVENT_LABEL[type]}>
      <Icon className="size-4" aria-hidden />
    </span>
  );
}

const ROLE_TONE: Record<PlatformRole, Tone> = { SUPERADMIN: "navy", FINANZAS: "teal", SOPORTE: "blue" };

export function PlatformRoleBadge({ role }: { role: PlatformRole }) {
  return <Pill tone={ROLE_TONE[role]}>{PLATFORM_ROLE_LABEL[role]}</Pill>;
}

export function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <Pill tone="teal">
      <CircleCheck className="size-3" aria-hidden /> Activo
    </Pill>
  ) : (
    <Pill tone="gray">Inactivo</Pill>
  );
}
