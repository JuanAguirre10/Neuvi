import "server-only";
import type { AppointmentStatus, PatientStatus, PaymentMethod } from "@prisma/client";
import { db } from "@/lib/db";
import { consumingStatuses } from "@/lib/domain/packages";
import { addDaysKey, limaDateKey, startOfLimaWeekKey } from "@/lib/dates";
import { PATIENT_STATUS_LABEL, PAYMENT_METHOD_LABEL } from "@/lib/format";
import type { ReportMonth } from "./month";

// Reportes de gestión (solo ADMIN). Únicamente datos administrativos: citas (estado/fecha),
// pagos, pacientes (estado/fecha de alta) y paquetes. Nunca historia clínica ni notas.

type OrgRules = { organizationId: string; noShowConsumesSession: boolean };

export type WeekBucket = {
  key: string;
  /** "1–6" (días del mes que cubre la semana) */
  label: string;
  /** "Del 1 al 6 de setiembre" */
  range: string;
  atendidas: number;
  noAsistio: number;
  canceladas: number;
  ingresosCents: number;
};

export type MonthTotals = {
  attended: number;
  noShow: number;
  cancelled: number;
  noShowRate: number | null;
  revenueCents: number;
  newPatients: number;
  packagesSold: number;
};

export type ReportData = MonthTotals & {
  packagesSoldCents: number;
  activePatients: number;
  attendedPatients: number;
  renewal: { finished: number; renewed: number; rate: number | null };
  weeks: WeekBucket[];
  byProfessional: { id: string; name: string; atendidas: number; noAsistio: number }[];
  byMethod: { method: PaymentMethod; label: string; totalCents: number; count: number }[];
  byPatientStatus: { status: PatientStatus; label: string; count: number }[];
};

function rate(part: number, whole: number): number | null {
  return whole > 0 ? part / whole : null;
}

function countStatus(rows: { status: AppointmentStatus; _count: { _all: number } }[], status: AppointmentStatus) {
  return rows.find((r) => r.status === status)?._count._all ?? 0;
}

/** Totales livianos de un mes (se usan para comparar con el mes anterior). */
export async function getMonthTotals(organizationId: string, month: ReportMonth): Promise<MonthTotals> {
  const range = { gte: month.start, lt: month.end };
  const [byStatus, revenue, newPatients, packagesSold] = await Promise.all([
    db.appointment.groupBy({ by: ["status"], where: { organizationId, startsAt: range }, _count: { _all: true } }),
    db.payment.aggregate({ where: { organizationId, paidAt: range }, _sum: { amountCents: true } }),
    db.patient.count({ where: { organizationId, createdAt: range } }),
    db.package.count({ where: { organizationId, createdAt: range, status: { not: "CANCELADO" } } }),
  ]);
  const attended = countStatus(byStatus, "ATENDIDA");
  const noShow = countStatus(byStatus, "NO_ASISTIO");
  return {
    attended,
    noShow,
    cancelled: countStatus(byStatus, "CANCELADA"),
    noShowRate: rate(noShow, attended + noShow),
    revenueCents: revenue._sum.amountCents ?? 0,
    newPatients,
    packagesSold,
  };
}

function buildWeeks(month: ReportMonth): WeekBucket[] {
  const monthName = month.label.split(" de ")[0];
  const weeks = new Map<string, { first: string; last: string }>();
  for (let day = month.firstDay; day < month.nextFirstDay; day = addDaysKey(day, 1)) {
    const key = startOfLimaWeekKey(day);
    const w = weeks.get(key);
    if (w) w.last = day;
    else weeks.set(key, { first: day, last: day });
  }
  return [...weeks.entries()].map(([key, { first, last }]) => {
    const d1 = Number(first.slice(8));
    const d2 = Number(last.slice(8));
    return {
      key,
      label: d1 === d2 ? `${d1}` : `${d1}–${d2}`,
      range: d1 === d2 ? `${d1} de ${monthName}` : `Del ${d1} al ${d2} de ${monthName}`,
      atendidas: 0,
      noAsistio: 0,
      canceladas: 0,
      ingresosCents: 0,
    };
  });
}

/**
 * Tasa de renovación del mes:
 *   paquetes que TERMINARON en el mes = estado COMPLETADO y su última sesión consumida cae en el mes;
 *   renovados = de esos, los que tienen otro paquete (no cancelado) del mismo paciente creado después.
 * Se cuenta como renovación aunque el paciente haya comprado el nuevo paquete antes de terminar el anterior
 * (es justamente lo que busca el aviso de renovación).
 */
async function getRenewal(org: OrgRules, month: ReportMonth) {
  const consuming = consumingStatuses(org.noShowConsumesSession);
  const completed = await db.package.findMany({
    where: {
      organizationId: org.organizationId,
      status: "COMPLETADO",
      appointments: { some: { status: { in: consuming }, startsAt: { gte: month.start, lt: month.end } } },
    },
    select: {
      id: true,
      patientId: true,
      createdAt: true,
      appointments: {
        where: { status: { in: consuming } },
        orderBy: { startsAt: "desc" },
        take: 1,
        select: { startsAt: true },
      },
    },
  });
  const finished = completed.filter((p) => {
    const last = p.appointments[0]?.startsAt;
    return last && last >= month.start && last < month.end;
  });
  if (finished.length === 0) return { finished: 0, renewed: 0, rate: null };

  const others = await db.package.findMany({
    where: {
      organizationId: org.organizationId,
      patientId: { in: [...new Set(finished.map((p) => p.patientId))] },
      status: { not: "CANCELADO" },
    },
    select: { id: true, patientId: true, createdAt: true },
  });
  const renewed = finished.filter((p) =>
    others.some((o) => o.patientId === p.patientId && o.id !== p.id && o.createdAt > p.createdAt),
  ).length;
  return { finished: finished.length, renewed, rate: rate(renewed, finished.length) };
}

export async function getReportData(org: OrgRules, month: ReportMonth): Promise<ReportData> {
  const { organizationId } = org;
  const range = { gte: month.start, lt: month.end };

  const [appointments, payments, newPatients, activePatients, patientsByStatus, sold, renewal] = await Promise.all([
    db.appointment.findMany({
      where: { organizationId, startsAt: range },
      select: { status: true, startsAt: true, professionalId: true, patientId: true },
    }),
    db.payment.findMany({
      where: { organizationId, paidAt: range },
      select: { amountCents: true, method: true, paidAt: true },
    }),
    db.patient.count({ where: { organizationId, createdAt: range } }),
    db.patient.count({ where: { organizationId, status: "ACTIVO" } }),
    db.patient.groupBy({ by: ["status"], where: { organizationId }, _count: { _all: true } }),
    db.package.aggregate({
      where: { organizationId, createdAt: range, status: { not: "CANCELADO" } },
      _count: { _all: true },
      _sum: { priceCents: true },
    }),
    getRenewal(org, month),
  ]);

  // --- Semanas ---
  const weeks = buildWeeks(month);
  const weekOf = (date: Date) => weeks.find((w) => w.key === startOfLimaWeekKey(limaDateKey(date)));
  for (const a of appointments) {
    const w = weekOf(a.startsAt);
    if (!w) continue;
    if (a.status === "ATENDIDA") w.atendidas++;
    else if (a.status === "NO_ASISTIO") w.noAsistio++;
    else if (a.status === "CANCELADA") w.canceladas++;
  }
  for (const p of payments) {
    const w = weekOf(p.paidAt);
    if (w) w.ingresosCents += p.amountCents;
  }

  // --- Totales ---
  const attended = appointments.filter((a) => a.status === "ATENDIDA");
  const noShow = appointments.filter((a) => a.status === "NO_ASISTIO").length;
  const cancelled = appointments.filter((a) => a.status === "CANCELADA").length;
  const revenueCents = payments.reduce((s, p) => s + p.amountCents, 0);

  // --- Por profesional ---
  const profIds = [...new Set(appointments.map((a) => a.professionalId))];
  const professionals = await db.user.findMany({
    where: { organizationId, OR: [{ isProfessional: true, active: true }, { id: { in: profIds } }] },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const byProfessional = professionals
    .map((u) => ({
      id: u.id,
      name: u.name,
      atendidas: attended.filter((a) => a.professionalId === u.id).length,
      noAsistio: appointments.filter((a) => a.professionalId === u.id && a.status === "NO_ASISTIO").length,
    }))
    .sort((a, b) => b.atendidas - a.atendidas || a.name.localeCompare(b.name, "es"));

  // --- Por método de pago ---
  const methods = Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[];
  const byMethod = methods
    .map((method) => {
      const rows = payments.filter((p) => p.method === method);
      return {
        method,
        label: PAYMENT_METHOD_LABEL[method],
        totalCents: rows.reduce((s, p) => s + p.amountCents, 0),
        count: rows.length,
      };
    })
    .filter((m) => m.count > 0)
    .sort((a, b) => b.totalCents - a.totalCents);

  // --- Pacientes por estado (situación actual) ---
  const statuses = Object.keys(PATIENT_STATUS_LABEL) as PatientStatus[];
  const byPatientStatus = statuses.map((status) => ({
    status,
    label: PATIENT_STATUS_LABEL[status],
    count: patientsByStatus.find((r) => r.status === status)?._count._all ?? 0,
  }));

  return {
    attended: attended.length,
    noShow,
    cancelled,
    noShowRate: rate(noShow, attended.length + noShow),
    revenueCents,
    newPatients,
    packagesSold: sold._count._all,
    packagesSoldCents: sold._sum.priceCents ?? 0,
    activePatients,
    attendedPatients: new Set(attended.map((a) => a.patientId)).size,
    renewal,
    weeks,
    byProfessional,
    byMethod,
    byPatientStatus,
  };
}
