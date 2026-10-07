// Mes del reporte (?mes=YYYY-MM), en hora de Lima.
import { startOfLimaDay, startOfLimaMonthKey, startOfNextLimaMonthKey, todayKey } from "@/lib/dates";

export type ReportMonth = {
  /** "YYYY-MM" */
  key: string;
  /** "YYYY-MM-01" */
  firstDay: string;
  /** Primer día del mes siguiente (exclusivo). */
  nextFirstDay: string;
  /** Rango UTC para Prisma: gte start, lt end. */
  start: Date;
  end: Date;
  prevKey: string;
  nextKey: string;
  isCurrent: boolean;
  /** "setiembre de 2026" */
  label: string;
};

const MONTH_KEY = /^(\d{4})-(0[1-9]|1[0-2])$/;
const monthLabel = new Intl.DateTimeFormat("es-PE", { timeZone: "UTC", month: "long", year: "numeric" });

function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const index = y * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

function currentMonthKey(): string {
  return startOfLimaMonthKey(todayKey()).slice(0, 7);
}

function buildMonth(key: string, currentKey: string): ReportMonth {
  const firstDay = `${key}-01`;
  const nextFirstDay = startOfNextLimaMonthKey(firstDay);
  return {
    key,
    firstDay,
    nextFirstDay,
    start: startOfLimaDay(firstDay),
    end: startOfLimaDay(nextFirstDay),
    prevKey: shiftMonth(key, -1),
    nextKey: shiftMonth(key, 1),
    isCurrent: key === currentKey,
    label: monthLabel.format(new Date(`${firstDay}T12:00:00Z`)),
  };
}

/** Mes pedido; si es inválido o futuro, el mes actual de Lima. */
export function resolveMonth(mes: string | undefined): ReportMonth {
  const currentKey = currentMonthKey();
  const key = mes && MONTH_KEY.test(mes) && mes >= "2020-01" && mes <= currentKey ? mes : currentKey;
  return buildMonth(key, currentKey);
}

export function previousMonth(month: ReportMonth): ReportMonth {
  return buildMonth(month.prevKey, currentMonthKey());
}
