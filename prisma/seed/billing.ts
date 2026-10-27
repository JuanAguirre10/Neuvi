// Plataforma Neuvi: equipo interno, suscripción de cada cuenta con su historial, facturas,
// cobros y notas internas. Todo coherente con el estado final de la suscripción.
import type { BillingCycle, PaymentMethod, Plan, Prisma, SubscriptionEventType } from "@prisma/client";
import {
  ONBOARDING_NOTES,
  SUPPORT_NOTES,
  TRIAL_ENDING_NOTES,
  TRIAL_EXPIRED_NOTES,
  TRIAL_EXTENSION_NOTES,
  TRIAL_FOLLOW_UP_NOTES,
} from "./catalog/platform";
import type { Ctx } from "./context";
import { professionalsOn, type OrgState } from "./org";
import { DAY, HOUR, MINUTE, NOW, TODAY, addMonths, formatDay, limaDay, limaTime, yearOf } from "./time";

type Admin = { id: string; fromMs: number; toMs: number | null };
export type Team = { superadmin: Admin; finanzas: Admin; soporte: Admin; former: Admin };

/** `login`: último ingreso, [días atrás, minuto del día en Lima]. */
export const PLATFORM_ADMINS = [
  { key: "superadmin", name: "Juan Aguirre", email: "admin@neuvi.pe", role: "SUPERADMIN", daysAgo: 450, leftDaysAgo: null, login: [0, 9 * 60 + 12] },
  { key: "finanzas", name: "Mariela Huertas", email: "finanzas@neuvi.pe", role: "FINANZAS", daysAgo: 430, leftDaysAgo: null, login: [1, 17 * 60 + 40] },
  { key: "soporte", name: "Kevin Ccori", email: "soporte@neuvi.pe", role: "SOPORTE", daysAgo: 165, leftDaysAgo: null, login: [0, 10 * 60 + 5] },
  { key: "former", name: "Renzo Salas", email: "renzo.salas@neuvi.pe", role: "SOPORTE", daysAgo: 428, leftDaysAgo: 150, login: [151, 18 * 60 + 20] },
] as const;

export function buildTeam(ctx: Ctx): Team {
  const team = {} as Team;
  for (const a of PLATFORM_ADMINS) {
    const id = ctx.id();
    const fromMs = NOW - a.daysAgo * DAY;
    const toMs = a.leftDaysAgo == null ? null : NOW - a.leftDaysAgo * DAY;
    team[a.key] = { id, fromMs, toMs };
    ctx.rows.platformAdmins.push({
      id,
      name: a.name,
      email: a.email,
      passwordHash: ctx.passwordHash,
      role: a.role,
      active: toMs == null,
      lastLoginAt: new Date(Math.min(NOW - 10 * MINUTE, limaTime(TODAY - a.login[0], a.login[1]))),
      createdAt: new Date(fromMs),
      updatedAt: new Date(toMs ?? fromMs),
    });
  }
  return team;
}

/** Miembro de Neuvi que hizo una acción: finanzas (planes, cobros) o soporte (pruebas, notas). */
function actor(ctx: Ctx, team: Team, kind: "finanzas" | "soporte", ms: number): string {
  const on = (a: Admin) => a.fromMs <= ms && (a.toMs == null || ms < a.toMs);
  if (kind === "finanzas") return on(team.finanzas) && ctx.rng.chance(0.82) ? team.finanzas.id : team.superadmin.id;
  const support = [team.soporte, team.former].filter(on);
  return support.length > 0 && ctx.rng.chance(0.8) ? ctx.rng.pick(support).id : team.superadmin.id;
}

function soles(cents: number): string {
  return `S/ ${(cents / 100).toFixed(2)}`;
}

/** Mismo formato que describePrice() del panel admin. */
function describePrice(cents: number, plan: Plan): string {
  return `${soles(cents)}${plan === "CENTRO" ? " por psicólogo" : ""} al mes`;
}

const PLAN_NAME: Record<Plan, string> = { INDIVIDUAL: "Plan Individual", CENTRO: "Plan Centro Psicológico" };
const CYCLE_LABEL: Record<BillingCycle, string> = { MENSUAL: "Mensual", ANUAL: "Anual" };

type PaymentDraft = { amount: number; method: PaymentMethod; paidMs: number; reference: string | null; notes: string | null; by: string };

export type InvoiceDraft = {
  id: string;
  subscriptionId: string;
  startDay: number;
  endDay: number;
  issuedMs: number;
  dueDay: number;
  seats: number;
  unit: number;
  discount: number;
  createdById: string;
  voided: { ms: number; reason: string; byId: string } | null;
  payments: PaymentDraft[];
  number: string;
};

type Deferred = { row: Prisma.SubscriptionEventCreateManyInput | Prisma.AccountNoteCreateManyInput; text: () => string; field: "detail" | "body" };

/** Acumula lo que depende del correlativo de facturas (se numeran al final, en orden de emisión). */
export type Ledger = { invoices: InvoiceDraft[]; deferred: Deferred[] };

export function createLedger(): Ledger {
  return { invoices: [], deferred: [] };
}

const DUE_DAYS = { MENSUAL: 5, ANUAL: 10 } as const;

function method(ctx: Ctx): PaymentMethod {
  return ctx.rng.weighted([["TRANSFERENCIA", 40], ["YAPE", 25], ["TARJETA", 20], ["PLIN", 15]] as const);
}

function reference(ctx: Ctx, m: PaymentMethod): string | null {
  const { rng } = ctx;
  if (m === "TRANSFERENCIA") return `${rng.pick(["BCP", "Interbank", "BBVA", "Scotiabank"])} ${rng.digits(8)}`;
  if (m === "TARJETA") return `POS ${rng.digits(6)}`;
  return rng.digits(8);
}

function businessTime(ctx: Ctx, day: number): number {
  return limaTime(day, ctx.rng.int(9 * 60, 18 * 60));
}

/**
 * Crea la suscripción de la organización, su historial y su facturación, y fija hasta cuándo
 * la cuenta tuvo actividad (`activityEndDay`, `accessEndMs`) para generar la agenda.
 */
export function buildSubscription(ctx: Ctx, org: OrgState, team: Team, ledger: Ledger): void {
  const { rng } = ctx;
  const s = org.spec.sub;
  const subId = ctx.id();
  const cycle: BillingCycle = s.cycle ?? "MENSUAL";
  const months = cycle === "ANUAL" ? 12 : 1;
  const signupMs = org.createdMs;
  const signupDay = org.signupDay;
  const demoEnd = org.spec.demo?.exactTrialEndInDays;
  const trialEndsMs = demoEnd != null ? NOW + demoEnd * DAY : signupMs + (90 + (s.extendTrial ?? 0)) * DAY;
  const finalPlan: Plan = org.type === "CENTRO" ? "CENTRO" : "INDIVIDUAL";
  const startPlan: Plan = s.upgrade ? "INDIVIDUAL" : finalPlan;
  const upgradeDay = s.upgrade ? signupDay + s.upgrade.at : null;
  const changeDay = s.priceChange ? signupDay + s.priceChange.at : null;
  const activationDay = s.activateAt != null ? signupDay + s.activateAt : null;
  const cancelDay = s.cancelAt != null ? signupDay + s.cancelAt : null;
  const planAt = (day: number): Plan => (upgradeDay != null && day >= upgradeDay ? "CENTRO" : startPlan);
  const priceAt = (day: number): number => {
    if (upgradeDay != null && day >= upgradeDay) return s.upgrade!.price * 100;
    if (changeDay != null && day >= changeDay) return s.priceChange!.to * 100;
    return (s.price ?? 0) * 100;
  };
  const adminName = org.admin.name.split(" ")[0]!;
  const audience = org.type === "INDIVIDUAL" && !s.upgrade ? "individual" : "centro";
  const quote = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);
  const events: Prisma.SubscriptionEventCreateManyInput[] = [];
  const event = (type: SubscriptionEventType, ms: number, actorId: string | null, extra: Partial<Prisma.SubscriptionEventCreateManyInput> = {}) => {
    const row: Prisma.SubscriptionEventCreateManyInput = { id: ctx.id(), subscriptionId: subId, type, actorId, createdAt: new Date(ms), ...extra };
    events.push(row);
    return row;
  };
  const note = (ms: number, kind: "finanzas" | "soporte", text: () => string) => {
    if (ms > NOW) return;
    const row: Prisma.AccountNoteCreateManyInput = { id: ctx.id(), organizationId: org.id, authorId: actor(ctx, team, kind, ms), body: "", createdAt: new Date(ms) };
    ledger.deferred.push({ row, text, field: "body" });
  };

  // ---------- Alta y prueba ----------
  event("ALTA", signupMs, null, { toPlan: startPlan, detail: "Registro con prueba gratuita" });
  const onboardingMs = Math.min(NOW - HOUR, signupMs + rng.int(20, 72) * HOUR);
  if (org.spec.demo || rng.chance(0.85)) {
    const text = rng.pick(ONBOARDING_NOTES[audience]).replace("{admin}", adminName);
    note(onboardingMs, "soporte", () => text);
  }
  if (s.extendTrial) {
    const ms = signupMs + (90 - rng.int(2, 6)) * DAY + rng.int(0, 6) * HOUR;
    const reason = rng.pick(TRIAL_EXTENSION_NOTES);
    event("PRUEBA_EXTENDIDA", ms, actor(ctx, team, "soporte", ms), {
      detail: `+${s.extendTrial} días, hasta el ${formatDay(limaDay(trialEndsMs))} · ${reason}`,
    });
  }
  const followUpMs = signupMs + rng.int(40, 60) * DAY;
  if (followUpMs < NOW && (activationDay == null || limaDay(followUpMs) < activationDay) && rng.chance(0.75)) {
    const text = rng.pick(TRIAL_FOLLOW_UP_NOTES[audience]).replace("{admin}", adminName).replace("{plan}", PLAN_NAME[finalPlan]);
    note(followUpMs, "soporte", () => text);
  }

  // ---------- Facturación ----------
  let activityEndDay = TODAY + 14;
  let accessEndMs = NOW;
  let lastEventMs = signupMs;
  let priceCents: number | null = null;

  if (activationDay == null) {
    const trialOver = trialEndsMs <= NOW;
    if (s.status === "CANCELADA" && cancelDay != null) {
      const cancelMs = businessTime(ctx, cancelDay);
      event("CANCELADA", cancelMs, actor(ctx, team, "finanzas", cancelMs), { detail: s.cancelReason ?? "Baja a pedido del cliente." });
      note(cancelMs - rng.int(2, 6) * HOUR, "soporte", () => `Motivo de baja: ${quote(s.cancelReason ?? "")}`);
      activityEndDay = cancelDay - rng.int(2, 6);
      accessEndMs = cancelMs - rng.int(1, 3) * DAY;
    } else if (trialOver) {
      activityEndDay = limaDay(trialEndsMs) - rng.int(1, 8);
      accessEndMs = limaTime(activityEndDay, rng.int(18 * 60, 22 * 60));
      const endDay = limaDay(trialEndsMs);
      note(trialEndsMs + rng.int(1, 4) * DAY, "soporte", () => rng.pick(TRIAL_EXPIRED_NOTES).replace("{fecha}", formatDay(endDay)));
    } else if (trialEndsMs - NOW < 10 * DAY) {
      const endDay = limaDay(trialEndsMs);
      const n = org.staff.filter((x) => x.isProfessional && x.leftMs == null).length;
      const text = rng
        .pick(TRIAL_ENDING_NOTES)
        .replace("{fecha}", formatDay(endDay))
        .replace("{n}", `${n} psicólogo${n === 1 ? "" : "s"}`)
        .replace("{admin}", adminName);
      note(NOW - rng.int(1, 3) * DAY, "finanzas", () => text);
    }
  } else {
    const activationMs = Math.min(NOW - 2 * HOUR, businessTime(ctx, activationDay));
    const activationPlan = planAt(activationDay);
    priceCents = priceAt(TODAY);
    event("PLAN_ACTIVADO", activationMs, actor(ctx, team, "finanzas", activationMs), {
      fromPlan: startPlan,
      toPlan: activationPlan,
      detail: `${describePrice(priceAt(activationDay), activationPlan)} · ${CYCLE_LABEL[cycle]}`,
    });
    const seatsAtActivation = activationPlan === "CENTRO" ? Math.max(1, professionalsOn(org, activationDay)) : 1;
    const activationText = `Confirmó la activación por WhatsApp: ${PLAN_NAME[activationPlan]}, ${describePrice(priceAt(activationDay), activationPlan)}${
      activationPlan === "CENTRO" ? ` (${seatsAtActivation} psicólogos)` : ""
    }, ciclo ${CYCLE_LABEL[cycle].toLowerCase()}.`;
    note(activationMs + rng.int(10, 90) * MINUTE, "finanzas", () => activationText);

    if (upgradeDay != null && upgradeDay > activationDay) {
      const ms = businessTime(ctx, upgradeDay);
      event("PLAN_CAMBIADO", ms, actor(ctx, team, "finanzas", ms), {
        fromPlan: "INDIVIDUAL",
        toPlan: "CENTRO",
        detail: `${describePrice(s.upgrade!.price * 100, "CENTRO")} · ${CYCLE_LABEL[cycle]}`,
      });
      const size = Math.max(1, professionalsOn(org, upgradeDay + 5));
      const previous = org.spec.previousName ?? "su consultorio";
      note(ms + HOUR, "finanzas", () => `Antes ${previous}. Sumó equipo (${size} psicólogos y recepción) y pasa al plan Centro a ${soles(s.upgrade!.price * 100)} por psicólogo.`);
    }
    if (changeDay != null) {
      const ms = businessTime(ctx, changeDay);
      const plan = planAt(changeDay);
      event("PRECIO_ACTUALIZADO", ms, actor(ctx, team, "finanzas", ms), {
        detail: `Precio: ${describePrice(priceAt(changeDay - 1), plan)} → ${describePrice(priceAt(changeDay), plan)}`,
      });
      const lower = priceAt(changeDay) < priceAt(changeDay - 1);
      const n = professionalsOn(org, changeDay);
      note(ms + 30 * MINUTE, "finanzas", () =>
        lower
          ? `Se acordó ${soles(priceAt(changeDay))} por psicólogo por volumen (${n} profesionales). Revisar el precio en seis meses.`
          : `Terminó la tarifa de lanzamiento. Aceptó el nuevo precio de ${describePrice(priceAt(changeDay), plan)} sin objeciones.`,
      );
    }

    // Periodos encadenados como en el panel admin: cada uno empieza el día siguiente al fin del anterior.
    let periods: { start: number; end: number }[] = [];
    for (let start = activationDay; start <= TODAY; ) {
      const end = addMonths(start, months) - 1;
      periods.push({ start, end });
      start = end + 1;
    }
    const due = DUE_DAYS[cycle];
    let suspendDay: number | null = null;
    if (s.status === "SUSPENDIDA") {
      const last = periods.findLastIndex((p) => p.start + due + 7 <= TODAY - 1);
      const k = last >= 0 ? last : periods.length - 1;
      suspendDay = Math.min(periods[k]!.start + due + rng.int(7, 12), TODAY - 1);
      const stop = suspendDay;
      periods = periods.filter((p) => p.start < stop);
    }
    if (cancelDay != null) periods = periods.filter((p) => p.start < cancelDay);

    // Facturas sin pagar: las que motivaron la suspensión o la deuda de una cuenta activa.
    const unpaid = new Set<number>();
    if (s.overdue) {
      const candidates = periods.map((p, i) => ({ p, i })).filter(({ p }) => (suspendDay != null ? true : p.start + due <= TODAY - 7));
      for (const { i } of candidates.slice(-s.overdue)) unpaid.add(i);
    }
    let voidIdx = -1;
    if (s.voided) {
      const target = TODAY - s.voided.daysAgo;
      let best = Infinity;
      periods.forEach((p, i) => {
        if (i < periods.length - 1 && !unpaid.has(i) && Math.abs(p.start - target) < best) {
          best = Math.abs(p.start - target);
          voidIdx = i;
        }
      });
    }
    // Quien deja de pagar tampoco paga las facturas siguientes.
    const firstUnpaid = unpaid.size > 0 ? Math.min(...unpaid) : Infinity;
    const partialIdx = s.partial ? (unpaid.size > 0 ? firstUnpaid : periods.length - 1) : -1;
    let lateIdx = -1;
    if (s.pastSuspension) {
      const target = signupDay + s.pastSuspension.at;
      let best = Infinity;
      periods.forEach((p, i) => {
        if (i > 0 && i < periods.length - 2 && Math.abs(p.start - target) < best) {
          best = Math.abs(p.start - target);
          lateIdx = i;
        }
      });
    }

    const drafts: InvoiceDraft[] = [];
    periods.forEach((p, i) => {
      const plan = planAt(p.start);
      const seats = plan === "CENTRO" ? Math.max(1, professionalsOn(org, p.start)) : 1;
      const monthly = priceAt(p.start);
      const unit = monthly * months;
      let discount = 0;
      if (cycle === "ANUAL") discount = monthly * 2 * seats; // dos meses de regalo por pagar el año
      else if (s.welcome && i === 0) discount = Math.round((seats * unit) / 2);
      const issuedMs = i === 0 ? activationMs + rng.int(10, 120) * MINUTE : Math.min(NOW - 30 * MINUTE, limaTime(p.start, rng.int(8 * 60, 11 * 60)));
      drafts.push({
        id: ctx.id(),
        subscriptionId: subId,
        startDay: p.start,
        endDay: p.end,
        issuedMs,
        dueDay: p.start + due,
        seats,
        unit,
        discount,
        createdById: actor(ctx, team, "finanzas", issuedMs),
        voided: null,
        payments: [],
        number: "",
      });
    });

    // Psicólogos que se suman a mitad de un plan anual: factura prorrateada por los meses restantes.
    if (cycle === "ANUAL" && drafts.length > 0) {
      const year = drafts[0]!;
      for (const st of org.staff) {
        if (!st.isProfessional || st.startDay <= year.startDay || st.startDay > Math.min(year.endDay, TODAY)) continue;
        const monthsLeft = Math.max(1, Math.round((year.endDay - st.startDay + 1) / 30.4));
        const issuedMs = Math.min(NOW - 30 * MINUTE, st.startMs + rng.int(1, 3) * DAY);
        drafts.push({
          id: ctx.id(),
          subscriptionId: subId,
          startDay: st.startDay,
          endDay: year.endDay,
          issuedMs,
          dueDay: limaDay(issuedMs) + 7,
          seats: 1,
          unit: priceAt(st.startDay) * monthsLeft,
          discount: 0,
          createdById: actor(ctx, team, "finanzas", issuedMs),
          voided: null,
          payments: [],
          number: "",
        });
      }
    }

    const pay = (inv: InvoiceDraft, amount: number, ms: number, notes: string | null = null) => {
      const m = method(ctx);
      const paidMs = Math.min(NOW - 10 * MINUTE, Math.max(inv.issuedMs + 30 * MINUTE, ms));
      inv.payments.push({ amount, method: m, paidMs, reference: reference(ctx, m), notes, by: actor(ctx, team, "finanzas", paidMs) });
    };
    drafts.forEach((inv, i) => {
      const total = inv.seats * inv.unit - inv.discount;
      const issuedDay = limaDay(inv.issuedMs);
      if (i === voidIdx) {
        const voidedMs = Math.min(NOW - HOUR, inv.issuedMs + rng.int(1, 3) * DAY);
        inv.voided = { ms: voidedMs, reason: s.voided!.reason, byId: actor(ctx, team, "finanzas", voidedMs) };
        return;
      }
      if (unpaid.has(i) || (i > firstUnpaid && i < periods.length)) {
        if (i === partialIdx) pay(inv, Math.round((total * rng.int(40, 60)) / 100 / 100) * 100, businessTime(ctx, Math.min(TODAY, inv.dueDay + rng.int(1, 6))), "Pago parcial; el saldo quedó pendiente.");
        return;
      }
      if (i === lateIdx) {
        const suspendedMs = businessTime(ctx, inv.dueDay + 10);
        const paidMs = businessTime(ctx, inv.dueDay + rng.int(14, 19));
        pay(inv, total, paidMs, "Pago fuera de plazo; constancia enviada por WhatsApp.");
        const suspension = event("SUSPENDIDA", suspendedMs, actor(ctx, team, "finanzas", suspendedMs), { detail: "" });
        ledger.deferred.push({ row: suspension, text: () => `Falta de pago: factura ${inv.number} vencida.`, field: "detail" });
        const paid = inv.payments[0]!;
        const reactivation = event("REACTIVADA", paid.paidMs + rng.int(1, 3) * HOUR, actor(ctx, team, "finanzas", paid.paidMs), { detail: "" });
        const via: Record<PaymentMethod, string> = { TRANSFERENCIA: " por transferencia", YAPE: " por Yape", PLIN: " por Plin", TARJETA: " con tarjeta", EFECTIVO: " en efectivo", OTRO: "" };
        ledger.deferred.push({ row: reactivation, text: () => `Vuelve a: Activa · Pagó la factura ${inv.number}${via[paid.method]}.`, field: "detail" });
        note(suspendedMs - 2 * DAY, "finanzas", () => `Llamé por la factura ${inv.number} vencida. Promete pagar el viernes; si no, se suspende el acceso.`);
        return;
      }
      if (i === partialIdx) {
        pay(inv, Math.round((total * rng.int(40, 60)) / 100 / 100) * 100, businessTime(ctx, Math.min(TODAY, issuedDay + rng.int(0, 3))), "Primer abono; el saldo a fin de mes.");
        return;
      }
      if (inv.dueDay >= TODAY && rng.chance(0.4)) return; // pendiente, aún no vence
      let paidDay = issuedDay + rng.weighted([[rng.int(0, 4), 70], [rng.int(5, 9), 25], [rng.int(10, 15), 5]] as const);
      if (paidDay > TODAY) {
        if (inv.dueDay >= TODAY) return;
        paidDay = TODAY;
      }
      const paidMs = businessTime(ctx, paidDay);
      const secondDay = paidDay + rng.int(5, 12);
      if (total >= 10000 && rng.chance(0.12) && secondDay < TODAY) {
        const first = Math.round(total / 2 / 100) * 100;
        pay(inv, first, paidMs, "Primer abono");
        pay(inv, total - first, businessTime(ctx, secondDay), "Saldo de la factura");
      } else {
        pay(inv, total, paidMs, rng.chance(0.08) ? "Constancia enviada por WhatsApp." : null);
      }
    });
    ledger.invoices.push(...drafts);

    // Notas de cobranza y suspensión
    const unpaidDrafts = [...unpaid].map((i) => drafts[i]!).sort((a, b) => a.startDay - b.startDay);
    if (unpaidDrafts.length > 0) {
      const firstUnpaid = unpaidDrafts[0]!;
      note(limaTime(firstUnpaid.dueDay + rng.int(2, 5), 11 * 60), "finanzas", () => `Llamé por la factura ${firstUnpaid.number} vencida. ${adminName} promete pagar por transferencia esta semana.`);
    }
    if (voidIdx >= 0) {
      const inv = drafts[voidIdx]!;
      note(inv.voided!.ms + 20 * MINUTE, "finanzas", () => `Se anuló la factura ${inv.number}: ${s.voided!.reason}`);
    }

    if (suspendDay != null) {
      const suspendMs = businessTime(ctx, suspendDay);
      const row = event("SUSPENDIDA", suspendMs, actor(ctx, team, "finanzas", suspendMs), { detail: "" });
      ledger.deferred.push({
        row,
        field: "detail",
        text: () => `Falta de pago: ${unpaidDrafts.length} factura${unpaidDrafts.length > 1 ? "s vencidas" : " vencida"} (${unpaidDrafts.map((d) => d.number).join(", ")}).`,
      });
      note(suspendMs + rng.int(1, 3) * DAY, "finanzas", () => `Se suspendió el acceso. ${adminName} dice que regularizará a fin de mes; sus datos se conservan.`);
      activityEndDay = suspendDay - 1;
      accessEndMs = suspendMs - rng.int(2, 20) * HOUR;
    }
    if (s.status === "CANCELADA" && cancelDay != null) {
      const cancelMs = businessTime(ctx, cancelDay);
      event("CANCELADA", cancelMs, actor(ctx, team, "finanzas", cancelMs), { detail: s.cancelReason ?? "Baja a pedido del cliente." });
      note(cancelMs - rng.int(1, 3) * DAY, "soporte", () => `Llamada de salida con ${adminName}: ${quote(s.cancelReason ?? "")} Se le recordó que sus datos se conservan si decide volver.`);
      activityEndDay = cancelDay - rng.int(1, 5);
      accessEndMs = cancelMs - rng.int(1, 3) * DAY;
    }
  }

  if (org.spec.sub.status !== "CANCELADA" && org.spec.sub.status !== "SUSPENDIDA" && rng.chance(0.45)) {
    const ms = NOW - rng.int(2, Math.max(3, Math.min(60, org.spec.daysAgo - 3))) * DAY;
    if (ms > signupMs + 3 * DAY) {
      const text = rng.pick(audience === "centro" && rng.chance(0.5) ? SUPPORT_NOTES.centro : SUPPORT_NOTES.comun);
      note(ms, "soporte", () => text);
    }
  }

  for (const e of events) lastEventMs = Math.max(lastEventMs, (e.createdAt as Date).getTime());
  ctx.rows.subscriptionEvents.push(...events);
  ctx.rows.subscriptions.push({
    id: subId,
    organizationId: org.id,
    planCode: finalPlan,
    status: s.status,
    billingCycle: cycle,
    trialEndsAt: new Date(trialEndsMs),
    priceCents,
    createdAt: new Date(signupMs),
    updatedAt: new Date(lastEventMs),
  });
  org.activityEndDay = activityEndDay;
  org.accessEndMs = Math.min(NOW, accessEndMs);
}

/** Numera las facturas en orden de emisión (NVX-AAAA-NNNNNN, correlativo por año) y genera las filas. */
export function finalizeLedger(ctx: Ctx, ledger: Ledger): void {
  const counters = new Map<number, number>();
  const sorted = [...ledger.invoices].sort((a, b) => a.issuedMs - b.issuedMs);
  for (const inv of sorted) {
    const year = yearOf(inv.issuedMs);
    const n = (counters.get(year) ?? 0) + 1;
    counters.set(year, n);
    inv.number = `NVX-${year}-${String(n).padStart(6, "0")}`;
    ctx.rows.subscriptionInvoices.push({
      id: inv.id,
      number: inv.number,
      subscriptionId: inv.subscriptionId,
      periodStart: new Date(inv.startDay * DAY),
      periodEnd: new Date(inv.endDay * DAY),
      issuedAt: new Date(inv.issuedMs),
      dueDate: new Date(inv.dueDay * DAY),
      seats: inv.seats,
      unitPriceCents: inv.unit,
      discountCents: inv.discount,
      voidedAt: inv.voided ? new Date(inv.voided.ms) : null,
      voidReason: inv.voided?.reason ?? null,
      voidedById: inv.voided?.byId ?? null,
      createdById: inv.createdById,
      createdAt: new Date(inv.issuedMs),
    });
    for (const p of inv.payments) {
      ctx.rows.subscriptionPayments.push({
        id: ctx.id(),
        invoiceId: inv.id,
        amountCents: p.amount,
        method: p.method,
        paidAt: new Date(p.paidMs),
        reference: p.reference,
        notes: p.notes,
        registeredById: p.by,
        createdAt: new Date(p.paidMs + 5 * MINUTE),
      });
    }
  }
  for (const d of ledger.deferred) {
    if (d.field === "detail") (d.row as Prisma.SubscriptionEventCreateManyInput).detail = d.text();
    else {
      (d.row as Prisma.AccountNoteCreateManyInput).body = d.text();
      ctx.rows.accountNotes.push(d.row as Prisma.AccountNoteCreateManyInput);
    }
  }
}
