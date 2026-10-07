// Fechas en hora de Lima. Perú no tiene horario de verano, así que el offset es fijo (-05:00).
// Regla: en la BD todo se guarda en UTC (Date). Para mostrar, usar estos helpers;
// para leer lo que el usuario escribe en un <input type="date"/"time">, usar fromLimaLocal().
// Un "dateKey" es un string "YYYY-MM-DD" que representa un día calendario en Lima.

export const LIMA_TZ = "America/Lima";
const LIMA_OFFSET = "-05:00";
const DAY_MS = 24 * 60 * 60 * 1000;

function parts(date: Date) {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: LIMA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => f.find((p) => p.type === t)?.value ?? "00";
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") === "24" ? "00" : get("hour"),
    minute: get("minute"),
  };
}

/** "YYYY-MM-DD" del día en Lima para una fecha UTC. */
export function limaDateKey(date: Date = new Date()): string {
  const p = parts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

/** "HH:mm" en Lima. */
export function limaTimeKey(date: Date): string {
  const p = parts(date);
  return `${p.hour}:${p.minute}`;
}

/** Valores para prellenar <input type="date"> y <input type="time">. */
export function toLimaInputValues(date: Date): { date: string; time: string } {
  return { date: limaDateKey(date), time: limaTimeKey(date) };
}

/** Convierte fecha ("YYYY-MM-DD") + hora ("HH:mm") escritas en hora de Lima a Date UTC. */
export function fromLimaLocal(dateKey: string, time = "00:00"): Date {
  return new Date(`${dateKey}T${time}:00${LIMA_OFFSET}`);
}

export function todayKey(): string {
  return limaDateKey(new Date());
}

/** Inicio del día (00:00 Lima) como Date UTC. */
export function startOfLimaDay(dateKey: string): Date {
  return fromLimaLocal(dateKey, "00:00");
}

/** Inicio del día siguiente (exclusivo) como Date UTC. Usar con `lt`. */
export function endOfLimaDay(dateKey: string): Date {
  return new Date(startOfLimaDay(dateKey).getTime() + DAY_MS);
}

export function addDaysKey(dateKey: string, days: number): string {
  return limaDateKey(new Date(startOfLimaDay(dateKey).getTime() + days * DAY_MS + 12 * 60 * 60 * 1000));
}

/** Lunes de la semana del dateKey. */
export function startOfLimaWeekKey(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // 0 = lunes
  return addDaysKey(dateKey, -dow);
}

/** Primer día del mes ("YYYY-MM-01") del dateKey. */
export function startOfLimaMonthKey(dateKey: string = todayKey()): string {
  return `${dateKey.slice(0, 7)}-01`;
}

/** Primer día del mes siguiente. */
export function startOfNextLimaMonthKey(dateKey: string = todayKey()): string {
  const [y, m] = dateKey.split("-").map(Number);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return `${ny}-${String(nm).padStart(2, "0")}-01`;
}

const fmt = (opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("es-PE", { timeZone: LIMA_TZ, ...opts });

/** "lun., 5 de octubre de 2026" */
export function formatLongDate(date: Date): string {
  return fmt({ weekday: "short", day: "numeric", month: "long", year: "numeric" }).format(date);
}

/** "05/10/2026" */
export function formatDate(date: Date): string {
  return fmt({ day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

/** "5 oct." */
export function formatShortDate(date: Date): string {
  return fmt({ day: "numeric", month: "short" }).format(date);
}

/** "15:00" */
export function formatTime(date: Date): string {
  return limaTimeKey(date);
}

/** "05/10/2026 15:00" */
export function formatDateTime(date: Date): string {
  return `${formatDate(date)} ${formatTime(date)}`;
}

/** "lunes 5 de octubre" — útil para mensajes de WhatsApp. */
export function formatFriendlyDate(date: Date): string {
  return fmt({ weekday: "long", day: "numeric", month: "long" }).format(date);
}

/** Edad en años cumplidos (birthDate guardada como @db.Date, medianoche UTC). */
export function ageFrom(birthDate: Date | null | undefined): number | null {
  if (!birthDate) return null;
  const today = todayKey();
  const b = birthDate.toISOString().slice(0, 10);
  let age = Number(today.slice(0, 4)) - Number(b.slice(0, 4));
  if (today.slice(5) < b.slice(5)) age--;
  return age;
}

/** Para campos @db.Date (sin hora): "YYYY-MM-DD" -> Date a medianoche UTC. */
export function dateOnlyFromKey(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00Z`);
}

/** Para campos @db.Date: Date -> "YYYY-MM-DD" (sin convertir zona horaria). */
export function dateOnlyToKey(date: Date | null | undefined): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

/** Días (redondeados hacia arriba) que faltan para una fecha; 0 o negativo si ya pasó. */
export function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / DAY_MS);
}
