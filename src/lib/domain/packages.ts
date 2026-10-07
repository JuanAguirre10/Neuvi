import "server-only";
import type { AppointmentStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";

// Lógica del paquete de sesiones — el corazón de Neuvi:
//   sesiones usadas = citas del paquete en estado ATENDIDA (+ NO_ASISTIO si la organización lo configura)
//   restantes       = totalSessions - usadas
//   saldo           = priceCents - suma de pagos del paquete
//   necesita renovación = paquete ACTIVO, restantes <= organization.renewalThreshold y el paciente
//                         no tiene otro paquete activo con más sesiones (ya renovó) ni está de alta

export function consumingStatuses(noShowConsumesSession: boolean): AppointmentStatus[] {
  return noShowConsumesSession ? ["ATENDIDA", "NO_ASISTIO"] : ["ATENDIDA"];
}

export type PackageSummary = {
  id: string;
  name: string;
  patientId: string;
  status: "ACTIVO" | "COMPLETADO" | "CANCELADO";
  totalSessions: number;
  usedSessions: number;
  remainingSessions: number;
  /** Citas futuras ya agendadas contra el paquete (PROGRAMADA / CONFIRMADA). */
  scheduledSessions: number;
  priceCents: number;
  paidCents: number;
  balanceCents: number;
  startDate: Date;
  renewalNotifiedAt: Date | null;
  needsRenewal: boolean;
};

type OrgRules = { renewalThreshold: number; noShowConsumesSession: boolean };

/** Resume paquetes con sesiones usadas/restantes, pagos y saldo. `where` debe incluir organizationId. */
export async function getPackageSummaries(
  where: Prisma.PackageWhereInput,
  org: OrgRules,
  orderBy: Prisma.PackageOrderByWithRelationInput = { startDate: "desc" },
): Promise<PackageSummary[]> {
  const statuses = consumingStatuses(org.noShowConsumesSession);
  const packages = await db.package.findMany({
    where,
    orderBy,
    select: {
      id: true,
      name: true,
      patientId: true,
      status: true,
      totalSessions: true,
      priceCents: true,
      startDate: true,
      renewalNotifiedAt: true,
      payments: { select: { amountCents: true } },
      appointments: { select: { status: true } },
      patient: { select: { status: true } },
    },
  });

  // Un paciente que ya compró otro paquete activo con sesiones de sobra ya renovó:
  // no hay que avisarle aunque el paquete actual esté por terminar.
  const candidates = packages.filter((p) => p.status === "ACTIVO");
  const renewedPackageIds = new Set<string>();
  if (candidates.length > 0) {
    const others = await db.package.findMany({
      where: { patientId: { in: [...new Set(candidates.map((p) => p.patientId))] }, status: "ACTIVO" },
      select: { id: true, patientId: true, totalSessions: true, appointments: { select: { status: true } } },
    });
    for (const o of others) {
      const usedOther = o.appointments.filter((a) => statuses.includes(a.status)).length;
      const remainingOther = o.totalSessions - usedOther;
      if (remainingOther > org.renewalThreshold) {
        // Marca al paciente como renovado para todos sus OTROS paquetes activos.
        for (const c of candidates) {
          if (c.patientId === o.patientId && c.id !== o.id) renewedPackageIds.add(c.id);
        }
      }
    }
  }

  return packages.map((p) => {
    const used = p.appointments.filter((a) => statuses.includes(a.status)).length;
    const scheduled = p.appointments.filter((a) => a.status === "PROGRAMADA" || a.status === "CONFIRMADA").length;
    const paid = p.payments.reduce((sum, x) => sum + x.amountCents, 0);
    const remaining = Math.max(p.totalSessions - used, 0);
    const alreadyRenewed = renewedPackageIds.has(p.id);
    return {
      id: p.id,
      name: p.name,
      patientId: p.patientId,
      status: p.status,
      totalSessions: p.totalSessions,
      usedSessions: used,
      remainingSessions: remaining,
      scheduledSessions: scheduled,
      priceCents: p.priceCents,
      paidCents: paid,
      balanceCents: p.priceCents - paid,
      startDate: p.startDate,
      renewalNotifiedAt: p.renewalNotifiedAt,
      needsRenewal:
        p.status === "ACTIVO" && remaining <= org.renewalThreshold && !alreadyRenewed && p.patient.status !== "ALTA",
    };
  });
}

/**
 * Paquete activo más antiguo del paciente al que aún le quedan sesiones sin usar ni agendar.
 * La agenda lo usa para asignar automáticamente packageId al crear una cita.
 */
export async function findPackageForNewAppointment(
  organizationId: string,
  patientId: string,
  org: OrgRules,
): Promise<string | null> {
  const summaries = await getPackageSummaries(
    { organizationId, patientId, status: "ACTIVO" },
    org,
    { startDate: "asc" },
  );
  const pkg = summaries.find((p) => p.remainingSessions - p.scheduledSessions > 0);
  return pkg?.id ?? null;
}

/**
 * Recalcula el estado del paquete tras cambiar el estado de una cita:
 * ACTIVO -> COMPLETADO cuando se usaron todas las sesiones, y COMPLETADO -> ACTIVO si se revierte.
 */
export async function syncPackageStatus(packageId: string, org: OrgRules): Promise<void> {
  const [summary] = await getPackageSummaries({ id: packageId }, org);
  if (!summary || summary.status === "CANCELADO") return;
  const next = summary.remainingSessions === 0 ? "COMPLETADO" : "ACTIVO";
  if (next !== summary.status) {
    await db.package.update({ where: { id: packageId }, data: { status: next } });
  }
}
