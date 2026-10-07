import { z } from "zod";
import { addDaysKey, todayKey } from "@/lib/dates";
import { parseAmountToCents } from "@/lib/format";

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_CENTS = 10_000_000; // S/ 100 000
const METHODS = ["EFECTIVO", "YAPE", "PLIN", "TRANSFERENCIA", "TARJETA", "OTRO"] as const;

const text = (max: number) => z.string().max(max, { error: `Máximo ${max} caracteres.` }).optional();

/** "120.50" -> 12050 (céntimos). */
const amount = (requiredMessage: string, { allowZero = false } = {}) =>
  z
    .string({ error: requiredMessage })
    .transform((v, ctx) => {
      const cents = parseAmountToCents(v);
      if (cents === null) {
        ctx.addIssue({ code: "custom", message: "Ingresa un monto válido (ej. 120 o 120.50)." });
        return z.NEVER;
      }
      return cents;
    })
    .refine((c) => (allowZero ? c >= 0 : c > 0), { error: "El monto debe ser mayor a 0." })
    .refine((c) => c <= MAX_CENTS, { error: "El monto es demasiado alto." });

export const packageSchema = z
  .object({
    name: z
      .string({ error: "Ingresa el nombre del paquete." })
      .min(2, { error: "Ingresa el nombre del paquete." })
      .max(80, { error: "Máximo 80 caracteres." }),
    totalSessions: z.preprocess(
      (v) => (v === undefined ? undefined : Number(v)),
      z
        .number({ error: "Indica el número de sesiones." })
        .int({ error: "Debe ser un número entero." })
        .min(1, { error: "Mínimo 1 sesión." })
        .max(100, { error: "Máximo 100 sesiones." }),
    ),
    price: amount("Ingresa el precio del paquete.", { allowZero: true }),
    startDate: z
      .string()
      .regex(DATE_KEY, { error: "Fecha inválida." })
      .optional()
      .refine((v) => !v || v <= addDaysKey(todayKey(), 365), { error: "La fecha de inicio es demasiado lejana." }),
    notes: text(1000),
    payNow: z
      .string()
      .optional()
      .transform((v) => v === "on"),
    initialAmount: z.string().optional(),
    initialMethod: z.enum(METHODS, { error: "Elige el método de pago." }).optional(),
    initialReference: text(60),
  })
  .superRefine((d, ctx) => {
    if (!d.payNow) return;
    const cents = parseAmountToCents(d.initialAmount);
    if (cents === null || cents <= 0) {
      ctx.addIssue({ code: "custom", path: ["initialAmount"], message: "Ingresa el monto pagado." });
    } else if (cents > d.price) {
      ctx.addIssue({ code: "custom", path: ["initialAmount"], message: "El pago inicial no puede superar el precio." });
    }
    if (!d.initialMethod) ctx.addIssue({ code: "custom", path: ["initialMethod"], message: "Elige el método de pago." });
  });

export const paymentSchema = z.object({
  packageId: z.string({ error: "Elige el paquete." }).min(1, { error: "Elige el paquete." }).max(40),
  amount: amount("Ingresa el monto pagado."),
  method: z.enum(METHODS, { error: "Elige el método de pago." }),
  paidAt: z
    .string()
    .regex(DATE_KEY, { error: "Fecha inválida." })
    .optional()
    .refine((v) => !v || v <= todayKey(), { error: "La fecha de pago no puede ser futura." }),
  reference: text(60),
  notes: text(500),
  confirmOverpay: z
    .string()
    .optional()
    .transform((v) => v === "on"),
});
