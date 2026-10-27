import "server-only";
import {
  Prisma,
  type AppointmentStatus,
  type BillingCycle,
  type OrgType,
  type Plan,
  type SubscriptionStatus,
} from "@prisma/client";
import { db } from "@/lib/db";
import {
  addDaysKey,
  dateOnlyToKey,
  limaDateKey,
  startOfLimaDay,
  startOfLimaMonthKey,
  startOfNextLimaMonthKey,
  todayKey,
} from "@/lib/dates";
import {
  TRIAL_SOON_DAYS,
  accountHealth,
  billableSeats,
  effectiveMonthlyPrice,
  invoiceBalance,
  invoiceStatus,
  invoiceTotal,
  matchesStatusFilter,
  nextInvoicePeriod,
  noShowRate,
  periodUnitPrice,
  subscriptionMrr,
  type AccountHealth,
  type AccountState,
  type InvoiceStatus,
} from "./billing";
import {
  SYSTEM_ACTOR,
  recentMonthKeys,
  type AccountFilters,
  type EventFilters,
  type InvoiceFilters,
} from "./filters";

// Consultas del panel de Neuvi. PRIVACIDAD: aquí solo hay datos de cuentas, de su personal y
// de la facturación de Neuvi. De pacientes y citas únicamente se usan conteos (count / groupBy):
// nunca se seleccionan campos personales de Patient, ClinicalRecord, SessionNote ni los pagos o
// paquetes de los pacientes.

const DAY_MS = 24 * 60 * 60 * 1000;
export const ACCOUNTS_PAGE_SIZE = 20;
export const INVOICES_PAGE_SIZE = 25;
export const EVENTS_PAGE_SIZE = 30;

// ---------------------------------------------------------------------------
// SQL compartido
// ---------------------------------------------------------------------------

/** Date UTC como timestamp sin zona (así guarda Prisma), sin depender del TimeZone de la sesión. */
function ts(date: Date) {
  return Prisma.sql`(${date.toISOString()}::timestamptz AT TIME ZONE 'UTC')`;
}

/** Mes "YYYY-MM" en hora de Lima de una columna DateTime. */
function limaMonth(column: string) {
  return Prisma.sql`to_char((${Prisma.raw(column)} AT TIME ZONE 'UTC') AT TIME ZONE 'America/Lima', 'YYYY-MM')`;
}

/**
 * Una fila por factura con total, pagado y estado derivado.
 * Replica invoiceTotal() e invoiceStatus() de billing.ts (si cambias una, cambia la otra).
 */
function invoiceRows(today: string) {
  return Prisma.sql`
    SELECT i.id, i.number, i."subscriptionId", i."periodStart", i."periodEnd", i."issuedAt", i."dueDate",
           i.seats, i."unitPriceCents", i."discountCents", i."voidedAt", i."voidReason",
           GREATEST(i.seats::bigint * i."unitPriceCents" - i."discountCents", 0) AS total,
           COALESCE(p.paid, 0)::bigint AS paid,
           CASE
             WHEN i."voidedAt" IS NOT NULL THEN 'ANULADA'
             WHEN COALESCE(p.paid, 0) >= GREATEST(i.seats::bigint * i."unitPriceCents" - i."discountCents", 0) THEN 'PAGADA'
             WHEN i."dueDate" < ${today}::date THEN 'VENCIDA'
             ELSE 'PENDIENTE'
           END AS status
    FROM "SubscriptionInvoice" i
    LEFT JOIN (
      SELECT "invoiceId", SUM("amountCents") AS paid FROM "SubscriptionPayment" GROUP BY "invoiceId"
    ) p ON p."invoiceId" = i.id`;
}

/** Deuda vencida por suscripción (solo las que deben algo). */
async function overdueBySubscription(today: string): Promise<Map<string, number>> {
  const rows = await db.$queryRaw<{ subscriptionId: string; overdue: bigint }[]>`
    WITH inv AS (${invoiceRows(today)})
    SELECT "subscriptionId", SUM(total - paid) AS overdue
    FROM inv WHERE status = 'VENCIDA'
    GROUP BY "subscriptionId"`;
  return new Map(rows.map((r) => [r.subscriptionId, Number(r.overdue)]));
}

function countMap(rows: { organizationId: string; _count: { _all: number } }[]): Map<string, number> {
  return new Map(rows.map((r) => [r.organizationId, r._count._all]));
}

const planPricingSelect = { listPriceCents: true, perProfessional: true } as const;

const eventSelect = {
  id: true,
  type: true,
  fromPlan: true,
  toPlan: true,
  detail: true,
  createdAt: true,
  actor: { select: { name: true } },
  subscription: { select: { organization: { select: { id: true, name: true } } } },
} satisfies Prisma.SubscriptionEventSelect;

export type EventItem = Prisma.SubscriptionEventGetPayload<{ select: typeof eventSelect }>;

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export type MonthPoint = { key: string; individual: number; centro: number };
export type MoneyPoint = { key: string; cents: number };
export type StatePlanRow = { state: AccountState; individual: number; centro: number };

export type OverdueInvoiceItem = {
  id: string;
  number: string;
  dueDate: Date;
  balanceCents: number;
  orgId: string;
  orgName: string;
};

export type DashboardData = {
  totalAccounts: number;
  activePaying: number;
  inTrial: number;
  trialsEndingSoon: number;
  trialsExpired: number;
  suspended: number;
  canceled: number;
  mrrCents: number;
  activeWithoutPrice: number;
  collectedMonthCents: number;
  overdueCents: number;
  overdueInvoices: number;
  activeProfessionals: number;
  totalPatients: number;
  attendedLast30: number;
  signups: MonthPoint[];
  collected: MoneyPoint[];
  byStatePlan: StatePlanRow[];
  trialsSoon: { orgId: string; orgName: string; planCode: Plan; trialEndsAt: Date }[];
  overdueList: OverdueInvoiceItem[];
  events: EventItem[];
};

const STATE_ORDER: AccountState[] = ["PRUEBA", "PRUEBA_VENCIDA", "ACTIVA", "SUSPENDIDA", "CANCELADA"];

export async function getDashboardData(): Promise<DashboardData> {
  const now = new Date();
  const today = todayKey();
  const months = recentMonthKeys(12);
  const rangeStart = startOfLimaDay(`${months[0]}-01`);
  const monthStart = startOfLimaDay(startOfLimaMonthKey(today));
  const monthEnd = startOfLimaDay(startOfNextLimaMonthKey(today));
  const soon = new Date(now.getTime() + TRIAL_SOON_DAYS * DAY_MS);

  const [
    totalAccounts,
    subs,
    professionals,
    collectedMonth,
    overdueTotals,
    totalPatients,
    attendedLast30,
    signupRows,
    collectedRows,
    trialsSoon,
    overdueList,
    events,
  ] = await Promise.all([
    db.organization.count(),
    db.subscription.findMany({
      select: {
        organizationId: true,
        status: true,
        planCode: true,
        trialEndsAt: true,
        priceCents: true,
        plan: { select: planPricingSelect },
      },
    }),
    db.user.groupBy({ by: ["organizationId"], where: { active: true, isProfessional: true }, _count: { _all: true } }),
    db.subscriptionPayment.aggregate({ where: { paidAt: { gte: monthStart, lt: monthEnd } }, _sum: { amountCents: true } }),
    db.$queryRaw<{ debt: bigint | null; invoices: number }[]>`
      WITH inv AS (${invoiceRows(today)})
      SELECT SUM(total - paid) AS debt, COUNT(*)::int AS invoices FROM inv WHERE status = 'VENCIDA'`,
    db.patient.count(),
    db.appointment.count({ where: { status: "ATENDIDA", startsAt: { gte: new Date(now.getTime() - 30 * DAY_MS), lt: now } } }),
    db.$queryRaw<{ month: string; type: OrgType; n: number }[]>`
      SELECT ${limaMonth('"createdAt"')} AS month, "type"::text AS type, COUNT(*)::int AS n
      FROM "Organization" WHERE "createdAt" >= ${ts(rangeStart)}
      GROUP BY 1, 2`,
    db.$queryRaw<{ month: string; cents: bigint }[]>`
      SELECT ${limaMonth('"paidAt"')} AS month, SUM("amountCents") AS cents
      FROM "SubscriptionPayment" WHERE "paidAt" >= ${ts(rangeStart)}
      GROUP BY 1`,
    db.subscription.findMany({
      where: { status: "PRUEBA", trialEndsAt: { gt: now, lte: soon } },
      orderBy: { trialEndsAt: "asc" },
      take: 6,
      select: { planCode: true, trialEndsAt: true, organization: { select: { id: true, name: true } } },
    }),
    db.$queryRaw<{ id: string; number: string; dueDate: Date; balance: bigint; orgId: string; orgName: string }[]>`
      WITH inv AS (${invoiceRows(today)})
      SELECT inv.id, inv.number, inv."dueDate", inv.total - inv.paid AS balance, o.id AS "orgId", o.name AS "orgName"
      FROM inv
      JOIN "Subscription" s ON s.id = inv."subscriptionId"
      JOIN "Organization" o ON o.id = s."organizationId"
      WHERE inv.status = 'VENCIDA'
      ORDER BY inv."dueDate" ASC, inv.number ASC
      LIMIT 6`,
    db.subscriptionEvent.findMany({ orderBy: { createdAt: "desc" }, take: 8, select: eventSelect }),
  ]);

  const profByOrg = countMap(professionals);
  const byState = new Map<AccountState, StatePlanRow>(STATE_ORDER.map((state) => [state, { state, individual: 0, centro: 0 }]));
  let mrrCents = 0;
  let activeWithoutPrice = 0;
  let activeProfessionals = 0;
  const counts = { activePaying: 0, inTrial: 0, trialsEndingSoon: 0, trialsExpired: 0, suspended: 0, canceled: 0 };

  for (const sub of subs) {
    const profs = profByOrg.get(sub.organizationId) ?? 0;
    const health = accountHealth(sub, 0, now);
    const row = byState.get(health.state)!;
    if (sub.planCode === "CENTRO") row.centro++;
    else row.individual++;

    if (sub.status === "ACTIVA") {
      counts.activePaying++;
      mrrCents += subscriptionMrr(sub, profs);
      if (health.missingPrice) activeWithoutPrice++;
    }
    if (sub.status === "PRUEBA" || sub.status === "ACTIVA") activeProfessionals += profs;
    if (health.state === "PRUEBA") counts.inTrial++;
    if (health.trialEndingSoon) counts.trialsEndingSoon++;
    if (health.trialExpired) counts.trialsExpired++;
    if (sub.status === "SUSPENDIDA") counts.suspended++;
    if (sub.status === "CANCELADA") counts.canceled++;
  }

  const signupMap = new Map<string, MonthPoint>(months.map((key) => [key, { key, individual: 0, centro: 0 }]));
  for (const r of signupRows) {
    const point = signupMap.get(r.month);
    if (!point) continue;
    if (r.type === "CENTRO") point.centro += r.n;
    else point.individual += r.n;
  }
  const collectedMap = new Map(collectedRows.map((r) => [r.month, Number(r.cents)]));

  return {
    totalAccounts,
    ...counts,
    mrrCents,
    activeWithoutPrice,
    collectedMonthCents: collectedMonth._sum.amountCents ?? 0,
    overdueCents: Number(overdueTotals[0]?.debt ?? 0),
    overdueInvoices: overdueTotals[0]?.invoices ?? 0,
    activeProfessionals,
    totalPatients,
    attendedLast30,
    signups: [...signupMap.values()],
    collected: months.map((key) => ({ key, cents: collectedMap.get(key) ?? 0 })),
    byStatePlan: STATE_ORDER.map((s) => byState.get(s)!),
    trialsSoon: trialsSoon.map((t) => ({
      orgId: t.organization.id,
      orgName: t.organization.name,
      planCode: t.planCode,
      trialEndsAt: t.trialEndsAt,
    })),
    overdueList: overdueList.map((r) => ({
      id: r.id,
      number: r.number,
      dueDate: r.dueDate,
      balanceCents: Number(r.balance),
      orgId: r.orgId,
      orgName: r.orgName,
    })),
    events,
  };
}

// ---------------------------------------------------------------------------
// Listado de cuentas
// ---------------------------------------------------------------------------

export type AccountRow = {
  id: string;
  name: string;
  type: OrgType;
  ruc: string | null;
  email: string | null;
  createdAt: Date;
  planCode: Plan;
  planName: string;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  trialEndsAt: Date;
  health: AccountHealth;
  professionals: number;
  patients: number;
  lastLoginAt: Date | null;
  mrrCents: number;
};

export type AccountList = { rows: AccountRow[]; total: number; page: number; pageCount: number };

function subscriptionWhere(filters: AccountFilters, now: Date): Prisma.SubscriptionWhereInput | undefined {
  const where: Prisma.SubscriptionWhereInput = {};
  if (filters.plan) where.planCode = filters.plan;
  switch (filters.estado) {
    case "PRUEBA":
      Object.assign(where, { status: "PRUEBA", trialEndsAt: { gt: now } });
      break;
    case "PRUEBA_VENCIDA":
      Object.assign(where, { status: "PRUEBA", trialEndsAt: { lte: now } });
      break;
    case "ACTIVA":
    case "SUSPENDIDA":
    case "CANCELADA":
      where.status = filters.estado;
      break;
  }
  return Object.keys(where).length > 0 ? where : undefined;
}

function compareAccounts(sort: AccountFilters["orden"]): (a: AccountRow, b: AccountRow) => number {
  const byName = (a: AccountRow, b: AccountRow) => a.name.localeCompare(b.name, "es");
  const time = (d: Date | null) => d?.getTime() ?? 0;
  switch (sort) {
    case "antiguas":
      return (a, b) => time(a.createdAt) - time(b.createdAt);
    case "nombre":
      return byName;
    case "mrr":
      return (a, b) => b.mrrCents - a.mrrCents || byName(a, b);
    case "acceso":
      return (a, b) => time(b.lastLoginAt) - time(a.lastLoginAt) || byName(a, b);
    case "pacientes":
      return (a, b) => b.patients - a.patients || byName(a, b);
    case "profesionales":
      return (a, b) => b.professionals - a.professionals || byName(a, b);
    case "prueba": {
      // Pruebas vigentes primero (las que vencen antes), luego el resto.
      const key = (r: AccountRow) => (r.status === "PRUEBA" ? time(r.trialEndsAt) : Number.MAX_SAFE_INTEGER);
      return (a, b) => key(a) - key(b) || byName(a, b);
    }
    default:
      return (a, b) => time(b.createdAt) - time(a.createdAt);
  }
}

/**
 * Cuentas con sus métricas. Las organizaciones se filtran en BD (texto, tipo, plan, estado guardado);
 * los conteos salen de groupBy y la deuda de un agregado SQL. "Con deuda" y el orden por columnas
 * calculadas (MRR, último acceso...) se resuelven en memoria: son pocas filas (una por cuenta).
 */
export async function listAccounts(filters: AccountFilters): Promise<AccountList> {
  const now = new Date();
  const today = todayKey();
  const q = filters.q;

  const where: Prisma.OrganizationWhereInput = {
    subscription: { isNot: null, ...(subscriptionWhere(filters, now) ? { is: subscriptionWhere(filters, now) } : {}) },
    ...(filters.tipo ? { type: filters.tipo } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { ruc: { contains: q } },
            { email: { contains: q, mode: "insensitive" } },
            { users: { some: { email: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const [orgs, debts, professionals, patients, lastLogins] = await Promise.all([
    db.organization.findMany({
      where,
      select: {
        id: true,
        name: true,
        type: true,
        ruc: true,
        email: true,
        createdAt: true,
        subscription: {
          select: {
            id: true,
            status: true,
            planCode: true,
            billingCycle: true,
            trialEndsAt: true,
            priceCents: true,
            plan: { select: { name: true, ...planPricingSelect } },
          },
        },
      },
    }),
    overdueBySubscription(today),
    db.user.groupBy({ by: ["organizationId"], where: { active: true, isProfessional: true }, _count: { _all: true } }),
    db.patient.groupBy({ by: ["organizationId"], _count: { _all: true } }),
    db.user.groupBy({ by: ["organizationId"], _max: { lastLoginAt: true } }),
  ]);

  const profByOrg = countMap(professionals);
  const patientsByOrg = countMap(patients);
  const lastLoginByOrg = new Map(lastLogins.map((r) => [r.organizationId, r._max.lastLoginAt]));

  let rows: AccountRow[] = [];
  for (const org of orgs) {
    const sub = org.subscription;
    if (!sub) continue;
    const profs = profByOrg.get(org.id) ?? 0;
    rows.push({
      id: org.id,
      name: org.name,
      type: org.type,
      ruc: org.ruc,
      email: org.email,
      createdAt: org.createdAt,
      planCode: sub.planCode,
      planName: sub.plan.name,
      status: sub.status,
      billingCycle: sub.billingCycle,
      trialEndsAt: sub.trialEndsAt,
      health: accountHealth(sub, debts.get(sub.id) ?? 0, now),
      professionals: profs,
      patients: patientsByOrg.get(org.id) ?? 0,
      lastLoginAt: lastLoginByOrg.get(org.id) ?? null,
      mrrCents: subscriptionMrr(sub, profs),
    });
  }

  if (filters.estado === "CON_DEUDA") rows = rows.filter((r) => matchesStatusFilter(r.health, "CON_DEUDA"));
  rows.sort(compareAccounts(filters.orden));

  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / ACCOUNTS_PAGE_SIZE));
  const page = Math.min(filters.page, pageCount);
  return {
    rows: rows.slice((page - 1) * ACCOUNTS_PAGE_SIZE, page * ACCOUNTS_PAGE_SIZE),
    total,
    page,
    pageCount,
  };
}

// ---------------------------------------------------------------------------
// Detalle de cuenta
// ---------------------------------------------------------------------------

export async function getAccount(orgId: string) {
  const now = new Date();
  const today = todayKey();

  const [org, professionals, lastLogin, overdueRows, activation] = await Promise.all([
    db.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        type: true,
        phone: true,
        email: true,
        address: true,
        ruc: true,
        createdAt: true,
        subscription: {
          select: {
            id: true,
            status: true,
            planCode: true,
            billingCycle: true,
            trialEndsAt: true,
            priceCents: true,
            createdAt: true,
            plan: {
              select: { code: true, name: true, listPriceCents: true, perProfessional: true, maxProfessionals: true },
            },
          },
        },
        users: {
          where: { role: "ADMIN" },
          orderBy: [{ active: "desc" }, { createdAt: "asc" }],
          take: 3,
          select: { id: true, name: true, email: true, phone: true, active: true },
        },
      },
    }),
    db.user.count({ where: { organizationId: orgId, active: true, isProfessional: true } }),
    db.user.aggregate({ where: { organizationId: orgId }, _max: { lastLoginAt: true } }),
    db.$queryRaw<{ overdue: bigint | null }[]>`
      WITH inv AS (${invoiceRows(today)})
      SELECT SUM(inv.total - inv.paid) AS overdue
      FROM inv JOIN "Subscription" s ON s.id = inv."subscriptionId"
      WHERE s."organizationId" = ${orgId} AND inv.status = 'VENCIDA'`,
    db.subscriptionEvent.findFirst({
      where: { type: "PLAN_ACTIVADO", subscription: { organizationId: orgId } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);
  if (!org?.subscription) return null;

  const sub = org.subscription;
  const overdueCents = Number(overdueRows[0]?.overdue ?? 0);
  return {
    ...org,
    subscription: sub,
    health: accountHealth(sub, overdueCents, now),
    professionals,
    seats: billableSeats(sub.plan, professionals),
    monthlyPriceCents: effectiveMonthlyPrice(sub.priceCents, sub.plan),
    mrrCents: subscriptionMrr(sub, professionals),
    lastLoginAt: lastLogin._max.lastLoginAt,
    activatedAt: activation?.createdAt ?? null,
  };
}

export type AccountDetail = NonNullable<Awaited<ReturnType<typeof getAccount>>>;

/** Uso de la cuenta: solo conteos (nunca datos de pacientes). */
export async function getAccountUsage(orgId: string) {
  const now = new Date();
  const since = new Date(now.getTime() - 30 * DAY_MS);
  const [byRole, activePatients, totalPatients, appointments, rooms] = await Promise.all([
    db.user.groupBy({
      by: ["role", "isProfessional"],
      where: { organizationId: orgId, active: true },
      _count: { _all: true },
    }),
    db.patient.count({ where: { organizationId: orgId, status: "ACTIVO" } }),
    db.patient.count({ where: { organizationId: orgId } }),
    db.appointment.groupBy({
      by: ["status"],
      where: { organizationId: orgId, startsAt: { gte: since, lt: now } },
      _count: { _all: true },
    }),
    db.room.count({ where: { organizationId: orgId, active: true } }),
  ]);
  const byStatus = (s: AppointmentStatus) => appointments.find((a) => a.status === s)?._count._all ?? 0;
  const attended = byStatus("ATENDIDA");
  const noShow = byStatus("NO_ASISTIO");
  return {
    professionals: byRole.filter((r) => r.isProfessional).reduce((s, r) => s + r._count._all, 0),
    reception: byRole.filter((r) => r.role === "RECEPCION").reduce((s, r) => s + r._count._all, 0),
    activeUsers: byRole.reduce((s, r) => s + r._count._all, 0),
    activePatients,
    totalPatients,
    rooms,
    appointments30: appointments.reduce((s, a) => s + a._count._all, 0),
    attended30: attended,
    noShow30: noShow,
    canceled30: byStatus("CANCELADA"),
    noShowRate: noShowRate(attended, noShow),
  };
}

/** Personal de la cuenta (usuarios del consultorio, no pacientes). */
export function getAccountTeam(orgId: string) {
  return db.user.findMany({
    where: { organizationId: orgId },
    orderBy: [{ active: "desc" }, { role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isProfessional: true,
      active: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });
}

export type AccountInvoice = {
  id: string;
  number: string;
  periodStart: Date;
  periodEnd: Date;
  issuedAt: Date;
  dueDate: Date;
  seats: number;
  unitPriceCents: number;
  discountCents: number;
  totalCents: number;
  paidCents: number;
  balanceCents: number;
  status: InvoiceStatus;
  voidedAt: Date | null;
  voidReason: string | null;
  createdByName: string | null;
  payments: { id: string; amountCents: number; method: string; paidAt: Date; reference: string | null; registeredByName: string | null }[];
};

export async function getAccountInvoices(subscriptionId: string): Promise<AccountInvoice[]> {
  const today = todayKey();
  const invoices = await db.subscriptionInvoice.findMany({
    where: { subscriptionId },
    orderBy: [{ periodStart: "desc" }, { issuedAt: "desc" }],
    select: {
      id: true,
      number: true,
      periodStart: true,
      periodEnd: true,
      issuedAt: true,
      dueDate: true,
      seats: true,
      unitPriceCents: true,
      discountCents: true,
      voidedAt: true,
      voidReason: true,
      createdBy: { select: { name: true } },
      payments: {
        orderBy: { paidAt: "asc" },
        select: {
          id: true,
          amountCents: true,
          method: true,
          paidAt: true,
          reference: true,
          registeredBy: { select: { name: true } },
        },
      },
    },
  });
  return invoices.map((inv) => {
    const paidCents = inv.payments.reduce((s, p) => s + p.amountCents, 0);
    return {
      ...inv,
      totalCents: invoiceTotal(inv),
      paidCents,
      balanceCents: invoiceBalance(inv, paidCents),
      status: invoiceStatus(inv, paidCents, today),
      createdByName: inv.createdBy?.name ?? null,
      payments: inv.payments.map((p) => ({ ...p, registeredByName: p.registeredBy?.name ?? null })),
    };
  });
}

/** Lo mínimo de la suscripción para calcular la siguiente factura. */
export const invoiceDraftSubscriptionSelect = {
  id: true,
  organizationId: true,
  status: true,
  billingCycle: true,
  priceCents: true,
  createdAt: true,
  plan: { select: planPricingSelect },
} satisfies Prisma.SubscriptionSelect;

type DraftSubscription = Prisma.SubscriptionGetPayload<{ select: typeof invoiceDraftSubscriptionSelect }>;

export type InvoiceDraft = {
  startKey: string;
  endKey: string;
  seats: number;
  activeProfessionals: number;
  monthlyCents: number | null;
  unitPriceCents: number | null;
  defaultDueKey: string;
  /** Último vencimiento permitido: 90 días desde el inicio del periodo o desde hoy si ya empezó. */
  maxDueKey: string;
  /** No se factura más de un mes por adelantado. */
  tooEarly: boolean;
};

/**
 * Siguiente factura de la suscripción (se usa en el diálogo y, de nuevo, dentro de la transacción
 * de emisión: el cliente nunca decide periodo, psicólogos ni precio).
 */
export async function getNextInvoiceDraft(
  client: Prisma.TransactionClient,
  sub: DraftSubscription,
): Promise<InvoiceDraft> {
  const today = todayKey();
  const [last, activation, activeProfessionals] = await Promise.all([
    client.subscriptionInvoice.findFirst({
      where: { subscriptionId: sub.id, voidedAt: null },
      orderBy: { periodEnd: "desc" },
      select: { periodEnd: true },
    }),
    client.subscriptionEvent.findFirst({
      where: { subscriptionId: sub.id, type: "PLAN_ACTIVADO" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    client.user.count({ where: { organizationId: sub.organizationId, active: true, isProfessional: true } }),
  ]);
  const { startKey, endKey } = nextInvoicePeriod({
    lastPeriodEndKey: last ? dateOnlyToKey(last.periodEnd) : null,
    activationKey: limaDateKey(activation?.createdAt ?? sub.createdAt),
    cycle: sub.billingCycle,
  });
  const monthlyCents = effectiveMonthlyPrice(sub.priceCents, sub.plan);
  return {
    startKey,
    endKey,
    seats: billableSeats(sub.plan, activeProfessionals),
    activeProfessionals,
    monthlyCents,
    unitPriceCents: monthlyCents == null ? null : periodUnitPrice(monthlyCents, sub.billingCycle),
    defaultDueKey: addDaysKey(startKey > today ? startKey : today, 7),
    maxDueKey: addDaysKey(startKey > today ? startKey : today, 90),
    tooEarly: startKey > addDaysKey(today, 31),
  };
}

export async function getAccountInvoiceDraft(orgId: string): Promise<InvoiceDraft | null> {
  const sub = await db.subscription.findUnique({ where: { organizationId: orgId }, select: invoiceDraftSubscriptionSelect });
  return sub ? getNextInvoiceDraft(db, sub) : null;
}

export function getAccountEvents(subscriptionId: string) {
  return db.subscriptionEvent.findMany({
    where: { subscriptionId },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: eventSelect,
  });
}

export function getAccountNotes(orgId: string) {
  return db.accountNote.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, body: true, createdAt: true, author: { select: { name: true } } },
  });
}

/** Planes activos (para los diálogos de plan) y el actual aunque esté inactivo. */
export function getPlanOptions() {
  return db.subscriptionPlan.findMany({
    orderBy: { code: "desc" },
    select: {
      code: true,
      name: true,
      listPriceCents: true,
      perProfessional: true,
      maxProfessionals: true,
      active: true,
    },
  });
}

export type PlanOption = Awaited<ReturnType<typeof getPlanOptions>>[number];

// ---------------------------------------------------------------------------
// Facturación (todas las cuentas)
// ---------------------------------------------------------------------------

export type InvoiceListRow = {
  id: string;
  number: string;
  periodStart: Date;
  periodEnd: Date;
  issuedAt: Date;
  dueDate: Date;
  seats: number;
  unitPriceCents: number;
  discountCents: number;
  totalCents: number;
  paidCents: number;
  balanceCents: number;
  status: InvoiceStatus;
  voidReason: string | null;
  orgId: string;
  orgName: string;
};

export type InvoiceTotals = {
  invoices: number;
  billedCents: number;
  paidCents: number;
  pendingCents: number;
  overdueCents: number;
};

type RawInvoiceRow = Omit<InvoiceListRow, "totalCents" | "paidCents" | "balanceCents"> & {
  total: bigint;
  paid: bigint;
};

export async function listInvoices(filters: InvoiceFilters): Promise<{
  rows: InvoiceListRow[];
  totals: InvoiceTotals;
  total: number;
  page: number;
  pageCount: number;
}> {
  const today = todayKey();
  const conditions: Prisma.Sql[] = [];
  if (filters.mes) conditions.push(Prisma.sql`${limaMonth('inv."issuedAt"')} = ${filters.mes}`);
  if (filters.q) {
    const like = `%${filters.q}%`;
    conditions.push(Prisma.sql`(o.name ILIKE ${like} OR inv.number ILIKE ${like} OR o.ruc ILIKE ${like})`);
  }
  const baseWhere = conditions.length ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}` : Prisma.empty;
  const statusWhere = filters.estado ? Prisma.sql`WHERE status = ${filters.estado}` : Prisma.empty;

  // Filas con la cuenta; el filtro de estado se aplica sobre el estado derivado.
  const filtered = Prisma.sql`
    WITH inv AS (${invoiceRows(today)}),
    with_account AS (
      SELECT inv.*, o.id AS "orgId", o.name AS "orgName"
      FROM inv
      JOIN "Subscription" s ON s.id = inv."subscriptionId"
      JOIN "Organization" o ON o.id = s."organizationId"
      ${baseWhere}
    )
    SELECT * FROM with_account ${statusWhere}`;

  const offset = (filters.page - 1) * INVOICES_PAGE_SIZE;
  const [rows, totals] = await Promise.all([
    db.$queryRaw<RawInvoiceRow[]>`
      SELECT f.* FROM (${filtered}) f
      ORDER BY f."issuedAt" DESC, f.number DESC
      LIMIT ${INVOICES_PAGE_SIZE} OFFSET ${offset}`,
    db.$queryRaw<{ invoices: bigint; billed: bigint | null; paid: bigint | null; pending: bigint | null; overdue: bigint | null }[]>`
      SELECT COUNT(*) AS invoices,
             SUM(total) FILTER (WHERE status <> 'ANULADA') AS billed,
             SUM(paid) FILTER (WHERE status <> 'ANULADA') AS paid,
             SUM(total - paid) FILTER (WHERE status IN ('PENDIENTE', 'VENCIDA')) AS pending,
             SUM(total - paid) FILTER (WHERE status = 'VENCIDA') AS overdue
      FROM (${filtered}) f`,
  ]);

  const t = totals[0];
  const total = Number(t?.invoices ?? 0);
  return {
    rows: rows.map((r) => {
      const totalCents = Number(r.total);
      const paidCents = Number(r.paid);
      return {
        id: r.id,
        number: r.number,
        periodStart: r.periodStart,
        periodEnd: r.periodEnd,
        issuedAt: r.issuedAt,
        dueDate: r.dueDate,
        seats: r.seats,
        unitPriceCents: r.unitPriceCents,
        discountCents: r.discountCents,
        totalCents,
        paidCents,
        balanceCents: r.status === "ANULADA" ? 0 : Math.max(0, totalCents - paidCents),
        status: r.status,
        voidReason: r.voidReason,
        orgId: r.orgId,
        orgName: r.orgName,
      };
    }),
    totals: {
      invoices: total,
      billedCents: Number(t?.billed ?? 0),
      paidCents: Number(t?.paid ?? 0),
      pendingCents: Number(t?.pending ?? 0),
      overdueCents: Number(t?.overdue ?? 0),
    },
    total,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / INVOICES_PAGE_SIZE)),
  };
}

// ---------------------------------------------------------------------------
// Actividad
// ---------------------------------------------------------------------------

export async function listEvents(filters: EventFilters) {
  const where: Prisma.SubscriptionEventWhereInput = {
    ...(filters.tipo ? { type: filters.tipo } : {}),
    ...(filters.actor ? { actorId: filters.actor === SYSTEM_ACTOR ? null : filters.actor } : {}),
    ...(filters.mes
      ? {
          createdAt: {
            gte: startOfLimaDay(`${filters.mes}-01`),
            lt: startOfLimaDay(startOfNextLimaMonthKey(`${filters.mes}-01`)),
          },
        }
      : {}),
    ...(filters.q ? { subscription: { organization: { name: { contains: filters.q, mode: "insensitive" } } } } : {}),
  };
  const [rows, total, actors] = await Promise.all([
    db.subscriptionEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * EVENTS_PAGE_SIZE,
      take: EVENTS_PAGE_SIZE,
      select: eventSelect,
    }),
    db.subscriptionEvent.count({ where }),
    db.platformAdmin.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return { rows, total, page: filters.page, pageCount: Math.max(1, Math.ceil(total / EVENTS_PAGE_SIZE)), actors };
}

// ---------------------------------------------------------------------------
// Planes y equipo
// ---------------------------------------------------------------------------

export async function listPlans() {
  const [plans, usage] = await Promise.all([
    db.subscriptionPlan.findMany({ orderBy: { code: "desc" } }),
    db.subscription.groupBy({ by: ["planCode", "status"], _count: { _all: true } }),
  ]);
  return plans.map((plan) => {
    const rows = usage.filter((u) => u.planCode === plan.code);
    const count = (s: SubscriptionStatus) => rows.find((r) => r.status === s)?._count._all ?? 0;
    return {
      ...plan,
      accounts: rows.reduce((s, r) => s + r._count._all, 0),
      activeAccounts: count("ACTIVA"),
      trialAccounts: count("PRUEBA"),
    };
  });
}

export function listPlatformAdmins() {
  return db.platformAdmin.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, role: true, active: true, lastLoginAt: true, createdAt: true },
  });
}
