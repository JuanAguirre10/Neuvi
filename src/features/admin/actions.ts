"use server";

import type { Prisma, SubscriptionPlan } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { can } from "@/lib/platform-auth/permissions";
import { type ActionState, formToObject, fromZodError } from "@/lib/action-state";
import { BILLING_CYCLE_LABEL, SUBSCRIPTION_STATUS_LABEL, formatPEN, parseAmountToCents } from "@/lib/format";
import { addDaysKey, dateOnlyFromKey, dateOnlyToKey, formatDate, formatDateOnly, fromLimaLocal, todayKey } from "@/lib/dates";
import { ActionError, DENIED, authorize, isUniqueViolation, revalidateAccounts, runAction } from "./guard";
import {
  effectiveMonthlyPrice,
  formatInvoiceNumber,
  invoiceSequence,
  invoiceTotal,
  orgTypeForPlan,
  trialExtensionBase,
} from "./billing";
import { getNextInvoiceDraft, invoiceDraftSubscriptionSelect } from "./queries";

// Acciones sobre cuentas, facturación y notas de /admin. Cada una:
//   1) autoriza por capacidad del rol (src/lib/platform-auth/permissions.ts),
//   2) valida y escribe dentro de una transacción, junto con su SubscriptionEvent (con actorId),
//   3) revalida las pantallas de /admin afectadas.
// Facturas, pagos y notas guardan a su autor en su propia tabla (createdById / registeredById / authorId):
// SubscriptionEventType no tiene tipos para ellos.

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_CENTS = 100_000_000; // S/ 1 000 000
const PAYMENT_METHODS = ["EFECTIVO", "YAPE", "PLIN", "TRANSFERENCIA", "TARJETA", "OTRO"] as const;

const NOT_FOUND: ActionState = { ok: false, message: "No encontramos la cuenta." };

function validId(id: unknown): id is string {
  return typeof id === "string" && id.length > 0 && id.length <= 40;
}

/** Monto opcional en soles -> céntimos (vacío = null). */
const optionalAmount = z
  .string()
  .optional()
  .transform((v, ctx) => {
    if (v === undefined) return null;
    const cents = parseAmountToCents(v);
    if (cents === null) {
      ctx.addIssue({ code: "custom", message: "Ingresa un monto válido (ej. 80 o 79.90)." });
      return z.NEVER;
    }
    if (cents > MAX_CENTS) {
      ctx.addIssue({ code: "custom", message: "El monto es demasiado alto." });
      return z.NEVER;
    }
    return cents;
  });

const requiredAmount = z
  .string({ error: "Ingresa el monto." })
  .transform((v, ctx) => {
    const cents = parseAmountToCents(v);
    if (cents === null) {
      ctx.addIssue({ code: "custom", message: "Ingresa un monto válido (ej. 80 o 79.90)." });
      return z.NEVER;
    }
    return cents;
  })
  .refine((c) => c > 0, { error: "El monto debe ser mayor a 0." })
  .refine((c) => c <= MAX_CENTS, { error: "El monto es demasiado alto." });

const reason = z
  .string({ error: "Indica el motivo." })
  .min(5, { error: "Describe el motivo (mínimo 5 caracteres)." })
  .max(300, { error: "Máximo 300 caracteres." });

const optionalText = (max: number) => z.string().max(max, { error: `Máximo ${max} caracteres.` }).optional();

const cycle = z.enum(["MENSUAL", "ANUAL"], { error: "Elige el ciclo de facturación." });

type PlanPricing = Pick<SubscriptionPlan, "listPriceCents" | "perProfessional">;

/** "S/ 70.00 por psicólogo al mes", "Precio de lista (S/ 60.00)" o "Precio por definir". */
function describePrice(priceCents: number | null, plan: PlanPricing): string {
  if (priceCents == null) {
    return plan.listPriceCents == null ? "Precio por definir" : `Precio de lista (${formatPEN(plan.listPriceCents)})`;
  }
  return `${formatPEN(priceCents)}${plan.perProfessional ? " por psicólogo" : ""} al mes`;
}

const subscriptionSelect = {
  id: true,
  status: true,
  planCode: true,
  billingCycle: true,
  priceCents: true,
  trialEndsAt: true,
  plan: { select: { code: true, name: true, listPriceCents: true, perProfessional: true, maxProfessionals: true } },
} satisfies Prisma.SubscriptionSelect;

async function findSubscription(tx: Prisma.TransactionClient, orgId: string) {
  const sub = await tx.subscription.findUnique({ where: { organizationId: orgId }, select: subscriptionSelect });
  if (!sub) throw new ActionError(NOT_FOUND.message!);
  return sub;
}

// ---------------------------------------------------------------------------
// Plan: activar (desde prueba) o cambiar
// ---------------------------------------------------------------------------

const planSchema = z.object({
  planCode: z.enum(["INDIVIDUAL", "CENTRO"], { error: "Elige un plan." }),
  price: optionalAmount,
  billingCycle: cycle,
});

export async function savePlanAction(orgId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await authorize("subscription");
  if (!admin) return DENIED;
  if (!validId(orgId)) return NOT_FOUND;
  const parsed = planSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const data = parsed.data;

  return runAction(async () => {
    const message = await db.$transaction(async (tx) => {
      const sub = await findSubscription(tx, orgId);
      if (sub.status === "SUSPENDIDA" || sub.status === "CANCELADA") {
        throw new ActionError("Reactiva la cuenta antes de cambiar su plan.");
      }
      const activating = sub.status === "PRUEBA";
      const target = await tx.subscriptionPlan.findUnique({ where: { code: data.planCode } });
      if (!target || (!target.active && target.code !== sub.planCode)) {
        throw new ActionError("Ese plan no está disponible.", { planCode: ["Elige otro plan."] });
      }
      if (!activating && target.code === sub.planCode) {
        throw new ActionError("La cuenta ya tiene ese plan.", {
          planCode: ["Para cambiar solo el precio o el ciclo usa “Precio y ciclo”."],
        });
      }

      // Bajar de plan: no puede quedar con más profesionales activos de los que admite.
      const professionals = await tx.user.count({ where: { organizationId: orgId, active: true, isProfessional: true } });
      if (target.maxProfessionals != null && professionals > target.maxProfessionals) {
        throw new ActionError(
          `La cuenta tiene ${professionals} psicólogos activos y el ${target.name} admite ${target.maxProfessionals}. ` +
            "Primero el centro debe desactivar profesionales desde su Equipo.",
          { planCode: ["Excede el máximo de profesionales del plan."] },
        );
      }
      if (data.price == null && target.listPriceCents == null) {
        throw new ActionError("Este plan aún no tiene precio de lista.", {
          price: ["Ingresa el precio pactado con la cuenta."],
        });
      }

      await tx.subscription.update({
        where: { id: sub.id },
        data: { planCode: target.code, status: "ACTIVA", priceCents: data.price, billingCycle: data.billingCycle },
      });
      // Las funciones del consultorio dependen de org.type: sigue al plan.
      await tx.organization.update({ where: { id: orgId }, data: { type: orgTypeForPlan(target.code) } });
      await tx.subscriptionEvent.create({
        data: {
          subscriptionId: sub.id,
          type: activating ? "PLAN_ACTIVADO" : "PLAN_CAMBIADO",
          fromPlan: sub.planCode,
          toPlan: target.code,
          detail: `${describePrice(data.price, target)} · ${BILLING_CYCLE_LABEL[data.billingCycle]}`,
          actorId: admin.id,
        },
      });
      return activating ? `Plan activado: ${target.name}.` : `Plan cambiado a ${target.name}.`;
    });
    revalidateAccounts(orgId);
    return { ok: true, message };
  });
}

// ---------------------------------------------------------------------------
// Precio pactado y ciclo
// ---------------------------------------------------------------------------

const priceSchema = z.object({ price: optionalAmount, billingCycle: cycle });

export async function updatePriceAction(orgId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await authorize("subscription");
  if (!admin) return DENIED;
  if (!validId(orgId)) return NOT_FOUND;
  const parsed = priceSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const data = parsed.data;

  return runAction(async () => {
    await db.$transaction(async (tx) => {
      const sub = await findSubscription(tx, orgId);
      if (sub.status === "CANCELADA") throw new ActionError("La cuenta está cancelada.");
      const priceChanged = sub.priceCents !== data.price;
      const cycleChanged = sub.billingCycle !== data.billingCycle;
      if (!priceChanged && !cycleChanged) throw new ActionError("No hay cambios que guardar.");
      if (sub.status === "ACTIVA" && effectiveMonthlyPrice(data.price, sub.plan) == null) {
        throw new ActionError("El plan no tiene precio de lista.", { price: ["Ingresa el precio pactado."] });
      }

      const changes: string[] = [];
      if (priceChanged) changes.push(`Precio: ${describePrice(sub.priceCents, sub.plan)} → ${describePrice(data.price, sub.plan)}`);
      if (cycleChanged) {
        changes.push(`Ciclo: ${BILLING_CYCLE_LABEL[sub.billingCycle]} → ${BILLING_CYCLE_LABEL[data.billingCycle]}`);
      }
      await tx.subscription.update({
        where: { id: sub.id },
        data: { priceCents: data.price, billingCycle: data.billingCycle },
      });
      await tx.subscriptionEvent.create({
        data: { subscriptionId: sub.id, type: "PRECIO_ACTUALIZADO", detail: changes.join(" · "), actorId: admin.id },
      });
    });
    revalidateAccounts(orgId);
    return { ok: true, message: "Precio y ciclo actualizados." };
  });
}

// ---------------------------------------------------------------------------
// Extender la prueba
// ---------------------------------------------------------------------------

const trialSchema = z.object({
  days: z.preprocess(
    (v) => (v === undefined ? undefined : Number(v)),
    z
      .number({ error: "Indica cuántos días." })
      .int({ error: "Debe ser un número entero." })
      .min(1, { error: "Mínimo 1 día." })
      .max(90, { error: "Máximo 90 días por extensión." }),
  ),
  note: optionalText(300),
});

export async function extendTrialAction(orgId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await authorize("trial");
  if (!admin) return DENIED;
  if (!validId(orgId)) return NOT_FOUND;
  const parsed = trialSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const { days, note } = parsed.data;

  return runAction(async () => {
    const newEnd = await db.$transaction(async (tx) => {
      const sub = await findSubscription(tx, orgId);
      if (sub.status !== "PRUEBA") throw new ActionError("Solo se puede extender la prueba de una cuenta en prueba.");
      // Si la prueba ya venció, los días se cuentan desde hoy.
      const trialEndsAt = new Date(trialExtensionBase(sub.trialEndsAt).getTime() + days * DAY_MS);
      await tx.subscription.update({ where: { id: sub.id }, data: { trialEndsAt } });
      await tx.subscriptionEvent.create({
        data: {
          subscriptionId: sub.id,
          type: "PRUEBA_EXTENDIDA",
          detail: [`+${days} día${days === 1 ? "" : "s"}, hasta el ${formatDate(trialEndsAt)}`, note].filter(Boolean).join(" · "),
          actorId: admin.id,
        },
      });
      return trialEndsAt;
    });
    revalidateAccounts(orgId);
    return { ok: true, message: `Prueba extendida hasta el ${formatDate(newEnd)}.` };
  });
}

// ---------------------------------------------------------------------------
// Suspender, reactivar y cancelar
// ---------------------------------------------------------------------------

const reasonSchema = z.object({ reason });
const noteSchema = z.object({ note: optionalText(300) });

export async function suspendAccountAction(orgId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await authorize("suspension");
  if (!admin) return DENIED;
  if (!validId(orgId)) return NOT_FOUND;
  const parsed = reasonSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  return runAction(async () => {
    await db.$transaction(async (tx) => {
      const sub = await findSubscription(tx, orgId);
      if (sub.status !== "PRUEBA" && sub.status !== "ACTIVA") {
        throw new ActionError(`La cuenta ya está ${SUBSCRIPTION_STATUS_LABEL[sub.status].toLowerCase()}.`);
      }
      await tx.subscription.update({ where: { id: sub.id }, data: { status: "SUSPENDIDA" } });
      await tx.subscriptionEvent.create({
        data: { subscriptionId: sub.id, type: "SUSPENDIDA", detail: parsed.data.reason, actorId: admin.id },
      });
    });
    revalidateAccounts(orgId);
    return { ok: true, message: "Cuenta suspendida. Su equipo ya no puede ingresar; los datos se conservan." };
  });
}

export async function reactivateAccountAction(orgId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await authorize("suspension");
  if (!admin) return DENIED;
  if (!validId(orgId)) return NOT_FOUND;
  const parsed = noteSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const canUncancel = can(admin.role, "cancel");

  return runAction(async () => {
    const status = await db.$transaction(async (tx) => {
      const sub = await findSubscription(tx, orgId);
      if (sub.status !== "SUSPENDIDA" && sub.status !== "CANCELADA") throw new ActionError("La cuenta no está suspendida.");
      // Reactivar una cuenta cancelada es tan delicado como cancelarla: mismo permiso.
      if (sub.status === "CANCELADA" && !canUncancel) throw new ActionError(DENIED.message!);
      // Vuelve a ACTIVA si alguna vez activó un plan; si no, a su prueba.
      const activated = await tx.subscriptionEvent.count({ where: { subscriptionId: sub.id, type: "PLAN_ACTIVADO" } });
      const next = activated > 0 ? "ACTIVA" : "PRUEBA";
      await tx.subscription.update({ where: { id: sub.id }, data: { status: next } });
      await tx.subscriptionEvent.create({
        data: {
          subscriptionId: sub.id,
          type: "REACTIVADA",
          detail: [`Vuelve a: ${SUBSCRIPTION_STATUS_LABEL[next]}`, parsed.data.note].filter(Boolean).join(" · "),
          actorId: admin.id,
        },
      });
      return next;
    });
    revalidateAccounts(orgId);
    return { ok: true, message: `Cuenta reactivada (${SUBSCRIPTION_STATUS_LABEL[status].toLowerCase()}).` };
  });
}

export async function cancelAccountAction(orgId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await authorize("cancel");
  if (!admin) return DENIED;
  if (!validId(orgId)) return NOT_FOUND;
  const parsed = reasonSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  return runAction(async () => {
    await db.$transaction(async (tx) => {
      const sub = await findSubscription(tx, orgId);
      if (sub.status === "CANCELADA") throw new ActionError("La cuenta ya está cancelada.");
      await tx.subscription.update({ where: { id: sub.id }, data: { status: "CANCELADA" } });
      await tx.subscriptionEvent.create({
        data: { subscriptionId: sub.id, type: "CANCELADA", detail: parsed.data.reason, actorId: admin.id },
      });
    });
    revalidateAccounts(orgId);
    return { ok: true, message: "Cuenta cancelada. Sus datos se conservan." };
  });
}

// ---------------------------------------------------------------------------
// Facturas: emitir la siguiente, registrar pagos, anular
// ---------------------------------------------------------------------------

const issueSchema = z.object({
  discount: optionalAmount,
  dueDate: z.string({ error: "Indica la fecha de vencimiento." }).regex(DATE_KEY, { error: "Fecha inválida." }),
});

/** Siguiente correlativo NVX-YYYY-NNNNNN del año de emisión. */
async function nextInvoiceNumber(tx: Prisma.TransactionClient, year: string): Promise<string> {
  const last = await tx.subscriptionInvoice.findFirst({
    where: { number: { startsWith: `NVX-${year}-` } },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  return formatInvoiceNumber(year, (last ? invoiceSequence(last.number) : 0) + 1);
}

const MAX_NUMBER_ATTEMPTS = 5;

export async function issueInvoiceAction(orgId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await authorize("billing");
  if (!admin) return DENIED;
  if (!validId(orgId)) return NOT_FOUND;
  const parsed = issueSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const { discount, dueDate } = parsed.data;
  const year = todayKey().slice(0, 4);

  return runAction(async () => {
    // Otro admin puede emitir al mismo tiempo: si el correlativo ya existe, se reintenta con el siguiente.
    for (let attempt = 1; ; attempt++) {
      try {
        const number = await db.$transaction(async (tx) => {
          const sub = await tx.subscription.findUnique({ where: { organizationId: orgId }, select: invoiceDraftSubscriptionSelect });
          if (!sub) throw new ActionError(NOT_FOUND.message!);
          if (sub.status !== "ACTIVA") throw new ActionError("Solo se factura a cuentas con un plan activo.");

          const draft = await getNextInvoiceDraft(tx, sub);
          if (draft.unitPriceCents == null) {
            throw new ActionError("La cuenta no tiene precio pactado y el plan no tiene precio de lista.");
          }
          if (draft.tooEarly) {
            throw new ActionError(
              `Ya está facturado hasta el ${formatDateOnly(dateOnlyFromKey(addDaysKey(draft.startKey, -1)))}. ` +
                "La siguiente factura se puede emitir un mes antes de que empiece su periodo.",
            );
          }
          const subtotal = draft.seats * draft.unitPriceCents;
          if ((discount ?? 0) > subtotal) {
            throw new ActionError("Revisa el descuento.", { discount: [`No puede superar el subtotal (${formatPEN(subtotal)}).`] });
          }
          if (dueDate < draft.startKey || dueDate > draft.maxDueKey) {
            throw new ActionError("Revisa la fecha de vencimiento.", {
              dueDate: [
                `Debe estar entre el ${formatDateOnly(dateOnlyFromKey(draft.startKey))} y el ${formatDateOnly(dateOnlyFromKey(draft.maxDueKey))}.`,
              ],
            });
          }

          const invoiceNumber = await nextInvoiceNumber(tx, year);
          await tx.subscriptionInvoice.create({
            data: {
              number: invoiceNumber,
              subscriptionId: sub.id,
              periodStart: dateOnlyFromKey(draft.startKey),
              periodEnd: dateOnlyFromKey(draft.endKey),
              dueDate: dateOnlyFromKey(dueDate),
              seats: draft.seats,
              unitPriceCents: draft.unitPriceCents,
              discountCents: discount ?? 0,
              createdById: admin.id,
            },
          });
          return invoiceNumber;
        });
        revalidateAccounts(orgId);
        return { ok: true, message: `Factura ${number} emitida.` };
      } catch (e) {
        if (isUniqueViolation(e, "number") && attempt < MAX_NUMBER_ATTEMPTS) continue;
        if (isUniqueViolation(e)) {
          throw new ActionError("Ese periodo ya tiene una factura vigente. Revisa el historial de facturas.");
        }
        throw e;
      }
    }
  });
}

const paymentSchema = z.object({
  amount: requiredAmount,
  method: z.enum(PAYMENT_METHODS, { error: "Elige el método de pago." }),
  paidAt: z
    .string()
    .regex(DATE_KEY, { error: "Fecha inválida." })
    .optional()
    .refine((v) => !v || v <= todayKey(), { error: "La fecha de pago no puede ser futura." }),
  reference: optionalText(60),
  notes: optionalText(300),
});

function paidAtFromKey(key: string | undefined): Date {
  if (!key || key === todayKey()) return new Date();
  return fromLimaLocal(key, "12:00");
}

async function findInvoice(tx: Prisma.TransactionClient, invoiceId: string) {
  const invoice = await tx.subscriptionInvoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true,
      number: true,
      seats: true,
      unitPriceCents: true,
      discountCents: true,
      voidedAt: true,
      periodStart: true,
      subscription: { select: { organizationId: true } },
      payments: { select: { amountCents: true } },
    },
  });
  if (!invoice) throw new ActionError("No encontramos la factura.");
  return { ...invoice, paidCents: invoice.payments.reduce((s, p) => s + p.amountCents, 0) };
}

export async function registerInvoicePaymentAction(
  invoiceId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await authorize("billing");
  if (!admin) return DENIED;
  if (!validId(invoiceId)) return { ok: false, message: "No encontramos la factura." };
  const parsed = paymentSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const data = parsed.data;

  return runAction(async () => {
    const result = await db.$transaction(async (tx) => {
      const invoice = await findInvoice(tx, invoiceId);
      if (invoice.voidedAt) throw new ActionError("La factura está anulada.");
      const balance = invoiceTotal(invoice) - invoice.paidCents;
      if (balance <= 0) throw new ActionError("La factura ya está pagada.");
      if (data.amount > balance) {
        throw new ActionError("El monto supera el saldo.", { amount: [`El saldo pendiente es ${formatPEN(balance)}.`] });
      }
      if (data.paidAt && data.paidAt < addDaysKey(dateOnlyToKey(invoice.periodStart), -120)) {
        throw new ActionError("Revisa la fecha de pago.", { paidAt: ["Es muy anterior al periodo de la factura."] });
      }
      await tx.subscriptionPayment.create({
        data: {
          invoiceId: invoice.id,
          amountCents: data.amount,
          method: data.method,
          paidAt: paidAtFromKey(data.paidAt),
          reference: data.reference ?? null,
          notes: data.notes ?? null,
          registeredById: admin.id,
        },
      });
      return { number: invoice.number, orgId: invoice.subscription.organizationId, remaining: balance - data.amount };
    });
    revalidateAccounts(result.orgId);
    return {
      ok: true,
      message:
        result.remaining > 0
          ? `Pago registrado en ${result.number}. Saldo: ${formatPEN(result.remaining)}.`
          : `Pago registrado. ${result.number} quedó pagada.`,
    };
  });
}

export async function voidInvoiceAction(invoiceId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await authorize("billing");
  if (!admin) return DENIED;
  if (!validId(invoiceId)) return { ok: false, message: "No encontramos la factura." };
  const parsed = reasonSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  return runAction(async () => {
    const result = await db.$transaction(async (tx) => {
      const invoice = await findInvoice(tx, invoiceId);
      if (invoice.voidedAt) throw new ActionError("La factura ya está anulada.");
      if (invoice.payments.length > 0) {
        throw new ActionError("La factura tiene pagos registrados: no se puede anular.");
      }
      await tx.subscriptionInvoice.update({
        where: { id: invoice.id },
        data: { voidedAt: new Date(), voidReason: parsed.data.reason, voidedById: admin.id },
      });
      return { number: invoice.number, orgId: invoice.subscription.organizationId };
    });
    revalidateAccounts(result.orgId);
    return { ok: true, message: `Factura ${result.number} anulada.` };
  });
}

// ---------------------------------------------------------------------------
// Notas internas
// ---------------------------------------------------------------------------

const accountNoteSchema = z.object({
  body: z
    .string({ error: "Escribe la nota." })
    .min(3, { error: "Escribe la nota (mínimo 3 caracteres)." })
    .max(2000, { error: "Máximo 2000 caracteres." }),
});

export async function addAccountNoteAction(orgId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await authorize("notes");
  if (!admin) return DENIED;
  if (!validId(orgId)) return NOT_FOUND;
  const parsed = accountNoteSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  return runAction(async () => {
    await db.$transaction(async (tx) => {
      const org = await tx.organization.findUnique({ where: { id: orgId }, select: { id: true } });
      if (!org) throw new ActionError(NOT_FOUND.message!);
      await tx.accountNote.create({ data: { organizationId: org.id, authorId: admin.id, body: parsed.data.body } });
    });
    revalidateAccounts(orgId);
    return { ok: true, message: "Nota agregada." };
  });
}
