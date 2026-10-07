// Opciones de los selects de la ficha del paciente (texto libre en la BD, opciones sugeridas en la UI).

export const MARITAL_STATUS_OPTIONS = [
  "Soltero(a)",
  "Casado(a)",
  "Conviviente",
  "Separado(a)",
  "Divorciado(a)",
  "Viudo(a)",
] as const;

export const EDUCATION_LEVEL_OPTIONS = [
  "Sin estudios",
  "Inicial",
  "Primaria",
  "Secundaria",
  "Técnico superior",
  "Universitario",
  "Posgrado",
] as const;

/** Sugerencias para "¿Cómo nos conoció?" (el campo acepta texto libre). */
export const REFERRAL_SOURCE_SUGGESTIONS = [
  "Recomendación de un familiar o amigo",
  "Derivado por otro profesional",
  "Instagram",
  "Facebook",
  "TikTok",
  "Google / Internet",
  "Convenio / empresa",
  "Colegio o universidad",
] as const;

export const RELATIONSHIP_SUGGESTIONS = [
  "Madre",
  "Padre",
  "Hermano(a)",
  "Pareja",
  "Hijo(a)",
  "Abuelo(a)",
  "Tío(a)",
  "Tutor(a) legal",
  "Amigo(a)",
] as const;

/** Sentinel para "sin valor" en Radix Select (no admite value=""). */
export const NONE = "none";
