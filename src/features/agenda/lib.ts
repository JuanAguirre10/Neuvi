// Helpers puros de la agenda. Se usan tanto en el servidor como en componentes cliente,
// así que aquí no puede haber acceso a BD ni imports "server-only".
import type { AppointmentStatus } from "@prisma/client";
import { limaDateKey, limaTimeKey, startOfLimaDay } from "@/lib/dates";

/** Alto de una hora en la grilla (px). */
export const HOUR_PX = 56;
export const PX_PER_MIN = HOUR_PX / 60;
/** Alto mínimo de un bloque para que siempre se pueda leer y tocar. */
export const MIN_BLOCK_PX = 22;
export const DEFAULT_START_HOUR = 7;
export const DEFAULT_END_HOUR = 21;
export const SLOT_MINUTES = 15;
export const DEFAULT_CALENDAR_COLOR = "#4C8DD7";

export type AgendaView = "semana" | "dia";

/** Estado de la agenda que vive en la URL. */
export type AgendaQuery = {
  fecha: string;
  vista: AgendaView;
  /** Id del profesional o "todos". */
  profesional: string;
  canceladas: boolean;
};

export function agendaHref(q: AgendaQuery, extra?: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  sp.set("fecha", q.fecha);
  if (q.vista !== "semana") sp.set("vista", q.vista);
  if (q.profesional && q.profesional !== "todos") sp.set("profesional", q.profesional);
  if (q.canceladas) sp.set("canceladas", "1");
  for (const [key, value] of Object.entries(extra ?? {})) {
    if (value) sp.set(key, value);
  }
  return `/app/agenda?${sp.toString()}`;
}

/** Valida un "YYYY-MM-DD" que exista en el calendario (rechaza 2026-02-30). */
export function parseDateKey(value: string | null | undefined): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = startOfLimaDay(value);
  if (Number.isNaN(date.getTime())) return null;
  return limaDateKey(date) === value ? value : null;
}

export function isValidTime(value: string | null | undefined): value is string {
  return !!value && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** 930 -> "15:30". Valores >= 24 h se muestran tal cual (p. ej. "24:15"). */
export function minutesToTime(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Minutos transcurridos del día actual en Lima. Solo llamar fuera del render (efectos, servidor). */
export function currentLimaMinutes(): number {
  return timeToMinutes(limaTimeKey(new Date()));
}

/** Horarios de inicio disponibles en el formulario (pasos de 15 min). */
export function timeSlots(fromHour = 6, toHour = 22, step = SLOT_MINUTES): string[] {
  const out: string[] = [];
  for (let m = fromHour * 60; m <= toHour * 60 + 45; m += step) out.push(minutesToTime(m));
  return out;
}

/** Color hex seguro (evita inyectar CSS arbitrario desde la BD). */
export function safeColor(color: string | null | undefined): string {
  return color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : DEFAULT_CALENDAR_COLOR;
}

/** Fondo tenue a partir del color del profesional. */
export function tint(color: string, percent = 14): string {
  return `color-mix(in srgb, ${color} ${percent}%, var(--card))`;
}

export type LaneItem = { startMin: number; endMin: number };
export type Positioned<T> = { item: T; lane: number; lanes: number };

/**
 * Reparte citas que se solapan en carriles lado a lado (como Google Calendar).
 * Cada grupo de citas encadenadas por solapamiento comparte el mismo número de carriles.
 */
export function layoutLanes<T extends LaneItem>(items: T[]): Positioned<T>[] {
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);
  const out: Positioned<T>[] = [];
  let cluster: Positioned<T>[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -1;

  const flush = () => {
    for (const p of cluster) p.lanes = laneEnds.length;
    cluster = [];
    laneEnds = [];
    clusterEnd = -1;
  };

  for (const item of sorted) {
    if (cluster.length > 0 && item.startMin >= clusterEnd) flush();
    let lane = laneEnds.findIndex((end) => end <= item.startMin);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(item.endMin);
    } else {
      laneEnds[lane] = item.endMin;
    }
    const positioned: Positioned<T> = { item, lane, lanes: 1 };
    cluster.push(positioned);
    out.push(positioned);
    clusterEnd = Math.max(clusterEnd, item.endMin);
  }
  flush();
  return out;
}

// ---------- Estados de la cita ----------

/** Transiciones permitidas (la UI y el servidor usan la misma tabla). */
export const STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  PROGRAMADA: ["CONFIRMADA", "ATENDIDA", "NO_ASISTIO", "CANCELADA"],
  CONFIRMADA: ["ATENDIDA", "NO_ASISTIO", "CANCELADA"],
  // "Deshacer" por si se marcó por error.
  ATENDIDA: ["PROGRAMADA"],
  NO_ASISTIO: ["PROGRAMADA"],
  // "Reactivar" una cita cancelada (vuelve a validar cruces).
  CANCELADA: ["PROGRAMADA"],
};

export const EDITABLE_STATUSES: AppointmentStatus[] = ["PROGRAMADA", "CONFIRMADA"];

export function canTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return STATUS_TRANSITIONS[from].includes(to);
}

/** Motivos rápidos al cancelar. */
export const CANCEL_REASONS = [
  "El paciente canceló",
  "El profesional no está disponible",
  "Se reprogramará",
  "Emergencia / fuerza mayor",
];

// ---------- Búsqueda ----------

/** Minúsculas sin tildes, para buscar "jose" y encontrar "José". */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}
