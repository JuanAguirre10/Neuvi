// Formatos de presentación del panel de Neuvi (sin dependencias de servidor).
import type { PlatformRole } from "@prisma/client";
import { formatDate, limaDateKey, startOfLimaDay } from "@/lib/dates";
import { formatPEN } from "@/lib/format";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Días completos desde una fecha (Infinity si nunca). */
export function daysSince(date: Date | null, now: Date = new Date()): number {
  return date ? (now.getTime() - date.getTime()) / DAY_MS : Number.POSITIVE_INFINITY;
}

/** "Hoy", "Ayer", "Hace 5 días" o la fecha si pasó más de un mes. */
export function lastAccessLabel(date: Date | null, now: Date = new Date()): string {
  if (!date) return "Nunca";
  const days = Math.round((startOfLimaDay(limaDateKey(now)).getTime() - startOfLimaDay(limaDateKey(date)).getTime()) / DAY_MS);
  if (days <= 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days <= 30) return `Hace ${days} días`;
  return formatDate(date);
}

/** Precio mensual con su unidad: "S/ 70.00 por psicólogo" o "Por definir". */
export function monthlyPriceLabel(cents: number | null, perProfessional: boolean): string {
  if (cents == null) return "Por definir";
  return `${formatPEN(cents)}${perProfessional ? " por psicólogo" : ""}`;
}

const percent = new Intl.NumberFormat("es-PE", { style: "percent", maximumFractionDigits: 1 });

export function formatRate(value: number | null): string {
  return value == null ? "—" : percent.format(value);
}

export const PLATFORM_ROLE_DESCRIPTION: Record<PlatformRole, string> = {
  SUPERADMIN: "Todo el panel, incluido el catálogo de planes y el equipo de Neuvi.",
  FINANZAS: "Facturación y cobros; activa o cambia planes y precios; suspende y reactiva cuentas.",
  SOPORTE: "Consulta todo el panel, extiende pruebas y deja notas internas.",
};
