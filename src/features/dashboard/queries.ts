import "server-only";
import type { AppointmentStatus } from "@prisma/client";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth";
import { appointmentScope, canViewCashbox, packageScope, patientScope } from "@/lib/permissions";
import { getPackageSummaries } from "@/lib/domain/packages";
import {
  LIMA_TZ,
  addDaysKey,
  endOfLimaDay,
  formatFriendlyDate,
  formatTime,
  limaTimeKey,
  startOfLimaDay,
  startOfLimaMonthKey,
  startOfNextLimaMonthKey,
  todayKey,
} from "@/lib/dates";
import { fullName } from "@/lib/format";
import { safeColor } from "@/features/agenda/lib";

export type TodayItem = {
  id: string;
  start: string;
  end: string;
  status: AppointmentStatus;
  patientId: string;
  patientName: string;
  professionalName: string;
  color: string;
  room: string | null;
  /** "now" = en curso, "next" = la siguiente, "past" = ya pasó su horario. */
  timing: "past" | "now" | "next" | "later";
};

export type RenewalItem = {
  packageId: string;
  patientId: string;
  patientName: string;
  packageName: string;
  remaining: number;
  total: number;
  balanceCents: number;
};

export type OnboardingItem = {
  key: string;
  label: string;
  description: string;
  href: string;
  done: boolean;
};

const fullDateFmt = new Intl.DateTimeFormat("es-PE", {
  timeZone: LIMA_TZ,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function greetingFor(hour: number): string {
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export async function loadDashboard(user: CurrentUser, opts: { welcome: boolean }) {
  const org = user.organization;
  const now = new Date();
  const today = todayKey();
  const tomorrow = addDaysKey(today, 1);
  const isAdmin = user.role === "ADMIN";
  const showCash = canViewCashbox(user);

  const [todayRows, activePatients, packages, monthIncome, tomorrowRows, orgPatients] = await Promise.all([
    db.appointment.findMany({
      where: {
        ...appointmentScope(user),
        status: { not: "CANCELADA" },
        startsAt: { gte: startOfLimaDay(today), lt: endOfLimaDay(today) },
      },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        status: true,
        patient: { select: { id: true, firstName: true, lastName: true } },
        professional: { select: { name: true, calendarColor: true } },
        room: { select: { name: true } },
      },
      orderBy: { startsAt: "asc" },
    }),
    db.patient.count({ where: { ...patientScope(user), status: "ACTIVO" } }),
    getPackageSummaries({ ...packageScope(user), status: "ACTIVO" }, org),
    showCash
      ? db.payment.aggregate({
          where: {
            organizationId: user.organizationId,
            paidAt: {
              gte: startOfLimaDay(startOfLimaMonthKey(today)),
              lt: startOfLimaDay(startOfNextLimaMonthKey(today)),
            },
          },
          _sum: { amountCents: true },
          _count: { _all: true },
        })
      : null,
    db.appointment.findMany({
      where: {
        ...appointmentScope(user),
        status: { in: ["PROGRAMADA", "CONFIRMADA"] },
        startsAt: { gte: startOfLimaDay(tomorrow), lt: endOfLimaDay(tomorrow) },
      },
      select: { status: true, reminderSentAt: true },
    }),
    db.patient.count({ where: { organizationId: user.organizationId } }),
  ]);

  // ---------- Agenda de hoy ----------
  let nextMarked = false;
  const todayItems: TodayItem[] = todayRows.map((r) => {
    let timing: TodayItem["timing"] = "later";
    if (r.endsAt <= now) timing = "past";
    else if (r.startsAt <= now) timing = "now";
    else if (!nextMarked) {
      timing = "next";
      nextMarked = true;
    }
    return {
      id: r.id,
      start: formatTime(r.startsAt),
      end: formatTime(r.endsAt),
      status: r.status,
      patientId: r.patient.id,
      patientName: fullName(r.patient),
      professionalName: r.professional.name,
      color: safeColor(r.professional.calendarColor),
      room: r.room?.name ?? null,
      timing,
    };
  });

  // ---------- Renovaciones ----------
  const needing = packages.filter((p) => p.needsRenewal).sort((a, b) => a.remainingSessions - b.remainingSessions);
  const topRenewals = needing.slice(0, 5);
  const renewalPatients = topRenewals.length
    ? await db.patient.findMany({
        where: { ...patientScope(user), id: { in: topRenewals.map((p) => p.patientId) } },
        select: { id: true, firstName: true, lastName: true },
      })
    : [];
  const patientNames = new Map(renewalPatients.map((p) => [p.id, fullName(p)]));
  const renewals: RenewalItem[] = topRenewals
    .filter((p) => patientNames.has(p.patientId))
    .map((p) => ({
      packageId: p.id,
      patientId: p.patientId,
      patientName: patientNames.get(p.patientId)!,
      packageName: p.name,
      remaining: p.remainingSessions,
      total: p.totalSessions,
      balanceCents: p.balanceCents,
    }));

  // ---------- Onboarding ----------
  const showOnboarding = opts.welcome || orgPatients === 0;
  const onboarding = showOnboarding ? await loadOnboarding(user, orgPatients) : null;

  return {
    greeting: greetingFor(Number(limaTimeKey(now).slice(0, 2))),
    firstName: user.name.split(/\s+/)[0] ?? user.name,
    todayLabel: fullDateFmt.format(now),
    today,
    todayItems,
    attendedToday: todayRows.filter((r) => r.status === "ATENDIDA").length,
    pendingToday: todayRows.filter((r) => r.status === "PROGRAMADA" || r.status === "CONFIRMADA").length,
    activePatients,
    renewalsCount: needing.length,
    renewals,
    monthIncomeCents: monthIncome ? (monthIncome._sum.amountCents ?? 0) : null,
    monthPaymentsCount: monthIncome ? monthIncome._count._all : 0,
    tomorrowLabel: formatFriendlyDate(startOfLimaDay(tomorrow)),
    tomorrowTotal: tomorrowRows.length,
    tomorrowPending: tomorrowRows.filter((r) => r.status === "PROGRAMADA" && !r.reminderSentAt).length,
    onboarding,
    isAdmin,
  };
}

async function loadOnboarding(user: CurrentUser, orgPatients: number): Promise<OnboardingItem[]> {
  const isAdmin = user.role === "ADMIN";
  const isCenter = user.organization.type === "CENTRO";

  const [org, rooms, users, appointments] = await Promise.all([
    db.organization.findUnique({
      where: { id: user.organizationId },
      select: { phone: true, address: true, ruc: true },
    }),
    db.room.count({ where: { organizationId: user.organizationId } }),
    db.user.count({ where: { organizationId: user.organizationId } }),
    db.appointment.count({ where: { organizationId: user.organizationId } }),
  ]);

  const items: (OnboardingItem & { adminOnly?: boolean; centerOnly?: boolean })[] = [
    {
      key: "datos",
      label: "Completa los datos de tu consultorio",
      description: "Dirección, RUC y teléfono que verán tus pacientes.",
      href: "/app/configuracion",
      done: !!(org?.address && org.phone),
      adminOnly: true,
    },
    {
      key: "consultorios",
      label: "Agrega tus consultorios",
      description: "Así Neuvi evita dos citas en el mismo ambiente.",
      href: "/app/configuracion/consultorios",
      done: rooms > 0,
      adminOnly: true,
      centerOnly: true,
    },
    {
      key: "equipo",
      label: "Invita a tu equipo",
      description: "Psicólogos y recepción, cada uno con su acceso.",
      href: "/app/equipo",
      done: users > 1,
      adminOnly: true,
      centerOnly: true,
    },
    {
      key: "paciente",
      label: "Registra tu primer paciente",
      description: "Ficha administrativa e historia clínica protegida.",
      href: "/app/pacientes/nuevo",
      done: orgPatients > 0,
    },
    {
      key: "cita",
      label: "Agenda tu primera cita",
      description: "Con validación automática de cruces de horario.",
      href: "/app/agenda?nuevaCita=1",
      done: appointments > 0,
    },
  ];

  return items
    .filter((i) => (!i.adminOnly || isAdmin) && (!i.centerOnly || isCenter))
    .map(({ key, label, description, href, done }) => ({ key, label, description, href, done }));
}
