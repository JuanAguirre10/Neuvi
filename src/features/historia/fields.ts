// Estructura de la ficha de ingreso y de la nota de evolución (compartida por la vista y el formulario).
import { Brain, ClipboardList, Goal, History, MessageSquareText, type LucideIcon } from "lucide-react";

export type RecordTextField =
  | "consultationReason"
  | "currentProblemHistory"
  | "personalHistory"
  | "previousTreatments"
  | "familyHistory"
  | "currentMedication"
  | "substanceUse"
  | "mentalStatusExam"
  | "diagnosticImpression"
  | "diagnosisCode"
  | "treatmentGoals"
  | "treatmentPlan";

export type RecordSection = {
  id: string;
  title: string;
  icon: LucideIcon;
  fields: { name: RecordTextField; label: string; placeholder?: string; rows?: number; short?: boolean }[];
};

export const RECORD_SECTIONS: RecordSection[] = [
  {
    id: "motivo",
    title: "Motivo y problema actual",
    icon: MessageSquareText,
    fields: [
      { name: "consultationReason", label: "Motivo de consulta", placeholder: "En palabras del paciente.", rows: 3 },
      {
        name: "currentProblemHistory",
        label: "Historia del problema actual",
        placeholder: "Inicio, evolución, desencadenantes, factores que lo mantienen.",
        rows: 4,
      },
    ],
  },
  {
    id: "antecedentes",
    title: "Antecedentes",
    icon: History,
    fields: [
      {
        name: "personalHistory",
        label: "Antecedentes personales",
        placeholder: "Médicos, psiquiátricos, hospitalizaciones, desarrollo.",
        rows: 3,
      },
      { name: "previousTreatments", label: "Tratamientos previos", placeholder: "Psicológicos o psiquiátricos.", rows: 2 },
      { name: "familyHistory", label: "Antecedentes familiares", rows: 2 },
      { name: "currentMedication", label: "Medicación actual", rows: 2 },
      { name: "substanceUse", label: "Consumo de sustancias", placeholder: "Alcohol, tabaco, otras.", rows: 2 },
    ],
  },
  {
    id: "examen",
    title: "Examen mental",
    icon: Brain,
    fields: [
      {
        name: "mentalStatusExam",
        label: "Examen mental",
        placeholder: "Apariencia, conducta, ánimo, afecto, pensamiento, percepción, orientación, juicio.",
        rows: 4,
      },
    ],
  },
  {
    id: "diagnostico",
    title: "Diagnóstico",
    icon: ClipboardList,
    fields: [
      { name: "diagnosticImpression", label: "Impresión diagnóstica", rows: 3 },
      { name: "diagnosisCode", label: "Código CIE-10 / DSM-5 (opcional)", placeholder: "Ej. F41.1", short: true },
    ],
  },
  {
    id: "plan",
    title: "Plan terapéutico",
    icon: Goal,
    fields: [
      { name: "treatmentGoals", label: "Objetivos terapéuticos", rows: 3 },
      { name: "treatmentPlan", label: "Enfoque y plan de intervención", rows: 3 },
    ],
  },
];

export type NoteTextField = "moodObserved" | "topics" | "development" | "interventions" | "homework" | "nextSessionPlan";

export const NOTE_FIELDS: { name: NoteTextField; label: string; placeholder?: string; rows: number; required?: boolean }[] = [
  { name: "moodObserved", label: "Estado emocional observado", rows: 2 },
  { name: "topics", label: "Temas abordados", rows: 2 },
  {
    name: "development",
    label: "Desarrollo de la sesión",
    placeholder: "Qué ocurrió en la sesión, observaciones relevantes, respuesta del paciente.",
    rows: 5,
    required: true,
  },
  { name: "interventions", label: "Técnicas / intervenciones", rows: 2 },
  { name: "homework", label: "Tareas asignadas", rows: 2 },
  { name: "nextSessionPlan", label: "Plan para la próxima sesión", rows: 2 },
];

export const RISK_LEVELS = ["NINGUNO", "BAJO", "MODERADO", "ALTO"] as const;
export type RiskLevelValue = (typeof RISK_LEVELS)[number];

export const RISK_SHORT_LABEL: Record<RiskLevelValue, string> = {
  NINGUNO: "Ninguno",
  BAJO: "Bajo",
  MODERADO: "Moderado",
  ALTO: "Alto",
};

export type RecordFormValues = Record<RecordTextField, string> & {
  riskLevel: RiskLevelValue;
  riskNotes: string;
  informedConsent: boolean;
  informedConsentDate: string;
};

export type NoteFormValues = Record<NoteTextField, string> & {
  sessionDate: string;
  sessionNumber: string;
  modality: "PRESENCIAL" | "VIRTUAL";
  riskLevel: RiskLevelValue;
  appointmentId: string;
};
