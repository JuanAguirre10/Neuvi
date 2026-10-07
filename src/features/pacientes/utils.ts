// Utilidades del módulo de pacientes (sin dependencias de servidor: usables en cliente y servidor).
import { ageFrom, dateOnlyFromKey } from "@/lib/dates";

/** searchParams pueden venir repetidos (?a=1&a=2): nos quedamos con el primero. */
export function firstParam(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  const trimmed = v?.trim();
  return trimmed ? trimmed : undefined;
}

export const PATIENT_TABS = ["resumen", "historia", "paquetes", "citas"] as const;
export type PatientTab = (typeof PATIENT_TABS)[number];

export function parsePatientTab(value: string | undefined): PatientTab {
  return (PATIENT_TABS as readonly string[]).includes(value ?? "") ? (value as PatientTab) : "resumen";
}

/** URL de la ficha del paciente con pestaña y parámetros opcionales. */
export function patientHref(id: string, params?: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) if (v) sp.set(k, v);
  const qs = sp.toString();
  return `/app/pacientes/${id}${qs ? `?${qs}` : ""}`;
}

export function isMinor(birthDate: Date | null | undefined): boolean {
  const age = ageFrom(birthDate);
  return age !== null && age < 18;
}

/** Edad a partir del valor de un <input type="date"> ("YYYY-MM-DD"). */
export function ageFromKey(dateKey: string | undefined): number | null {
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  const age = ageFrom(dateOnlyFromKey(dateKey));
  return age !== null && age >= 0 ? age : null;
}

/** Igual que isMinor pero a partir del valor de un <input type="date">. */
export function isMinorFromKey(dateKey: string | undefined): boolean {
  const age = ageFromKey(dateKey);
  return age !== null && age < 18;
}

/** Campos @db.Date (medianoche UTC): "DD/MM/YYYY" sin convertir zona horaria. */
export function formatDateOnly(date: Date | null | undefined): string {
  if (!date) return "";
  const [y, m, d] = date.toISOString().slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

const DOC_SHORT: Record<string, string> = { DNI: "DNI", CE: "CE", PASAPORTE: "Pasaporte", OTRO: "Doc." };

/** "DNI 12345678" o null si no tiene documento. */
export function documentLabel(p: { documentType: string; documentNumber: string | null }): string | null {
  return p.documentNumber ? `${DOC_SHORT[p.documentType] ?? "Doc."} ${p.documentNumber}` : null;
}

/** "1 sesión" / "3 sesiones" */
export function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}
