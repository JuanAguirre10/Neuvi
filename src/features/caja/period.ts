// Periodo de la caja a partir de los searchParams (?periodo=hoy|semana|mes|personalizado&desde&hasta).
// Todo se calcula con dateKeys de Lima ("YYYY-MM-DD"); `to` es inclusivo.
import {
  LIMA_TZ,
  addDaysKey,
  endOfLimaDay,
  formatLongDate,
  startOfLimaDay,
  startOfLimaMonthKey,
  startOfLimaWeekKey,
  startOfNextLimaMonthKey,
  todayKey,
} from "@/lib/dates";

export type PeriodKind = "hoy" | "semana" | "mes" | "personalizado";

export const PERIOD_OPTIONS: { value: PeriodKind; label: string }[] = [
  { value: "hoy", label: "Hoy" },
  { value: "semana", label: "Esta semana" },
  { value: "mes", label: "Este mes" },
  { value: "personalizado", label: "Personalizado" },
];

export type CashPeriod = {
  kind: PeriodKind;
  from: string;
  to: string;
  /** Rango UTC para Prisma: gte start, lt end. */
  start: Date;
  end: Date;
  label: string;
};

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_CUSTOM_DAYS = 366;

function isValidKey(value: string | undefined): value is string {
  if (!value || !DATE_KEY.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

const dayMonth = new Intl.DateTimeFormat("es-PE", { timeZone: LIMA_TZ, day: "numeric", month: "long" });
const dayMonthYear = new Intl.DateTimeFormat("es-PE", {
  timeZone: LIMA_TZ,
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** "mié., 30 de setiembre de 2026" | "Del 28 de setiembre al 4 de octubre de 2026" */
function rangeLabel(from: string, to: string): string {
  if (from === to) return formatLongDate(startOfLimaDay(from));
  const a = startOfLimaDay(from);
  const b = startOfLimaDay(to);
  const first = from.slice(0, 4) === to.slice(0, 4) ? dayMonth.format(a) : dayMonthYear.format(a);
  return `Del ${first} al ${dayMonthYear.format(b)}`;
}

export function resolvePeriod(params: { periodo?: string; desde?: string; hasta?: string }): CashPeriod {
  const today = todayKey();
  const kind: PeriodKind = (["hoy", "semana", "mes", "personalizado"] as const).includes(params.periodo as PeriodKind)
    ? (params.periodo as PeriodKind)
    : "mes";

  let from = today;
  let to = today;

  if (kind === "semana") {
    from = startOfLimaWeekKey(today);
    to = addDaysKey(from, 6);
  } else if (kind === "mes") {
    from = startOfLimaMonthKey(today);
    to = addDaysKey(startOfNextLimaMonthKey(today), -1);
  } else if (kind === "personalizado") {
    from = isValidKey(params.desde) ? params.desde : today;
    to = isValidKey(params.hasta) ? params.hasta : from;
    if (from > to) [from, to] = [to, from];
    // Evita rangos gigantes por error de tipeo.
    if (addDaysKey(from, MAX_CUSTOM_DAYS) < to) to = addDaysKey(from, MAX_CUSTOM_DAYS);
  }

  return {
    kind,
    from,
    to,
    start: startOfLimaDay(from),
    end: endOfLimaDay(to),
    label: rangeLabel(from, to),
  };
}

/** Query string para enlazar al mismo periodo (export CSV, etc.). */
export function periodQuery(period: CashPeriod): string {
  const qs = new URLSearchParams({ periodo: period.kind });
  if (period.kind === "personalizado") {
    qs.set("desde", period.from);
    qs.set("hasta", period.to);
  }
  return qs.toString();
}
