// Filtros de los listados de /admin (viven en la URL). Sin dependencias de servidor.
import type { OrgType, Plan, SubscriptionEventType } from "@prisma/client";
import { SUBSCRIPTION_EVENT_LABEL } from "@/lib/format";
import { todayKey } from "@/lib/dates";
import { ACCOUNT_STATUS_FILTER_LABEL, INVOICE_STATUSES, type AccountStatusFilter, type InvoiceStatus } from "./billing";

export type SearchParamValue = string | string[] | undefined;

/** searchParams pueden venir repetidos (?a=1&a=2): nos quedamos con el primero. */
export function firstParam(value: SearchParamValue): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  const trimmed = v?.trim();
  return trimmed ? trimmed : undefined;
}

function oneOf<T extends string>(value: SearchParamValue, allowed: readonly T[]): T | undefined {
  const v = firstParam(value);
  return v && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
}

export function parsePage(value: SearchParamValue): number {
  return Math.max(1, Math.min(10_000, Math.floor(Number(firstParam(value)) || 1)));
}

export function parseSearch(value: SearchParamValue): string | undefined {
  return firstParam(value)?.slice(0, 80);
}

// ---------- Meses ("YYYY-MM", hora de Lima) ----------

const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;
const monthFormat = new Intl.DateTimeFormat("es-PE", { timeZone: "UTC", month: "long", year: "numeric" });
const shortMonthFormat = new Intl.DateTimeFormat("es-PE", { timeZone: "UTC", month: "short" });

export function shiftMonthKey(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const index = y * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

export function currentMonthKey(): string {
  return todayKey().slice(0, 7);
}

/** Los últimos `count` meses, del más antiguo al actual. */
export function recentMonthKeys(count: number, last: string = currentMonthKey()): string[] {
  return Array.from({ length: count }, (_, i) => shiftMonthKey(last, i - count + 1));
}

/** "octubre de 2026" */
export function monthLabel(key: string): string {
  return monthFormat.format(new Date(`${key}-01T12:00:00Z`));
}

/** "oct. 26" (eje de gráficos) */
export function shortMonthLabel(key: string): string {
  return `${shortMonthFormat.format(new Date(`${key}-01T12:00:00Z`))} ${key.slice(2, 4)}`;
}

export function parseMonth(value: SearchParamValue): string | undefined {
  const v = firstParam(value);
  return v && MONTH_KEY.test(v) && v >= "2020-01" && v <= currentMonthKey() ? v : undefined;
}

/** Opciones de mes para los filtros: los últimos 12, del más reciente al más antiguo. */
export function monthOptions(): { value: string; label: string }[] {
  return recentMonthKeys(12)
    .reverse()
    .map((key) => ({ value: key, label: monthLabel(key) }));
}

// ---------- Cuentas ----------

export const ACCOUNT_SORT_LABEL = {
  recientes: "Más recientes",
  antiguas: "Más antiguas",
  nombre: "Nombre (A-Z)",
  mrr: "Mayor MRR",
  acceso: "Último acceso",
  pacientes: "Más pacientes",
  profesionales: "Más profesionales",
  prueba: "Fin de prueba más cercano",
} as const;

export type AccountSort = keyof typeof ACCOUNT_SORT_LABEL;

export const ACCOUNT_STATUS_FILTERS = Object.keys(ACCOUNT_STATUS_FILTER_LABEL) as AccountStatusFilter[];

export type AccountFilters = {
  q?: string;
  estado?: AccountStatusFilter;
  plan?: Plan;
  tipo?: OrgType;
  orden: AccountSort;
  page: number;
};

export function parseAccountFilters(sp: Record<string, SearchParamValue>): AccountFilters {
  return {
    q: parseSearch(sp.q),
    estado: oneOf(sp.estado, ACCOUNT_STATUS_FILTERS),
    plan: oneOf(sp.plan, ["INDIVIDUAL", "CENTRO"] as const),
    tipo: oneOf(sp.tipo, ["INDIVIDUAL", "CENTRO"] as const),
    orden: oneOf(sp.orden, Object.keys(ACCOUNT_SORT_LABEL) as AccountSort[]) ?? "recientes",
    page: parsePage(sp.page),
  };
}

// ---------- Facturación ----------

export type InvoiceFilters = { q?: string; estado?: InvoiceStatus; mes?: string; page: number };

export function parseInvoiceFilters(sp: Record<string, SearchParamValue>): InvoiceFilters {
  return {
    q: parseSearch(sp.q),
    estado: oneOf(sp.estado, INVOICE_STATUSES),
    mes: parseMonth(sp.mes),
    page: parsePage(sp.page),
  };
}

// ---------- Actividad ----------

export const EVENT_TYPES = Object.keys(SUBSCRIPTION_EVENT_LABEL) as SubscriptionEventType[];
/** Valor del filtro "responsable" para eventos sin actor (registro del cliente o sistema). */
export const SYSTEM_ACTOR = "sistema";

export type EventFilters = { q?: string; tipo?: SubscriptionEventType; actor?: string; mes?: string; page: number };

export function parseEventFilters(sp: Record<string, SearchParamValue>): EventFilters {
  const actor = firstParam(sp.actor);
  return {
    q: parseSearch(sp.q),
    tipo: oneOf(sp.tipo, EVENT_TYPES),
    actor: actor && actor.length <= 40 ? actor : undefined,
    mes: parseMonth(sp.mes),
    page: parsePage(sp.page),
  };
}

/** Arma la URL de un listado con sus filtros (omite los vacíos y la página 1). */
export function listHref(basePath: string, params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "") continue;
    if (k === "page" && Number(v) <= 1) continue;
    sp.set(k, String(v));
  }
  const qs = sp.toString();
  return `${basePath}${qs ? `?${qs}` : ""}`;
}
