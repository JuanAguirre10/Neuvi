// Aritmética de fechas del seed. Lima es UTC−5 fijo (ver src/lib/dates.ts), así que un "día" es un
// entero: días calendario de Lima desde 1970-01-01. Evita Intl en bucles de miles de citas.

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
const LIMA_OFFSET = 5 * HOUR;

/** Momento en que corre el seed: todas las fechas son relativas a él. */
export const NOW = Date.now();

/** Día calendario de Lima de un instante (ms). */
export function limaDay(ms: number): number {
  return Math.floor((ms - LIMA_OFFSET) / DAY);
}

export const TODAY = limaDay(NOW);

/** Instante (ms UTC) del día `day` a los `minutes` minutos, hora de Lima. */
export function limaTime(day: number, minutes: number): number {
  return day * DAY + LIMA_OFFSET + minutes * MINUTE;
}

/** "YYYY-MM-DD" del día. */
export function dayKey(day: number): string {
  return new Date(day * DAY).toISOString().slice(0, 10);
}

/** Valor para columnas @db.Date (medianoche UTC, como dateOnlyFromKey). */
export function dateOnly(day: number): Date {
  return new Date(day * DAY);
}

/** 0 = lunes … 6 = domingo. */
export function weekday(day: number): number {
  return (((day + 3) % 7) + 7) % 7;
}

export function mondayOf(day: number): number {
  return day - weekday(day);
}

/** Suma meses; si el día no existe en el mes destino usa el último (igual que addMonthsKey del panel admin). */
export function addMonths(day: number, months: number): number {
  const d = new Date(day * DAY);
  const index = d.getUTCFullYear() * 12 + d.getUTCMonth() + months;
  const year = Math.floor(index / 12);
  const month = index % 12;
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Math.floor(Date.UTC(year, month, Math.min(d.getUTCDate(), last)) / DAY);
}

export function monthOf(day: number): number {
  return new Date(day * DAY).getUTCMonth() + 1;
}

export function yearOf(ms: number): number {
  return new Date(ms - LIMA_OFFSET).getUTCFullYear();
}

/** "26/10/2026", como formatDate de src/lib/dates. */
export function formatDay(day: number): string {
  const [y, m, d] = dayKey(day).split("-");
  return `${d}/${m}/${y}`;
}

// Feriados nacionales del Perú (fijos) y Semana Santa de los años que cubre el seed.
const FIXED_HOLIDAYS = new Set([
  "01-01", "05-01", "06-07", "06-29", "07-23", "07-28", "07-29", "08-06", "08-30", "10-08", "11-01", "12-08", "12-09", "12-25",
]);
const MOVABLE_HOLIDAYS = new Set(["2025-04-17", "2025-04-18", "2026-04-02", "2026-04-03", "2027-03-25", "2027-03-26"]);

export function isHoliday(day: number): boolean {
  const key = dayKey(day);
  return FIXED_HOLIDAYS.has(key.slice(5)) || MOVABLE_HOLIDAYS.has(key);
}
