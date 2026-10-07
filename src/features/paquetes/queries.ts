import "server-only";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth";
import { packageScope } from "@/lib/permissions";
import { getPackageSummaries } from "@/lib/domain/packages";

/** Paquetes del paciente (más reciente primero) con su resumen de sesiones/saldo y sus pagos. */
export async function getPatientPackages(user: CurrentUser, patientId: string) {
  const summaries = await getPackageSummaries(
    { AND: [packageScope(user), { patientId }] },
    user.organization,
    { startDate: "desc" },
  );
  const ids = summaries.map((s) => s.id);

  const [payments, extra] = ids.length
    ? await Promise.all([
        db.payment.findMany({
          where: { organizationId: user.organizationId, packageId: { in: ids } },
          orderBy: { paidAt: "desc" },
          select: {
            id: true,
            packageId: true,
            amountCents: true,
            method: true,
            paidAt: true,
            reference: true,
            notes: true,
            registeredBy: { select: { name: true } },
          },
        }),
        db.package.findMany({
          where: { organizationId: user.organizationId, id: { in: ids } },
          select: { id: true, notes: true, createdAt: true },
        }),
      ])
    : [[], []];

  const packages = summaries.map((s) => ({
    ...s,
    notes: extra.find((e) => e.id === s.id)?.notes ?? null,
    payments: payments.filter((p) => p.packageId === s.id),
  }));

  return { packages, latest: summaries[0] ?? null };
}

export type PatientPackage = Awaited<ReturnType<typeof getPatientPackages>>["packages"][number];
