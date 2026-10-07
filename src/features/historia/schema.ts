import { z } from "zod";
import { todayKey } from "@/lib/dates";

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const RISK = ["NINGUNO", "BAJO", "MODERADO", "ALTO"] as const;

const text = (max: number) => z.string().max(max, { error: `Máximo ${max} caracteres.` }).optional();

const pastDate = (requiredMessage?: string) => {
  const base = requiredMessage ? z.string({ error: requiredMessage }) : z.string();
  return base
    .regex(DATE_KEY, { error: "Fecha inválida." })
    .refine((v) => v <= todayKey(), { error: "La fecha no puede ser futura." })
    .refine((v) => v >= "2000-01-01", { error: "Revisa el año." });
};

export const clinicalRecordSchema = z.object({
  consultationReason: text(4000),
  currentProblemHistory: text(8000),
  personalHistory: text(8000),
  previousTreatments: text(4000),
  familyHistory: text(4000),
  currentMedication: text(2000),
  substanceUse: text(2000),
  mentalStatusExam: text(8000),
  diagnosticImpression: text(4000),
  diagnosisCode: text(40),
  treatmentGoals: text(4000),
  treatmentPlan: text(8000),
  riskLevel: z.enum(RISK, { error: "Elige el nivel de riesgo." }).default("NINGUNO"),
  riskNotes: text(4000),
  informedConsent: z
    .string()
    .optional()
    .transform((v) => v === "on"),
  informedConsentDate: pastDate().optional(),
});

export type ClinicalRecordInput = z.infer<typeof clinicalRecordSchema>;

export const sessionNoteSchema = z.object({
  sessionDate: pastDate("Indica la fecha de la sesión."),
  sessionNumber: z.preprocess(
    (v) => (v === undefined || v === "" ? undefined : Number(v)),
    z
      .number({ error: "Ingresa un número válido." })
      .int({ error: "Ingresa un número entero." })
      .min(1, { error: "Debe ser mayor a 0." })
      .max(999, { error: "Número demasiado alto." })
      .optional(),
  ),
  modality: z.enum(["PRESENCIAL", "VIRTUAL"], { error: "Elige la modalidad." }).default("PRESENCIAL"),
  moodObserved: text(2000),
  topics: text(4000),
  development: z
    .string({ error: "Describe el desarrollo de la sesión." })
    .min(1, { error: "Describe el desarrollo de la sesión." })
    .max(10000, { error: "Máximo 10000 caracteres." }),
  interventions: text(4000),
  homework: text(4000),
  nextSessionPlan: text(4000),
  riskLevel: z.enum(RISK, { error: "Elige el nivel de riesgo." }).default("NINGUNO"),
  appointmentId: z.string().max(40).optional(),
});

export type SessionNoteInput = z.infer<typeof sessionNoteSchema>;
