import "server-only";
import type { PatientStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth";
import { appointmentScope, canViewClinical, isScopedToOwnPatients, packageScope, patientScope } from "@/lib/permissions";
import { getPackageSummaries, type PackageSummary } from "@/lib/domain/packages";

export const PATIENTS_PAGE_SIZE = 25;

const UPCOMING_STATUSES = ["PROGRAMADA", "CONFIRMADA"] as const;

// ---------------------------------------------------------------------------
// Profesionales
// ---------------------------------------------------------------------------

export type ProfessionalOption = { id: string; name: string; active: boolean };

/** Profesionales (que atienden) de la organización del usuario. */
export async function getOrgProfessionals(user: CurrentUser): Promise<ProfessionalOption[]> {
  return db.user.findMany({
    where: { organizationId: user.organizationId, isProfessional: true },
    select: { id: true, name: true, active: true },
    orderBy: { name: "asc" },
  });
}

// ---------------------------------------------------------------------------
// Lista
// ---------------------------------------------------------------------------

export type PatientListFilters = {
  q?: string;
  estado?: PatientStatus;
  /** id de profesional, o "sin" para pacientes sin psicólogo asignado. Ignorado para PSICOLOGO. */
  profesional?: string;
  page: number;
};

export type PatientListRow = {
  id: string;
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string | null;
  phone: string | null;
  status: PatientStatus;
  professionalName: string | null;
  activePackage: Pick<PackageSummary, "id" | "name" | "usedSessions" | "totalSessions" | "needsRenewal"> | null;
  nextAppointment: Date | null;
};

function searchFilter(q: string): Prisma.PatientWhereInput[] {
  const terms = q.split(/\s+/).filter(Boolean).slice(0, 5);
  return terms.map((term) => {
    const digits = term.replace(/\D/g, "");
    const or: Prisma.PatientWhereInput[] = [
      { firstName: { contains: term, mode: "insensitive" } },
      { lastName: { contains: term, mode: "insensitive" } },
      { documentNumber: { contains: term, mode: "insensitive" } },
    ];
    if (digits.length >= 3) or.push({ phone: { contains: digits } });
    return { OR: or };
  });
}

export async function listPatients(user: CurrentUser, filters: PatientListFilters) {
  const and: Prisma.PatientWhereInput[] = [patientScope(user)];
  if (filters.estado) and.push({ status: filters.estado });
  if (filters.profesional && !isScopedToOwnPatients(user)) {
    and.push({ professionalId: filters.profesional === "sin" ? null : filters.profesional });
  }
  if (filters.q) and.push(...searchFilter(filters.q));
  const where: Prisma.PatientWhereInput = { AND: and };

  const [total, patients] = await Promise.all([
    db.patient.count({ where }),
    db.patient.findMany({
      where,
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      skip: (filters.page - 1) * PATIENTS_PAGE_SIZE,
      take: PATIENTS_PAGE_SIZE,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        documentType: true,
        documentNumber: true,
        phone: true,
        status: true,
        professional: { select: { name: true } },
      },
    }),
  ]);

  const ids = patients.map((p) => p.id);
  const now = new Date();
  const [packages, upcoming] = ids.length
    ? await Promise.all([
        getPackageSummaries(
          { AND: [packageScope(user), { patientId: { in: ids }, status: "ACTIVO" }] },
          user.organization,
          { startDate: "asc" },
        ),
        db.appointment.findMany({
          where: {
            AND: [
              appointmentScope(user),
              { patientId: { in: ids }, startsAt: { gte: now }, status: { in: [...UPCOMING_STATUSES] } },
            ],
          },
          orderBy: { startsAt: "asc" },
          distinct: ["patientId"],
          select: { patientId: true, startsAt: true },
        }),
      ])
    : [[], []];

  const rows: PatientListRow[] = patients.map((p) => {
    const active = currentPackage(packages.filter((pkg) => pkg.patientId === p.id));
    return {
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      documentType: p.documentType,
      documentNumber: p.documentNumber,
      phone: p.phone,
      status: p.status,
      professionalName: p.professional?.name ?? null,
      activePackage: active
        ? {
            id: active.id,
            name: active.name,
            usedSessions: active.usedSessions,
            totalSessions: active.totalSessions,
            needsRenewal: active.needsRenewal,
          }
        : null,
      nextAppointment: upcoming.find((a) => a.patientId === p.id)?.startsAt ?? null,
    };
  });

  return {
    rows,
    total,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / PATIENTS_PAGE_SIZE)),
  };
}

/**
 * Paquete "actual" entre los ACTIVOS de un paciente (ordenados por inicio ascendente):
 * el más antiguo que aún tiene sesiones por usar (es el que consume la agenda), o el primero.
 */
export function currentPackage<T extends Pick<PackageSummary, "status" | "remainingSessions">>(
  packages: T[],
): T | null {
  const active = packages.filter((p) => p.status === "ACTIVO");
  return active.find((p) => p.remainingSessions > 0) ?? active[0] ?? null;
}

// ---------------------------------------------------------------------------
// Ficha
// ---------------------------------------------------------------------------

/** Paciente visible para el usuario (null si no existe o no tiene acceso). Solo datos administrativos. */
export async function getPatientInScope(user: CurrentUser, id: string) {
  return db.patient.findFirst({
    where: { AND: [{ id }, patientScope(user)] },
    include: { professional: { select: { id: true, name: true, active: true } } },
  });
}

export type PatientDetail = NonNullable<Awaited<ReturnType<typeof getPatientInScope>>>;

/** Datos de la pestaña Resumen. La parte clínica solo se consulta si el usuario es el tratante. */
export async function getPatientSummary(user: CurrentUser, patient: PatientDetail) {
  const now = new Date();
  const clinicalAllowed = canViewClinical(user, patient);

  const [activePackages, upcoming, lastAttended, clinical] = await Promise.all([
    getPackageSummaries(
      { AND: [packageScope(user), { patientId: patient.id, status: "ACTIVO" }] },
      user.organization,
      { startDate: "asc" },
    ),
    db.appointment.findMany({
      where: {
        AND: [
          appointmentScope(user),
          { patientId: patient.id, startsAt: { gte: now }, status: { in: [...UPCOMING_STATUSES] } },
        ],
      },
      orderBy: { startsAt: "asc" },
      take: 3,
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        status: true,
        modality: true,
        professional: { select: { name: true } },
        room: { select: { name: true } },
      },
    }),
    db.appointment.findFirst({
      where: { AND: [appointmentScope(user), { patientId: patient.id, status: "ATENDIDA" }] },
      orderBy: { startsAt: "desc" },
      select: { id: true, startsAt: true, modality: true, professional: { select: { name: true } } },
    }),
    clinicalAllowed
      ? Promise.all([
          db.clinicalRecord.findUnique({
            where: { patientId: patient.id },
            select: { riskLevel: true, updatedAt: true },
          }),
          db.sessionNote.count({ where: { patientId: patient.id } }),
          db.sessionNote.findFirst({
            where: { patientId: patient.id },
            orderBy: { sessionDate: "desc" },
            select: { sessionDate: true, riskLevel: true },
          }),
        ]).then(([record, notesCount, lastNote]) => ({ record, notesCount, lastNote }))
      : Promise.resolve(null),
  ]);

  return {
    activePackages,
    current: currentPackage(activePackages),
    upcoming,
    lastAttended,
    clinical,
  };
}

/** Historial de citas del paciente: próximas (asc) e historial (desc). */
export async function getPatientAppointments(user: CurrentUser, patient: PatientDetail) {
  const now = new Date();
  const includeNote = canViewClinical(user, patient);
  const appointments = await db.appointment.findMany({
    where: { AND: [appointmentScope(user), { patientId: patient.id }] },
    orderBy: { startsAt: "desc" },
    take: 200,
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      status: true,
      modality: true,
      cancelReason: true,
      professional: { select: { name: true } },
      room: { select: { name: true } },
      package: { select: { name: true } },
      sessionNote: { select: { id: true } },
    },
  });

  // La existencia de nota de evolución solo se expone al psicólogo tratante.
  const rows = appointments.map(({ sessionNote, ...a }) => ({
    ...a,
    hasNote: includeNote ? sessionNote !== null : null,
  }));
  const isUpcoming = (a: (typeof rows)[number]) =>
    a.startsAt >= now && (a.status === "PROGRAMADA" || a.status === "CONFIRMADA");
  const upcoming = rows.filter(isUpcoming).reverse();
  const past = rows.filter((a) => !isUpcoming(a));
  return { upcoming, past, showNotes: includeNote };
}
