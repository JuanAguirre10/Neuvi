import type {
  AppointmentStatus,
  DocumentType,
  Modality,
  PackageStatus,
  PatientStatus,
  PaymentMethod,
  Plan,
  RiskLevel,
  Role,
  Sex,
  OrgType,
} from "@prisma/client";

// ---------- Dinero (siempre en céntimos) ----------

const pen = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });

/** 12050 -> "S/ 120.50" */
export function formatPEN(cents: number): string {
  return pen.format(cents / 100);
}

/** "120.50" | "120,50" | "120" -> 12050. Devuelve null si no es un monto válido. */
export function parseAmountToCents(value: FormDataEntryValue | string | null | undefined): number | null {
  if (value == null) return null;
  const normalized = String(value).trim().replace(/\s/g, "").replace("S/", "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(parseFloat(normalized) * 100);
}

/** 12050 -> "120.50" (para prellenar inputs). */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

// ---------- Personas ----------

export function fullName(p: { firstName: string; lastName: string }): string {
  return `${p.firstName} ${p.lastName}`.trim();
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

// ---------- Etiquetas en español para los enums ----------

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrador",
  PSICOLOGO: "Psicólogo(a)",
  RECEPCION: "Recepción",
};

export const ORG_TYPE_LABEL: Record<OrgType, string> = {
  INDIVIDUAL: "Psicólogo independiente",
  CENTRO: "Centro psicológico",
};

export const PLAN_LABEL: Record<Plan, string> = {
  PRUEBA: "Prueba gratuita",
  INDIVIDUAL: "Plan Individual",
  CENTRO: "Plan Centro Psicológico",
};

export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  PROGRAMADA: "Programada",
  CONFIRMADA: "Confirmada",
  ATENDIDA: "Atendida",
  NO_ASISTIO: "No asistió",
  CANCELADA: "Cancelada",
};

export const MODALITY_LABEL: Record<Modality, string> = {
  PRESENCIAL: "Presencial",
  VIRTUAL: "Virtual",
};

export const PACKAGE_STATUS_LABEL: Record<PackageStatus, string> = {
  ACTIVO: "Activo",
  COMPLETADO: "Completado",
  CANCELADO: "Cancelado",
};

export const PATIENT_STATUS_LABEL: Record<PatientStatus, string> = {
  ACTIVO: "Activo",
  EN_PAUSA: "En pausa",
  ALTA: "Alta",
  ABANDONO: "Abandono",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  EFECTIVO: "Efectivo",
  YAPE: "Yape",
  PLIN: "Plin",
  TRANSFERENCIA: "Transferencia",
  TARJETA: "Tarjeta",
  OTRO: "Otro",
};

export const RISK_LEVEL_LABEL: Record<RiskLevel, string> = {
  NINGUNO: "Sin riesgo identificado",
  BAJO: "Riesgo bajo",
  MODERADO: "Riesgo moderado",
  ALTO: "Riesgo alto",
};

export const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  DNI: "DNI",
  CE: "Carné de extranjería",
  PASAPORTE: "Pasaporte",
  OTRO: "Otro",
};

export const SEX_LABEL: Record<Sex, string> = {
  FEMENINO: "Femenino",
  MASCULINO: "Masculino",
  OTRO: "Otro",
  NO_ESPECIFICA: "Prefiere no decir",
};

/** Convierte un Record de etiquetas en opciones para <Select>. */
export function toOptions<T extends string>(labels: Record<T, string>): { value: T; label: string }[] {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}
