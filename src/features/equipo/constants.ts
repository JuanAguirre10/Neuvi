// Constantes compartidas por Equipo y Mi perfil (sin dependencias de servidor).

/** Colores de agenda: tonos del logo + algunos suaves que combinan, para distinguir profesionales. */
export const CALENDAR_COLORS = [
  { value: "#4C8DD7", label: "Azul" },
  { value: "#39B6AF", label: "Turquesa" },
  { value: "#344E6D", label: "Azul marino" },
  { value: "#7AADE6", label: "Celeste" },
  { value: "#1E8A84", label: "Verde azulado" },
  { value: "#E5A13A", label: "Ámbar" },
  { value: "#8B7BC8", label: "Lavanda" },
  { value: "#D9738C", label: "Rosa" },
] as const;

export const DEFAULT_CALENDAR_COLOR = "#4C8DD7";

export const ROLE_DESCRIPTION = {
  ADMIN: "Gestiona todo: agenda, pacientes, caja, reportes, equipo y configuración.",
  PSICOLOGO: "Ve solo su agenda y sus pacientes, y es el único que accede a su historia clínica.",
  RECEPCION: "Gestiona la agenda, los pacientes (datos administrativos), paquetes y pagos. No ve historia clínica.",
} as const;
