"use server";

// Paquetes de sesiones y pagos del paciente. Solo ADMIN / RECEPCION gestionan (canManagePayments);
// el PSICOLOGO los ve en solo lectura. Montos siempre en céntimos.
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { canManagePayments, packageScope, patientScope } from "@/lib/permissions";
import { fromLimaLocal, todayKey } from "@/lib/dates";
import { formatPEN, parseAmountToCents } from "@/lib/format";
import { getPackageSummaries } from "@/lib/domain/packages";
import { type ActionState, formToObject, fromZodError } from "@/lib/action-state";
import { packageSchema, paymentSchema } from "./schema";

const FORBIDDEN: ActionState = {
  ok: false,
  message: "Solo administración y recepción pueden registrar paquetes y pagos.",
};

/** Fecha elegida en un <input type="date">: hoy -> ahora; otro día -> mediodía de Lima. */
function dateFromKey(key: string | undefined): Date {
  if (!key || key === todayKey()) return new Date();
  return fromLimaLocal(key, "12:00");
}

function revalidatePatient(patientId: string) {
  revalidatePath(`/app/pacientes/${patientId}`);
  revalidatePath("/app/pacientes");
  revalidatePath("/app/renovaciones");
  revalidatePath("/app/pagos");
  revalidatePath("/app");
}

async function patientInScope(user: CurrentUser, patientId: string) {
  if (typeof patientId !== "string" || !patientId) return null;
  return db.patient.findFirst({
    where: { AND: [{ id: patientId }, patientScope(user)] },
    select: { id: true },
  });
}

export async function createPackageAction(
  patientId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!canManagePayments(user)) return FORBIDDEN;
  const patient = await patientInScope(user, patientId);
  if (!patient) return { ok: false, message: "El paciente no existe o no tienes acceso a él." };

  const parsed = packageSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const d = parsed.data;
  const initialCents = d.payNow ? parseAmountToCents(d.initialAmount) : null;

  await db.$transaction(async (tx) => {
    const pkg = await tx.package.create({
      data: {
        organizationId: user.organizationId,
        patientId: patient.id,
        name: d.name,
        totalSessions: d.totalSessions,
        priceCents: d.price,
        startDate: dateFromKey(d.startDate),
        notes: d.notes ?? null,
        status: "ACTIVO",
      },
      select: { id: true },
    });
    if (initialCents && d.initialMethod) {
      await tx.payment.create({
        data: {
          organizationId: user.organizationId,
          patientId: patient.id,
          packageId: pkg.id,
          amountCents: initialCents,
          method: d.initialMethod,
          paidAt: new Date(),
          reference: d.initialReference ?? null,
          registeredById: user.id,
        },
      });
    }
  });

  revalidatePatient(patient.id);
  return {
    ok: true,
    message: initialCents ? `Paquete creado y pago de ${formatPEN(initialCents)} registrado.` : "Paquete creado.",
  };
}

export async function registerPaymentAction(
  patientId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!canManagePayments(user)) return FORBIDDEN;
  const patient = await patientInScope(user, patientId);
  if (!patient) return { ok: false, message: "El paciente no existe o no tienes acceso a él." };

  const parsed = paymentSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const d = parsed.data;

  // El paquete debe ser de este paciente y de la organización.
  const [summary] = await getPackageSummaries(
    { AND: [packageScope(user), { id: d.packageId, patientId: patient.id }] },
    user.organization,
  );
  if (!summary) return { ok: false, fieldErrors: { packageId: ["Paquete no válido."] }, message: "Paquete no válido." };
  if (summary.status === "CANCELADO") {
    return { ok: false, message: "No se pueden registrar pagos en un paquete cancelado." };
  }

  // Un pago mayor al saldo se permite (adelanto, redondeo) pero exige confirmación explícita.
  const balance = Math.max(summary.balanceCents, 0);
  if (d.amount > balance && !d.confirmOverpay) {
    return {
      ok: false,
      message: `El monto supera el saldo pendiente (${formatPEN(balance)}).`,
      fieldErrors: { confirmOverpay: ["Confirma que el monto es correcto para registrarlo."] },
    };
  }

  await db.payment.create({
    data: {
      organizationId: user.organizationId,
      patientId: patient.id,
      packageId: summary.id,
      amountCents: d.amount,
      method: d.method,
      paidAt: dateFromKey(d.paidAt),
      reference: d.reference ?? null,
      notes: d.notes ?? null,
      registeredById: user.id,
    },
  });

  revalidatePatient(patient.id);
  return { ok: true, message: `Pago de ${formatPEN(d.amount)} registrado.` };
}

/**
 * Cancela un paquete ACTIVO. Las citas futuras (programadas/confirmadas) que descontaban de él quedan
 * sin paquete; las atendidas y los pagos se conservan en el historial.
 */
export async function cancelPackageAction(packageId: string): Promise<ActionState> {
  const user = await requireUser();
  if (!canManagePayments(user)) return FORBIDDEN;
  if (typeof packageId !== "string" || !packageId) return { ok: false, message: "Paquete inválido." };

  const pkg = await db.package.findFirst({
    where: { AND: [{ id: packageId }, packageScope(user)] },
    select: { id: true, patientId: true, status: true },
  });
  if (!pkg) return { ok: false, message: "El paquete no existe o no tienes acceso a él." };
  if (pkg.status !== "ACTIVO") return { ok: false, message: "Solo se pueden cancelar paquetes activos." };

  await db.$transaction([
    db.package.update({ where: { id: pkg.id }, data: { status: "CANCELADO" } }),
    db.appointment.updateMany({
      where: {
        organizationId: user.organizationId,
        packageId: pkg.id,
        status: { in: ["PROGRAMADA", "CONFIRMADA"] },
      },
      data: { packageId: null },
    }),
  ]);

  revalidatePatient(pkg.patientId);
  revalidatePath("/app/agenda");
  return { ok: true, message: "Paquete cancelado." };
}
