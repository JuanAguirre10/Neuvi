import "server-only";
import type { PaymentMethod } from "@prisma/client";
import { db } from "@/lib/db";
import { getPackageSummaries } from "@/lib/domain/packages";
import { fullName } from "@/lib/format";
import type { CurrentUser } from "@/lib/auth";

// Caja consolidada (ADMIN / RECEPCION). Solo datos administrativos y de pagos:
// nunca se consulta ClinicalRecord ni SessionNote.

export const PAYMENT_METHODS: PaymentMethod[] = ["EFECTIVO", "YAPE", "PLIN", "TRANSFERENCIA", "TARJETA", "OTRO"];

/** Máximo de filas que se pintan en la tabla (los totales siempre son exactos). */
export const PAYMENTS_TABLE_LIMIT = 300;

type Org = Pick<CurrentUser, "organizationId"> & {
  organization: { renewalThreshold: number; noShowConsumesSession: boolean };
};

export async function getCashSummary(organizationId: string, start: Date, end: Date) {
  const grouped = await db.payment.groupBy({
    by: ["method"],
    where: { organizationId, paidAt: { gte: start, lt: end } },
    _sum: { amountCents: true },
    _count: { _all: true },
  });

  const byMethod = PAYMENT_METHODS.map((method) => {
    const row = grouped.find((g) => g.method === method);
    return { method, totalCents: row?._sum.amountCents ?? 0, count: row?._count._all ?? 0 };
  });
  const totalCents = byMethod.reduce((s, m) => s + m.totalCents, 0);
  const count = byMethod.reduce((s, m) => s + m.count, 0);
  return { totalCents, count, byMethod };
}

export type CashPaymentRow = Awaited<ReturnType<typeof getPayments>>[number];

export async function getPayments(organizationId: string, start: Date, end: Date, take?: number) {
  return db.payment.findMany({
    where: { organizationId, paidAt: { gte: start, lt: end } },
    orderBy: { paidAt: "desc" },
    take,
    select: {
      id: true,
      paidAt: true,
      amountCents: true,
      method: true,
      reference: true,
      notes: true,
      patient: { select: { id: true, firstName: true, lastName: true } },
      package: { select: { id: true, name: true } },
      registeredBy: { select: { name: true } },
    },
  });
}

export type Receivable = {
  packageId: string;
  packageName: string;
  patientId: string;
  patientName: string;
  priceCents: number;
  paidCents: number;
  balanceCents: number;
  usedSessions: number;
  totalSessions: number;
  status: "ACTIVO" | "COMPLETADO" | "CANCELADO";
  startDate: Date;
};

/** Paquetes (no cancelados) con saldo pendiente, de mayor a menor saldo. */
export async function getReceivables(user: Org): Promise<Receivable[]> {
  const summaries = await getPackageSummaries(
    { organizationId: user.organizationId, status: { not: "CANCELADO" } },
    user.organization,
  );
  const pending = summaries.filter((p) => p.balanceCents > 0);
  if (pending.length === 0) return [];

  const patients = await db.patient.findMany({
    where: { organizationId: user.organizationId, id: { in: [...new Set(pending.map((p) => p.patientId))] } },
    select: { id: true, firstName: true, lastName: true },
  });
  const names = new Map(patients.map((p) => [p.id, fullName(p)]));

  return pending
    .map((p) => ({
      packageId: p.id,
      packageName: p.name,
      patientId: p.patientId,
      patientName: names.get(p.patientId) ?? "Paciente",
      priceCents: p.priceCents,
      paidCents: p.paidCents,
      balanceCents: p.balanceCents,
      usedSessions: p.usedSessions,
      totalSessions: p.totalSessions,
      status: p.status,
      startDate: p.startDate,
    }))
    .sort((a, b) => b.balanceCents - a.balanceCents);
}
