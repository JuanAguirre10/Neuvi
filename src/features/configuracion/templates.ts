// Plantillas de WhatsApp: variables permitidas y datos de ejemplo para la vista previa.
// (Las plantillas por defecto viven en @/lib/whatsapp.)

export const TEMPLATE_MAX_LENGTH = 1000;

export const REMINDER_VARIABLES = [
  { key: "paciente", label: "Nombre del paciente" },
  { key: "fecha", label: "Fecha de la cita" },
  { key: "hora", label: "Hora de la cita" },
  { key: "profesional", label: "Psicólogo(a)" },
  { key: "centro", label: "Tu consultorio o centro" },
] as const;

export const RENEWAL_VARIABLES = [
  { key: "paciente", label: "Nombre del paciente" },
  { key: "restantes", label: "Sesiones restantes" },
  { key: "profesional", label: "Psicólogo(a)" },
  { key: "centro", label: "Tu consultorio o centro" },
] as const;

/** Variables usadas en el texto que no están permitidas, p. ej. ["{telefono}"]. */
export function unknownVariables(template: string, allowed: readonly { key: string }[]): string[] {
  const keys = new Set(allowed.map((v) => v.key));
  const found = template.match(/\{(\w+)\}/g) ?? [];
  return [...new Set(found.filter((token) => !keys.has(token.slice(1, -1))))];
}

export function sampleVars(orgName: string) {
  return {
    paciente: "María",
    fecha: "lunes 5 de octubre",
    hora: "15:00",
    profesional: "la Ps. Andrea Salas",
    centro: orgName,
    restantes: 1,
  };
}
