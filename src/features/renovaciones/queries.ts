import "server-only";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth";
import { packageScope, patientScope } from "@/lib/permissions";
import { consumingStatuses, getPackageSummaries, type PackageSummary } from "@/lib/domain/packages";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Ventana para "paquetes terminados sin renovar". */
export const COMPLETED_WINDOW_DAYS = 30;

export type RenewalRow = {
  packageId: string;
  packageName: string;
  patientId: string;
  patientName: string;
  firstName: string;
  phone: string | null;
  professionalName: string | null;
  totalSessions: number;
  usedSessions: number;
  remainingSessions: number;
  scheduledSessions: number;
  balanceCents: number;
  lastSession: Date | null;
  notifiedAt: Date | null;
};

/**
 * Panel de renovaciones (diferenciador de Neuvi):
 *  - toRenew: paquetes ACTIVO con needsRenewal (restantes <= organization.renewalThreshold).
 *  - completed: paquetes COMPLETADO en los últimos 30 días cuyo paciente no tiene otro paquete ACTIVO
 *    (excluye pacientes dados de alta: terminaron su proceso).
 */
export async function getRenewalsData(user: CurrentUser) {
  const org = user.organization;
  const since = new Date(Date.now() - COMPLETED_WINDOW_DAYS * DAY_MS);

  const [active, completedAll] = await Promise.all([
    getPackageSummaries({ AND: [packageScope(user), { status: "ACTIVO" }] }, org, { startDate: "asc" }),
    getPackageSummaries(
      {
        AND: [
          packageScope(user),
          {
            status: "COMPLETADO",
            patient: { status: { not: "ALTA" }, packages: { none: { status: "ACTIVO" } } },
            OR: [
              { updatedAt: { gte: since } },
              {
                appointments: {
                  some: { status: { in: consumingStatuses(org.noShowConsumesSession) }, startsAt: { gte: since } },
                },
              },
            ],
          },
        ],
      },
      org,
      { startDate: "desc" },
    ),
  ]);

  const toRenew = active.filter((p) => p.needsRenewal);
  // Un solo paquete terminado por paciente (el más reciente).
  const seen = new Set<string>();
  const completed = completedAll.filter((p) => (seen.has(p.patientId) ? false : (seen.add(p.patientId), true)));

  const all = [...toRenew, ...completed];
  if (!all.length) return { toRenew: [] as RenewalRow[], completed: [] as RenewalRow[] };

  const [patients, lastSessions] = await Promise.all([
    db.patient.findMany({
      where: { AND: [patientScope(user), { id: { in: [...new Set(all.map((p) => p.patientId))] } }] },
      select: { id: true, firstName: true, lastName: true, phone: true, professional: { select: { name: true } } },
    }),
    db.appointment.findMany({
      where: { organizationId: user.organizationId, packageId: { in: all.map((p) => p.id) }, status: "ATENDIDA" },
      orderBy: { startsAt: "desc" },
      distinct: ["packageId"],
      select: { packageId: true, startsAt: true },
    }),
  ]);

  const toRow = (p: PackageSummary): RenewalRow | null => {
    const patient = patients.find((x) => x.id === p.patientId);
    if (!patient) return null;
    return {
      packageId: p.id,
      packageName: p.name,
      patientId: patient.id,
      patientName: `${patient.firstName} ${patient.lastName}`.trim(),
      firstName: patient.firstName,
      phone: patient.phone,
      professionalName: patient.professional?.name ?? null,
      totalSessions: p.totalSessions,
      usedSessions: p.usedSessions,
      remainingSessions: p.remainingSessions,
      scheduledSessions: p.scheduledSessions,
      balanceCents: p.balanceCents,
      lastSession: lastSessions.find((a) => a.packageId === p.id)?.startsAt ?? null,
      notifiedAt: p.renewalNotifiedAt,
    };
  };
  const rows = (list: PackageSummary[]) => list.map(toRow).filter((r): r is RenewalRow => r !== null);

  return {
    // Pendientes de aviso primero; luego los que tienen menos sesiones restantes.
    toRenew: rows(toRenew).sort(
      (a, b) => Number(Boolean(a.notifiedAt)) - Number(Boolean(b.notifiedAt)) || a.remainingSessions - b.remainingSessions,
    ),
    completed: rows(completed).filter((r) => !r.lastSession || r.lastSession >= since),
  };
}

/**
 * Cantidad de paquetes por renovar sin aviso enviado. Pensado para el contador del menú lateral
 * (`badges={{ "/app/renovaciones": n }}` en SidebarNav).
 */
export async function countPendingRenewals(user: CurrentUser): Promise<number> {
  const active = await getPackageSummaries(
    { AND: [packageScope(user), { status: "ACTIVO", renewalNotifiedAt: null }] },
    user.organization,
  );
  return active.filter((p) => p.needsRenewal).length;
}
