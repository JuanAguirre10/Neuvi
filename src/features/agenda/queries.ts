import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth";
import {
  appointmentScope,
  canManageAllAppointments,
  canViewClinical,
  isScopedToOwnPatients,
  packageScope,
  patientScope,
} from "@/lib/permissions";
import { getPackageSummaries, type PackageSummary } from "@/lib/domain/packages";
import {
  LIMA_TZ,
  addDaysKey,
  endOfLimaDay,
  formatFriendlyDate,
  formatShortDate,
  formatTime,
  limaDateKey,
  startOfLimaDay,
  startOfLimaWeekKey,
  todayKey,
} from "@/lib/dates";
import { fullName } from "@/lib/format";
import { DEFAULT_REMINDER_TEMPLATE, fillTemplate, formatPhone, normalizePeruPhone, whatsappLink } from "@/lib/whatsapp";
import { currentLimaMinutes, safeColor, timeToMinutes } from "./lib";
import type {
  AgendaAppointment,
  AgendaDay,
  AgendaPatientOption,
  AgendaProfessional,
  AgendaRoom,
  ReminderGroup,
  ReminderItem,
} from "./types";

// ---------- Recordatorio por WhatsApp ----------

type ReminderOrg = { name: string; reminderTemplate: string | null };

/** Mensaje del recordatorio. Nunca incluye información clínica. */
export function reminderMessage(
  org: ReminderOrg,
  a: { startsAt: Date; patient: { firstName: string }; professional: { name: string } },
): string {
  const template = org.reminderTemplate?.trim() || DEFAULT_REMINDER_TEMPLATE;
  return fillTemplate(template, {
    paciente: a.patient.firstName,
    fecha: formatFriendlyDate(a.startsAt),
    hora: formatTime(a.startsAt),
    profesional: a.professional.name,
    centro: org.name,
  });
}

function sentLabel(date: Date | null): string | null {
  return date ? `${formatShortDate(date)} ${formatTime(date)}` : null;
}

// ---------- Citas ----------

const appointmentSelect = {
  id: true,
  startsAt: true,
  endsAt: true,
  status: true,
  modality: true,
  notes: true,
  cancelReason: true,
  reminderSentAt: true,
  packageId: true,
  patient: { select: { id: true, firstName: true, lastName: true, phone: true, professionalId: true } },
  professional: { select: { id: true, name: true, calendarColor: true } },
  room: { select: { id: true, name: true } },
  sessionNote: { select: { id: true } },
} satisfies Prisma.AppointmentSelect;

type AppointmentRow = Prisma.AppointmentGetPayload<{ select: typeof appointmentSelect }>;

function toAgendaAppointment(
  row: AppointmentRow,
  ctx: { user: CurrentUser; packages: Map<string, PackageSummary>; today: string },
): AgendaAppointment {
  const org = ctx.user.organization;
  const dateKey = limaDateKey(row.startsAt);
  const start = formatTime(row.startsAt);
  const end = formatTime(row.endsAt);
  const startMin = timeToMinutes(start);
  const endMin = limaDateKey(row.endsAt) === dateKey ? timeToMinutes(end) : 24 * 60;
  const pkg = row.packageId ? ctx.packages.get(row.packageId) : undefined;
  const clinical = canViewClinical(ctx.user, row.patient);
  const active = row.status === "PROGRAMADA" || row.status === "CONFIRMADA";
  const hasValidPhone = normalizePeruPhone(row.patient.phone) !== null;

  return {
    id: row.id,
    dateKey,
    dateLabel: formatFriendlyDate(row.startsAt),
    start,
    end,
    startMin,
    endMin: Math.max(endMin, startMin + 5),
    durationMin: Math.round((row.endsAt.getTime() - row.startsAt.getTime()) / 60_000),
    status: row.status,
    modality: row.modality,
    notes: row.notes,
    cancelReason: row.cancelReason,
    reminderSentLabel: sentLabel(row.reminderSentAt),
    patient: {
      id: row.patient.id,
      name: fullName(row.patient),
      phoneLabel: row.patient.phone ? formatPhone(row.patient.phone) : null,
      treatingId: row.patient.professionalId,
    },
    professional: {
      id: row.professional.id,
      name: row.professional.name,
      color: safeColor(row.professional.calendarColor),
    },
    room: row.room,
    package: pkg
      ? { id: pkg.id, name: pkg.name, used: pkg.usedSessions, total: pkg.totalSessions, remaining: pkg.remainingSessions }
      : null,
    canOpenPatient: !isScopedToOwnPatients(ctx.user) || row.patient.professionalId === ctx.user.id,
    whatsappUrl: active ? whatsappLink(row.patient.phone, reminderMessage(org, row)) : null,
    hasValidPhone,
    canWriteNote: clinical,
    hasNote: clinical && row.sessionNote !== null,
    canDelete: row.status === "PROGRAMADA" && row.sessionNote === null,
    isFutureDay: dateKey > ctx.today,
  };
}

// ---------- Profesionales, consultorios y pacientes ----------

export async function loadProfessionals(user: CurrentUser): Promise<AgendaProfessional[]> {
  // El psicólogo de un centro solo ve (y agenda) su propia agenda.
  const where: Prisma.UserWhereInput = isScopedToOwnPatients(user)
    ? { id: user.id, organizationId: user.organizationId }
    : { organizationId: user.organizationId, active: true, isProfessional: true };
  const users = await db.user.findMany({
    where,
    select: { id: true, name: true, calendarColor: true, specialty: true },
    orderBy: { name: "asc" },
  });
  return users.map((u) => ({ id: u.id, name: u.name, color: safeColor(u.calendarColor), specialty: u.specialty }));
}

export async function loadRooms(user: CurrentUser): Promise<AgendaRoom[]> {
  return db.room.findMany({
    where: { organizationId: user.organizationId, active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

/** Pacientes que se pueden agendar (activos o en pausa) con su paquete disponible. */
export async function loadPatientOptions(user: CurrentUser): Promise<AgendaPatientOption[]> {
  const [patients, packages] = await Promise.all([
    db.patient.findMany({
      where: { ...patientScope(user), status: { in: ["ACTIVO", "EN_PAUSA"] } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        documentNumber: true,
        professionalId: true,
        professional: { select: { name: true } },
        status: true,
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 2000,
    }),
    getPackageSummaries({ ...packageScope(user), status: "ACTIVO" }, user.organization, { startDate: "asc" }),
  ]);

  const freeByPatient = new Map<string, { name: string; free: number }>();
  for (const p of packages) {
    const free = p.remainingSessions - p.scheduledSessions;
    if (free > 0 && !freeByPatient.has(p.patientId)) freeByPatient.set(p.patientId, { name: p.name, free });
  }

  return patients.map((p) => ({
    id: p.id,
    name: fullName(p),
    documentNumber: p.documentNumber,
    professionalId: p.professionalId,
    professionalName: p.professional?.name ?? null,
    status: p.status === "EN_PAUSA" ? "EN_PAUSA" : "ACTIVO",
    freePackage: freeByPatient.get(p.id) ?? null,
  }));
}

// ---------- Agenda semanal ----------

const weekdayFmt = new Intl.DateTimeFormat("es-PE", { timeZone: LIMA_TZ, weekday: "short" });
const dayNumberFmt = new Intl.DateTimeFormat("es-PE", { timeZone: LIMA_TZ, day: "numeric" });
const monthYearFmt = new Intl.DateTimeFormat("es-PE", { timeZone: LIMA_TZ, month: "long", year: "numeric" });

function weekRangeLabel(weekStart: string, weekEnd: string): string {
  const a = startOfLimaDay(weekStart);
  const b = startOfLimaDay(weekEnd);
  if (weekStart.slice(0, 7) === weekEnd.slice(0, 7)) {
    return `${dayNumberFmt.format(a)} – ${dayNumberFmt.format(b)} de ${monthYearFmt.format(b)}`;
  }
  return `${formatShortDate(a)} – ${formatShortDate(b)} ${weekEnd.slice(0, 4)}`;
}

export type AgendaData = Awaited<ReturnType<typeof loadAgenda>>;

/**
 * Carga la semana (lunes a domingo) que contiene `fecha`. La vista diaria usa la misma
 * semana para que la tira de días del móvil muestre cuántas citas hay cada día.
 */
export async function loadAgenda(user: CurrentUser, opts: { fecha: string; profesional: string }) {
  const today = todayKey();
  const canManageAll = canManageAllAppointments(user);
  const weekStart = startOfLimaWeekKey(opts.fecha);
  const weekEnd = addDaysKey(weekStart, 6);

  const [professionals, rooms, patients, pendingReminders] = await Promise.all([
    loadProfessionals(user),
    loadRooms(user),
    loadPatientOptions(user),
    countPendingReminders(user),
  ]);

  // Filtro por profesional: solo para quien ve toda la agenda; el psicólogo ya está acotado por appointmentScope.
  const professionalFilter =
    canManageAll && opts.profesional !== "todos" && professionals.some((p) => p.id === opts.profesional)
      ? opts.profesional
      : null;

  const rows = await db.appointment.findMany({
    where: {
      ...appointmentScope(user),
      startsAt: { gte: startOfLimaDay(weekStart), lt: endOfLimaDay(weekEnd) },
      ...(professionalFilter ? { professionalId: professionalFilter } : {}),
    },
    select: appointmentSelect,
    orderBy: { startsAt: "asc" },
  });

  const packageIds = [...new Set(rows.map((r) => r.packageId).filter((id): id is string => !!id))];
  const summaries = packageIds.length
    ? await getPackageSummaries({ ...packageScope(user), id: { in: packageIds } }, user.organization)
    : [];
  const packages = new Map(summaries.map((s) => [s.id, s]));

  const appointments = rows.map((row) => toAgendaAppointment(row, { user, packages, today }));

  const days: AgendaDay[] = Array.from({ length: 7 }, (_, i) => {
    const key = addDaysKey(weekStart, i);
    const date = startOfLimaDay(key);
    return {
      key,
      weekdayShort: weekdayFmt.format(date).replace(".", ""),
      dayNumber: dayNumberFmt.format(date),
      longLabel: formatFriendlyDate(date),
      isToday: key === today,
    };
  });

  // Hora sugerida para una cita nueva: la próxima hora en punto si es hoy; si no, 09:00.
  const nowMin = currentLimaMinutes();
  const nextHour = Math.min(Math.max(Math.ceil((nowMin + 1) / 60), 7), 20);
  const suggestedTime = opts.fecha === today ? `${String(nextHour).padStart(2, "0")}:00` : "09:00";

  return {
    today,
    nowMinutes: nowMin,
    weekStart,
    weekLabel: weekRangeLabel(weekStart, weekEnd),
    days,
    appointments,
    professionals,
    rooms,
    patients,
    pendingReminders,
    professionalFilter,
    canManageAll,
    suggestedTime,
  };
}

// ---------- Recordatorios ----------

/** Citas programadas (aún sin confirmar) desde ahora hasta el fin de mañana sin recordatorio enviado. */
export async function countPendingReminders(user: CurrentUser): Promise<number> {
  const tomorrow = addDaysKey(todayKey(), 1);
  return db.appointment.count({
    where: {
      ...appointmentScope(user),
      status: "PROGRAMADA",
      reminderSentAt: null,
      startsAt: { gte: new Date(), lt: endOfLimaDay(tomorrow) },
    },
  });
}

/** Citas de lo que queda de hoy y de mañana, agrupadas por día, listas para recordar por WhatsApp. */
export async function loadReminders(user: CurrentUser): Promise<ReminderGroup[]> {
  const org = user.organization;
  const today = todayKey();
  const tomorrow = addDaysKey(today, 1);

  const rows = await db.appointment.findMany({
    where: {
      ...appointmentScope(user),
      status: { in: ["PROGRAMADA", "CONFIRMADA"] },
      startsAt: { gte: new Date(), lt: endOfLimaDay(tomorrow) },
    },
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      status: true,
      reminderSentAt: true,
      patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
      professional: { select: { name: true, calendarColor: true } },
      room: { select: { name: true } },
    },
    orderBy: { startsAt: "asc" },
  });

  const toItem = (r: (typeof rows)[number]): ReminderItem => ({
    id: r.id,
    start: formatTime(r.startsAt),
    end: formatTime(r.endsAt),
    status: r.status,
    patient: {
      id: r.patient.id,
      name: fullName(r.patient),
      phoneLabel: r.patient.phone ? formatPhone(r.patient.phone) : null,
    },
    professional: { name: r.professional.name, color: safeColor(r.professional.calendarColor) },
    room: r.room?.name ?? null,
    whatsappUrl: whatsappLink(r.patient.phone, reminderMessage(org, r)),
    reminderSentLabel: sentLabel(r.reminderSentAt),
  });

  return [
    {
      key: tomorrow,
      title: "Mañana",
      subtitle: formatFriendlyDate(startOfLimaDay(tomorrow)),
      items: rows.filter((r) => limaDateKey(r.startsAt) === tomorrow).map(toItem),
    },
    {
      key: today,
      title: "Hoy (resto del día)",
      subtitle: formatFriendlyDate(startOfLimaDay(today)),
      items: rows.filter((r) => limaDateKey(r.startsAt) === today).map(toItem),
    },
  ];
}
