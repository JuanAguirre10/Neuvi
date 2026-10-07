import { z } from "zod";
import { todayKey } from "@/lib/dates";
import { normalizePeruPhone } from "@/lib/whatsapp";
import { NONE } from "./options";

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Los selects de Radix usan "none" como "sin valor". */
const noneToUndefined = (v: unknown) => (v === NONE || v === "" ? undefined : v);

const text = (max: number) => z.string().max(max, { error: `Máximo ${max} caracteres.` }).optional();

const phone = z
  .string()
  .max(20, { error: "Número demasiado largo." })
  .optional()
  .refine((v) => !v || normalizePeruPhone(v) !== null, {
    error: "Ingresa un celular válido: 9 dígitos (987 654 321) o con código de país.",
  });

export const patientSchema = z
  .object({
    firstName: z
      .string({ error: "Ingresa los nombres." })
      .min(1, { error: "Ingresa los nombres." })
      .max(80, { error: "Máximo 80 caracteres." }),
    lastName: z
      .string({ error: "Ingresa los apellidos." })
      .min(1, { error: "Ingresa los apellidos." })
      .max(80, { error: "Máximo 80 caracteres." }),
    documentType: z.enum(["DNI", "CE", "PASAPORTE", "OTRO"], { error: "Elige un tipo de documento." }).default("DNI"),
    documentNumber: z
      .string()
      .max(20, { error: "Máximo 20 caracteres." })
      .optional()
      .transform((v) => (v ? v.replace(/[\s.-]/g, "").toUpperCase() : undefined)),
    birthDate: z
      .string()
      .regex(DATE_KEY, { error: "Fecha inválida." })
      .optional()
      .refine((v) => !v || v <= todayKey(), { error: "La fecha de nacimiento no puede ser futura." })
      .refine((v) => !v || v >= "1900-01-01", { error: "Revisa el año de nacimiento." }),
    sex: z.preprocess(
      noneToUndefined,
      z.enum(["FEMENINO", "MASCULINO", "OTRO", "NO_ESPECIFICA"], { error: "Opción inválida." }).optional(),
    ),
    maritalStatus: z.preprocess(noneToUndefined, text(40)),
    educationLevel: z.preprocess(noneToUndefined, text(40)),
    occupation: text(80),
    phone,
    email: z.email({ error: "Ingresa un correo válido." }).max(120).optional(),
    address: text(160),
    district: text(80),
    guardianName: text(120),
    guardianRelationship: text(40),
    guardianPhone: phone,
    emergencyContactName: text(120),
    emergencyContactRelationship: text(40),
    emergencyContactPhone: phone,
    referralSource: text(80),
    professionalId: z.preprocess(noneToUndefined, z.string().max(40).optional()),
    status: z.enum(["ACTIVO", "EN_PAUSA", "ALTA", "ABANDONO"], { error: "Elige un estado." }).default("ACTIVO"),
    adminNotes: text(2000),
  })
  .superRefine((d, ctx) => {
    if (!d.documentNumber) return;
    const rules: Record<string, { re: RegExp; message: string }> = {
      DNI: { re: /^\d{8}$/, message: "El DNI debe tener 8 dígitos." },
      CE: { re: /^[A-Z0-9]{8,12}$/, message: "El carné de extranjería debe tener entre 8 y 12 caracteres." },
      PASAPORTE: { re: /^[A-Z0-9]{6,12}$/, message: "El pasaporte debe tener entre 6 y 12 letras o números." },
    };
    const rule = rules[d.documentType];
    if (rule && !rule.re.test(d.documentNumber)) {
      ctx.addIssue({ code: "custom", path: ["documentNumber"], message: rule.message });
    }
  });

export type PatientInput = z.infer<typeof patientSchema>;

/** Deja solo dígitos y el "+" inicial: "987 654 321" -> "987654321". */
export function cleanPhone(value: string | undefined): string | null {
  if (!value) return null;
  const cleaned = value.replace(/[^\d+]/g, "");
  return cleaned || null;
}
