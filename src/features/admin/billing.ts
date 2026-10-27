// Reglas de facturación y salud de cuentas de Neuvi. Funciones puras (sin BD): se usan en
// servidor y cliente. Los estados "derivados" (prueba vencida, con deuda, factura vencida...) se
// calculan aquí y nunca se guardan.
//
// Las consultas SQL de queries.ts que filtran por estado de factura replican invoiceStatus();
// si cambias la regla, cambia ambas.
import type { BillingCycle, OrgType, Plan, SubscriptionStatus } from "@prisma/client";
import { addDaysKey, dateOnlyToKey, todayKey } from "@/lib/dates";

const DAY_MS = 24 * 60 * 60 * 1000;

// ---------- Facturas ----------

export type InvoiceStatus = "PENDIENTE" | "PAGADA" | "VENCIDA" | "ANULADA";

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  PENDIENTE: "Pendiente",
  PAGADA: "Pagada",
  VENCIDA: "Vencida",
  ANULADA: "Anulada",
};

export const INVOICE_STATUSES = Object.keys(INVOICE_STATUS_LABEL) as InvoiceStatus[];

type InvoiceAmounts = { seats: number; unitPriceCents: number; discountCents: number };

/** Total = psicólogos facturados × precio unitario − descuento (nunca negativo). */
export function invoiceTotal(inv: InvoiceAmounts): number {
  return Math.max(0, inv.seats * inv.unitPriceCents - inv.discountCents);
}

/** Lo que falta pagar de la factura (0 si está pagada o anulada). */
export function invoiceBalance(inv: InvoiceAmounts & { voidedAt: Date | null }, paidCents: number): number {
  if (inv.voidedAt) return 0;
  return Math.max(0, invoiceTotal(inv) - paidCents);
}

/**
 * ANULADA si tiene fecha de anulación; PAGADA si los pagos cubren el total; VENCIDA si la fecha
 * de vencimiento (día calendario) ya pasó; si no, PENDIENTE. Vence al terminar el día de vencimiento.
 */
export function invoiceStatus(
  inv: InvoiceAmounts & { voidedAt: Date | null; dueDate: Date },
  paidCents: number,
  today: string = todayKey(),
): InvoiceStatus {
  if (inv.voidedAt) return "ANULADA";
  if (paidCents >= invoiceTotal(inv)) return "PAGADA";
  if (dateOnlyToKey(inv.dueDate) < today) return "VENCIDA";
  return "PENDIENTE";
}

/** "NVX-2026-000123" */
export function formatInvoiceNumber(year: string | number, sequence: number): string {
  return `NVX-${year}-${String(sequence).padStart(6, "0")}`;
}

/** Correlativo de un número "NVX-YYYY-NNNNNN" (0 si no tiene el formato). */
export function invoiceSequence(number: string): number {
  const match = /^NVX-\d{4}-(\d{6,})$/.exec(number);
  return match ? Number(match[1]) : 0;
}

// ---------- Periodos ----------

export function cycleMonths(cycle: BillingCycle): number {
  return cycle === "ANUAL" ? 12 : 1;
}

/** Suma meses a un "YYYY-MM-DD"; si el día no existe en el mes destino se usa el último (31 ene + 1 = 28 feb). */
export function addMonthsKey(dateKey: string, months: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const index = y * 12 + (m - 1) + months;
  const ny = Math.floor(index / 12);
  const nm = (index % 12) + 1;
  const lastDay = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${String(nm).padStart(2, "0")}-${String(Math.min(d, lastDay)).padStart(2, "0")}`;
}

/**
 * Periodo de la siguiente factura: empieza el día después del fin de la última factura no anulada
 * (o en la fecha de activación del plan) y dura un mes o un año según el ciclo.
 */
export function nextInvoicePeriod({
  lastPeriodEndKey,
  activationKey,
  cycle,
}: {
  lastPeriodEndKey: string | null;
  activationKey: string;
  cycle: BillingCycle;
}): { startKey: string; endKey: string } {
  const startKey = lastPeriodEndKey ? addDaysKey(lastPeriodEndKey, 1) : activationKey;
  const endKey = addDaysKey(addMonthsKey(startKey, cycleMonths(cycle)), -1);
  return { startKey, endKey };
}

// ---------- Precios y MRR ----------

type PlanPricing = { listPriceCents: number | null; perProfessional: boolean };

/** Precio mensual vigente: el pactado o, si no hay, el de lista. null = "Por definir". */
export function effectiveMonthlyPrice(priceCents: number | null, plan: PlanPricing): number | null {
  return priceCents ?? plan.listPriceCents;
}

/** Psicólogos que se cobran: los activos en planes por profesional (mínimo 1), si no, 1. */
export function billableSeats(plan: Pick<PlanPricing, "perProfessional">, activeProfessionals: number): number {
  return plan.perProfessional ? Math.max(1, activeProfessionals) : 1;
}

/** Precio unitario de una factura: el mensual por los meses del ciclo. */
export function periodUnitPrice(monthlyCents: number, cycle: BillingCycle): number {
  return monthlyCents * cycleMonths(cycle);
}

/**
 * MRR estimado de una suscripción: solo cuentas ACTIVA, psicólogos facturables × precio mensual.
 * Un plan anual también aporta su equivalente mensual. Sin precio definido aporta 0.
 */
export function subscriptionMrr(
  sub: { status: SubscriptionStatus; priceCents: number | null; plan: PlanPricing },
  activeProfessionals: number,
): number {
  if (sub.status !== "ACTIVA") return 0;
  const price = effectiveMonthlyPrice(sub.priceCents, sub.plan);
  if (price == null) return 0;
  return billableSeats(sub.plan, activeProfessionals) * price;
}

/** El tipo de organización sigue al plan (las funciones del consultorio dependen de org.type). */
export function orgTypeForPlan(plan: Plan): OrgType {
  return plan === "CENTRO" ? "CENTRO" : "INDIVIDUAL";
}

// ---------- Salud de la cuenta ----------

export type AccountState = SubscriptionStatus | "PRUEBA_VENCIDA";
export type AccountStatusFilter = AccountState | "CON_DEUDA";

export const ACCOUNT_STATUS_FILTER_LABEL: Record<AccountStatusFilter, string> = {
  PRUEBA: "En prueba",
  PRUEBA_VENCIDA: "Prueba vencida",
  ACTIVA: "Activa",
  CON_DEUDA: "Con deuda",
  SUSPENDIDA: "Suspendida",
  CANCELADA: "Cancelada",
};

export const TRIAL_SOON_DAYS = 7;

export type AccountHealth = {
  /** Estado mostrado: PRUEBA_VENCIDA cuando la prueba terminó sin activar un plan. */
  state: AccountState;
  trialDaysLeft: number | null;
  trialExpired: boolean;
  trialEndingSoon: boolean;
  overdueCents: number;
  hasDebt: boolean;
  /** Activa sin precio pactado ni de lista: no se puede facturar. */
  missingPrice: boolean;
};

export function accountHealth(
  sub: { status: SubscriptionStatus; trialEndsAt: Date; priceCents: number | null; plan: PlanPricing },
  overdueCents: number,
  now: Date = new Date(),
): AccountHealth {
  const isTrial = sub.status === "PRUEBA";
  const msLeft = sub.trialEndsAt.getTime() - now.getTime();
  const trialExpired = isTrial && msLeft <= 0;
  const trialDaysLeft = isTrial ? Math.max(0, Math.ceil(msLeft / DAY_MS)) : null;
  return {
    state: trialExpired ? "PRUEBA_VENCIDA" : sub.status,
    trialDaysLeft,
    trialExpired,
    trialEndingSoon: isTrial && !trialExpired && msLeft <= TRIAL_SOON_DAYS * DAY_MS,
    overdueCents,
    hasDebt: overdueCents > 0,
    missingPrice: sub.status === "ACTIVA" && effectiveMonthlyPrice(sub.priceCents, sub.plan) == null,
  };
}

/** ¿La cuenta entra en el filtro de estado del listado? */
export function matchesStatusFilter(health: AccountHealth, filter: AccountStatusFilter): boolean {
  if (filter === "CON_DEUDA") return health.hasDebt;
  return health.state === filter;
}

/** Desde cuándo se cuentan los días al extender una prueba: su fin o, si ya venció, ahora. */
export function trialExtensionBase(trialEndsAt: Date, now: Date = new Date()): Date {
  return new Date(Math.max(trialEndsAt.getTime(), now.getTime()));
}

/** Tasa de inasistencia: no asistió ÷ (atendidas + no asistió). */
export function noShowRate(attended: number, noShow: number): number | null {
  const closed = attended + noShow;
  return closed > 0 ? noShow / closed : null;
}
