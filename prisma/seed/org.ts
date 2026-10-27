// Organización, equipo (usuarios con horario, precios y consultorio preferido) y consultorios.
import type { OrgType, Prisma, Role } from "@prisma/client";
import { CALENDAR_COLORS, DEFAULT_CALENDAR_COLOR } from "../../src/features/equipo/constants";
import { SPECIALTIES, THEMES, type AgeGroup, type SpecialtyKey } from "./catalog/clinical";
import { REMINDER_TEMPLATES, RENEWAL_TEMPLATES } from "./catalog/operations";
import type { FixedUser, OrgSpec, PresetPatient, Sex } from "./catalog/orgs";
import { COMMON_SURNAMES, FEMALE_NAMES, MALE_NAMES, REGIONAL_SURNAMES } from "./catalog/people";
import { CITIES } from "./catalog/places";
import { mobile, roundSoles, ruc, slug, uniqueEmail, type Ctx } from "./context";
import type { Rng } from "./random";
import { DAY, HOUR, MINUTE, NOW, TODAY, limaDay, limaTime } from "./time";

/** Ajuste global de la carga de pacientes por profesional (controla el volumen de citas). */
export const CAPACITY_FACTOR = 0.9;

export type Slot = { dow: number; min: number };
export type Prices = { single: number; p4: number; p8: number; evaluation: number };

export type Staff = {
  id: string;
  name: string;
  email: string;
  role: Role;
  sex: Sex;
  isProfessional: boolean;
  specialty: SpecialtyKey | null;
  startMs: number;
  startDay: number;
  /** Dejó la organización (usuario inactivo desde ese momento). */
  leftMs: number | null;
  slots: Slot[];
  capacity: number;
  roomIdx: number | null;
  prices: Prices;
  /** Ya tenía pacientes al empezar a usar Neuvi (se cargan en la primera semana). */
  cohort: boolean;
  ages: Set<AgeGroup>;
  row: Prisma.UserCreateManyInput;
};

export type RoomState = { id: string; name: string; active: boolean; forChildren: boolean };

export type OrgState = {
  spec: OrgSpec;
  id: string;
  type: OrgType;
  createdMs: number;
  signupDay: number;
  minutes: number;
  noShowConsumes: boolean;
  renewalThreshold: number;
  staff: Staff[];
  admin: Staff;
  rooms: RoomState[];
  presets: PresetPatient[];
  /** Último día con citas (incluye las próximas dos semanas si la cuenta sigue activa). Lo fija la suscripción. */
  activityEndDay: number;
  /** Último momento en que el equipo pudo entrar (NOW si la cuenta sigue activa). */
  accessEndMs: number;
  row: Prisma.OrganizationCreateManyInput;
};

export function activeAt(s: Staff, ms: number): boolean {
  return s.startMs <= ms && (s.leftMs == null || ms < s.leftMs);
}

/** Psicólogos activos un día dado (asientos de la factura del plan Centro). */
export function professionalsOn(org: OrgState, day: number): number {
  const ms = limaTime(day, 12 * 60);
  return org.staff.filter((s) => s.isProfessional && activeAt(s, ms)).length;
}

/** En regiones pesan más los apellidos locales; en Lima basta la lista general. */
export function surname(rng: Rng, region: OrgSpec["region"]): string {
  return rng.chance(region === "lima" ? 0.08 : 0.4) ? rng.pick(REGIONAL_SURNAMES[region]) : rng.pick(COMMON_SURNAMES);
}

function personName(rng: Rng, sex: Sex, region: OrgSpec["region"]) {
  const first = rng.pick(sex === "F" ? FEMALE_NAMES : MALE_NAMES);
  const s1 = surname(rng, region);
  let s2 = surname(rng, region);
  if (s2 === s1) s2 = rng.pick(COMMON_SURNAMES);
  return { first, s1, s2, display: rng.chance(0.75) ? `${first} ${s1}` : `${first} ${s1} ${s2}` };
}

/** Precio de una sesión suelta en el distrito (céntimos). */
function basePrice(rng: Rng, spec: OrgSpec): number {
  if (spec.region === "lima") {
    const high = ["Miraflores", "San Isidro", "Santiago de Surco", "San Borja", "Barranco", "La Molina"];
    const mid = ["Jesús María", "Lince", "Magdalena del Mar", "Pueblo Libre", "San Miguel", "Surquillo", "Breña", "Chorrillos"];
    const [lo, hi] = high.includes(spec.district) ? [130, 170] : mid.includes(spec.district) ? [90, 120] : [60, 80];
    return roundSoles(rng.int(lo, hi) * 100);
  }
  const [lo, hi] = CITIES[spec.region].sessionPrice;
  return roundSoles(rng.int(lo, hi) * 100);
}

function pricesFor(base: number, specialty: SpecialtyKey | null): Prices {
  const factor = specialty === "pareja" ? 1.15 : specialty === "neuro" ? 1.1 : 1;
  const single = roundSoles(base * factor);
  return {
    single,
    p4: roundSoles(single * 4 * 0.92),
    p8: roundSoles(single * 8 * 0.85),
    evaluation: roundSoles(single * 4 * 1.15),
  };
}

function agesOf(specialty: SpecialtyKey | null): Set<AgeGroup> {
  const ages = new Set<AgeGroup>();
  if (!specialty) return ages;
  for (const [theme, weight] of SPECIALTIES[specialty].themes) {
    if (weight >= 2) for (const age of THEMES[theme].ages) ages.add(age);
  }
  return ages;
}

const WEEKDAYS = [0, 1, 2, 3, 4];

/** Horario semanal del profesional según su especialidad y si trabaja por su cuenta. */
function buildSlots(rng: Rng, specialty: SpecialtyKey | null, kind: "centro" | "independiente" | "director", offset: number): Slot[] {
  const children = specialty === "infantil" || specialty === "neuro" || specialty === "adolescentes";
  let days: number[];
  let hours: number[];
  let saturday: number[] = [];
  if (kind === "director") {
    days = rng.sample(WEEKDAYS, rng.int(2, 3)).sort();
    hours = rng.pick([[9, 10, 11], [16, 17, 18], [15, 16, 17, 18]]);
  } else if (kind === "independiente") {
    days = WEEKDAYS;
    hours = rng.pick([[17, 18, 19, 20], [8, 17, 18, 19, 20], [9, 10, 11, 16, 17, 18, 19]]);
    if (rng.chance(0.6)) saturday = [9, 10, 11];
  } else {
    days = rng.weighted([[WEEKDAYS, 4], [rng.sample(WEEKDAYS, 4).sort(), 3], [rng.sample(WEEKDAYS, 3).sort(), 3]] as const);
    hours = children
      ? rng.pick([[15, 16, 17, 18], [14, 15, 16, 17, 18]])
      : rng.pick([[9, 10, 11, 12], [15, 16, 17, 18], [17, 18, 19, 20], [9, 10, 11, 15, 16, 17]]);
    if (children ? rng.chance(0.6) : rng.chance(0.25)) saturday = [9, 10, 11, 12];
  }
  const slots: Slot[] = [];
  for (const dow of days) for (const h of hours) slots.push({ dow, min: h * 60 + offset });
  for (const h of saturday) slots.push({ dow: 5, min: h * 60 + offset });
  return slots;
}

function slotsFromTimes(times: string[], saturday: string[] = []): Slot[] {
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const slots: Slot[] = [];
  for (const dow of WEEKDAYS) for (const t of times) slots.push({ dow, min: toMin(t) });
  for (const t of saturday) slots.push({ dow: 5, min: toMin(t) });
  return slots;
}

function nextLicense(ctx: Ctx): string {
  let n = ctx.rng.int(9000, 45000);
  while (ctx.licenses.has(n)) n = ctx.rng.int(9000, 45000);
  ctx.licenses.add(n);
  return `C.Ps.P. ${n}`;
}

type StaffDraft = {
  name: string;
  email: string;
  role: Role;
  sex: Sex;
  specialty: SpecialtyKey | null;
  specialtyLabel?: string;
  licenseNumber?: string;
  calendarColor?: string;
  phone?: string;
  startMs: number;
  leftMs?: number | null;
  slots?: Slot[];
  capacity?: number;
  roomIdx?: number | null;
  prices?: Prices;
  cohort?: boolean;
};

export function buildOrg(ctx: Ctx, spec: OrgSpec): OrgState {
  const { rng } = ctx;
  const demo = spec.demo;
  const signupDay = TODAY - spec.daysAgo;
  // Las cuentas demo conservan la hora exacta para que la prueba de Bienestar termine en 5 días justos.
  const createdMs = demo ? NOW - spec.daysAgo * DAY : limaTime(signupDay, rng.int(8 * 60, 21 * 60));
  const orgId = ctx.id();
  const offset = demo ? 0 : rng.chance(0.25) ? 30 : 0;
  const base = basePrice(rng, spec);
  const upgradeMs = spec.sub.upgrade ? limaTime(signupDay + spec.sub.upgrade.at, rng.int(9 * 60, 17 * 60)) : null;
  const colors = rng.shuffle(CALENDAR_COLORS.map((c) => c.value));
  const later = (fromDay: number, toDay: number) => limaTime(rng.int(fromDay, Math.max(fromDay, toDay)), rng.int(9 * 60, 18 * 60));

  // ---------- Consultorios ----------
  const rooms: RoomState[] = [];
  const roomRows: Prisma.RoomCreateManyInput[] = [];
  const childFocus = spec.specialties.some((s) => s === "infantil" || s === "neuro");
  let roomDefs: { name: string; description: string | null; active: boolean; createdMs: number }[];
  if (demo) {
    roomDefs = demo.rooms.map(([name, description]) => ({ name, description, active: true, createdMs }));
  } else if (spec.type === "INDIVIDUAL" && !spec.sub.upgrade) {
    roomDefs = spec.rooms ? [{ name: rng.pick(["Consultorio", "Consultorio principal"]), description: null, active: true, createdMs }] : [];
  } else {
    const extras: { name: string; description: string }[] = [];
    if (childFocus && spec.rooms >= 2) extras.push({ name: "Sala de terapia infantil", description: "Con alfombra, juguetes y caja de arena" });
    if (spec.rooms >= 4) extras.push({ name: "Sala familiar", description: "Ambiente amplio para terapia familiar y de pareja" });
    const numbered = spec.rooms - extras.length;
    roomDefs = [];
    for (let i = 1; i <= numbered; i++) {
      const inactive = spec.inactiveRoom && i === numbered;
      roomDefs.push({ name: `Consultorio ${i}`, description: inactive ? "Fuera de servicio por remodelación" : null, active: !inactive, createdMs });
    }
    roomDefs.push(...extras.map((e) => ({ ...e, active: true, createdMs })));
    // Al pasar de independiente a centro se habilitaron los demás ambientes.
    if (upgradeMs) roomDefs.forEach((r, i) => i > 0 && (r.createdMs = upgradeMs));
  }
  for (const r of roomDefs) {
    const id = ctx.id();
    rooms.push({ id, name: r.name, active: r.active, forChildren: r.name.includes("infantil") || r.name.includes("familiar") });
    roomRows.push({ id, organizationId: orgId, name: r.name, description: r.description, active: r.active, createdAt: new Date(r.createdMs + rng.int(5, 60) * MINUTE) });
  }
  const activeRoomIdx = rooms.flatMap((r, i) => (r.active ? [i] : []));

  // ---------- Equipo ----------
  const drafts: StaffDraft[] = [];
  const domain = spec.domain;
  const hireWindowEnd = TODAY - 25;

  if (demo) {
    demo.users.forEach((u: FixedUser, i) => {
      drafts.push({
        name: u.name,
        email: u.email,
        role: u.role,
        sex: u.sex,
        specialty: u.specialty ?? null,
        specialtyLabel: u.specialtyLabel,
        licenseNumber: u.licenseNumber,
        calendarColor: u.calendarColor,
        phone: u.phone,
        startMs: createdMs + i * 7 * MINUTE,
        slots: u.times ? slotsFromTimes(u.times, u.saturday) : undefined,
        capacity: u.capacity,
        roomIdx: u.room ?? null,
        prices: u.prices ? { ...u.prices, evaluation: roundSoles(u.prices.single * 4.4) } : undefined,
        cohort: true,
      });
      ctx.emails.add(u.email);
    });
  } else if (spec.founder) {
    const f = spec.founder;
    const first = f.first;
    drafts.push({
      name: `${first} ${f.last.split(" ")[0]}`,
      email: uniqueEmail(ctx, slug(first.split(" ")[0]!), domain),
      role: "ADMIN",
      sex: f.sex,
      specialty: f.specialty,
      startMs: createdMs,
      cohort: true,
    });
    if (spec.assistant) {
      const p = personName(rng, "F", spec.region);
      drafts.push({ name: p.display, email: uniqueEmail(ctx, "agenda", domain), role: "RECEPCION", sex: "F", specialty: null, startMs: later(signupDay + 20, signupDay + 70) });
    }
  } else {
    const adminSex: Sex = rng.chance(0.6) ? "F" : "M";
    const p = personName(rng, adminSex, spec.region);
    drafts.push({
      name: p.display,
      email: uniqueEmail(ctx, spec.adminAttends ? `${slug(p.first.split(" ")[0]!)}.${slug(p.s1)}` : rng.pick(["administracion", "gerencia", `${slug(p.first.split(" ")[0]!)}.${slug(p.s1)}`]), domain),
      role: "ADMIN",
      sex: adminSex,
      specialty: spec.adminAttends ? spec.specialties[0]! : null,
      startMs: createdMs,
      cohort: true,
    });
  }

  if (!demo && spec.type === "CENTRO") {
    const attendsAlready = spec.adminAttends || !!spec.founder;
    const count = spec.psychologists - (attendsAlready ? 1 : 0);
    const specs = spec.specialties.slice(attendsAlready ? 1 : 0);
    const hires = spec.laterHires ?? 0;
    for (let i = 0; i < count; i++) {
      const sex: Sex = rng.chance(0.75) ? "F" : "M";
      const p = personName(rng, sex, spec.region);
      const specialty = specs[i % Math.max(1, specs.length)] ?? spec.specialties[0]!;
      let startMs = createdMs + rng.int(10, 600) * MINUTE;
      let cohort = true;
      if (upgradeMs) {
        startMs = upgradeMs + rng.int(0, 3) * DAY;
        cohort = false;
      } else if (i >= count - hires) {
        startMs = later(signupDay + 100, hireWindowEnd);
        cohort = false;
      }
      drafts.push({ name: p.display, email: uniqueEmail(ctx, `${slug(p.first.split(" ")[0]!)}.${slug(p.s1)}`, domain), role: "PSICOLOGO", sex, specialty, startMs, cohort });
    }
    if (spec.leaver) {
      const sex: Sex = rng.chance(0.75) ? "F" : "M";
      const p = personName(rng, sex, spec.region);
      const leftDay = rng.int(signupDay + 110, Math.min(TODAY - 40, signupDay + spec.daysAgo - 40));
      drafts.push({
        name: p.display,
        email: uniqueEmail(ctx, `${slug(p.first.split(" ")[0]!)}.${slug(p.s1)}`, domain),
        role: "PSICOLOGO",
        sex,
        specialty: rng.pick(spec.specialties),
        startMs: createdMs + rng.int(10, 600) * MINUTE,
        leftMs: limaTime(leftDay, 19 * 60),
        cohort: true,
      });
    }
    const deskLocals = ["recepcion", "citas", "informes"];
    let replacedMs: number | null = null;
    if (spec.receptionLeaver) {
      const p = personName(rng, "F", spec.region);
      replacedMs = limaTime(rng.int(signupDay + 120, signupDay + 200), 18 * 60);
      drafts.push({ name: p.display, email: uniqueEmail(ctx, `${slug(p.first.split(" ")[0]!)}.${slug(p.s1)}`, domain), role: "RECEPCION", sex: "F", specialty: null, startMs: createdMs + HOUR, leftMs: replacedMs });
    }
    for (let i = 0; i < spec.reception; i++) {
      const sex: Sex = rng.chance(0.85) ? "F" : "M";
      const p = personName(rng, sex, spec.region);
      let startMs = upgradeMs ? upgradeMs + DAY : createdMs + rng.int(30, 900) * MINUTE;
      if (replacedMs && i === spec.reception - 1) startMs = replacedMs + 2 * DAY;
      drafts.push({ name: p.display, email: uniqueEmail(ctx, deskLocals[i] ?? `recepcion${i + 1}`, domain), role: "RECEPCION", sex, specialty: null, startMs });
    }
  }

  // ---------- Filas de usuario ----------
  const staff: Staff[] = drafts.map((d, i) => {
    const id = ctx.id();
    const isProfessional = d.specialty != null;
    const independent = spec.type === "INDIVIDUAL" || (!!spec.founder && d.role === "ADMIN");
    const kind = independent ? "independiente" : d.role === "ADMIN" ? "director" : "centro";
    const slots = isProfessional ? (d.slots ?? buildSlots(rng, d.specialty, kind, offset)) : [];
    const rawCapacity = d.capacity ?? (kind === "independiente" ? rng.int(9, 14) : kind === "director" ? rng.int(3, 6) : rng.int(7, 12));
    const capacity = isProfessional ? Math.max(2, Math.min(Math.round(rawCapacity * CAPACITY_FACTOR), Math.floor(slots.length * 0.8))) : 0;
    const childRoom = rooms.findIndex((r) => r.active && r.forChildren);
    const roomIdx =
      d.roomIdx !== undefined && d.roomIdx !== null
        ? d.roomIdx
        : activeRoomIdx.length === 0
          ? null
          : (d.specialty === "infantil" || d.specialty === "neuro") && childRoom >= 0
            ? childRoom
            : activeRoomIdx[i % activeRoomIdx.length]!;
    const prices = d.prices ?? pricesFor(base, d.specialty);
    const startDay = limaDay(d.startMs);
    const row: Prisma.UserCreateManyInput = {
      id,
      organizationId: orgId,
      name: d.name,
      email: d.email,
      passwordHash: ctx.passwordHash,
      role: d.role,
      isProfessional,
      specialty: isProfessional ? (d.specialtyLabel ?? SPECIALTIES[d.specialty!].label) : null,
      licenseNumber: isProfessional ? (d.licenseNumber ?? nextLicense(ctx)) : null,
      phone: d.phone !== undefined ? d.phone : demo ? null : mobile(rng),
      calendarColor: d.calendarColor ?? (isProfessional ? colors[i % colors.length]! : DEFAULT_CALENDAR_COLOR),
      active: d.leftMs == null,
      lastLoginAt: null,
      createdAt: new Date(d.startMs),
      updatedAt: new Date(d.leftMs ?? d.startMs),
    };
    return {
      id,
      name: d.name,
      email: d.email,
      role: d.role,
      sex: d.sex,
      isProfessional,
      specialty: d.specialty,
      startMs: d.startMs,
      startDay,
      leftMs: d.leftMs ?? null,
      slots,
      capacity,
      roomIdx,
      prices,
      cohort: d.cohort ?? false,
      ages: agesOf(d.specialty),
      row,
    };
  });

  // ---------- Organización ----------
  const isCenter = spec.type === "CENTRO";
  const founder = staff[0]!;
  const city = CITIES[spec.region];
  const address = demo
    ? demo.address
    : `${rng.pick(city.streets)} ${rng.int(1, 38) * 50 + rng.int(0, 49)}${rng.chance(0.5) ? `, of. ${rng.int(2, 7)}0${rng.int(1, 4)}` : ""}, ${spec.district}`;
  const configuredMs = Math.min(NOW - HOUR, createdMs + rng.int(1, 20) * DAY);
  const row: Prisma.OrganizationCreateManyInput = {
    id: orgId,
    name: spec.name,
    type: spec.type,
    phone: demo ? demo.phone : mobile(rng),
    email: demo ? demo.email : isCenter ? `${rng.pick(["contacto", "informes", "citas"])}@${domain}` : founder.email,
    address,
    ruc: demo ? demo.ruc : isCenter ? ruc(rng, "20") : rng.chance(0.5) ? ruc(rng, "10") : null,
    renewalThreshold: demo ? 1 : rng.weighted([[1, 7], [2, 3]] as const),
    defaultSessionMinutes: demo ? 50 : rng.weighted([[50, 5], [45, 2], [60, 3]] as const),
    noShowConsumesSession: demo ? false : rng.chance(0.3),
    reminderTemplate: !demo && rng.chance(0.35) ? rng.pick(REMINDER_TEMPLATES) : null,
    renewalTemplate: !demo && rng.chance(0.25) ? rng.pick(RENEWAL_TEMPLATES) : null,
    createdAt: new Date(createdMs),
    updatedAt: new Date(demo ? createdMs : configuredMs),
  };

  ctx.rows.organizations.push(row);
  ctx.rows.users.push(...staff.map((s) => s.row));
  ctx.rows.rooms.push(...roomRows);

  return {
    spec,
    id: orgId,
    type: spec.type,
    createdMs,
    signupDay,
    minutes: row.defaultSessionMinutes!,
    noShowConsumes: row.noShowConsumesSession!,
    renewalThreshold: row.renewalThreshold!,
    staff,
    admin: founder,
    rooms,
    presets: demo?.patients ?? [],
    activityEndDay: TODAY + 14,
    accessEndMs: NOW,
    row,
  };
}

/** Último acceso de cada usuario (en horario de trabajo): reciente si la cuenta sigue activa, antiguo si la dejó. */
export function setLastLogins(ctx: Ctx, org: OrgState): void {
  const { rng } = ctx;
  for (const s of org.staff) {
    const end = Math.min(org.accessEndMs, s.leftMs ?? Infinity);
    const daysBack = org.spec.demo
      ? 0
      : end < NOW
        ? rng.int(0, 3)
        : s.role === "PSICOLOGO"
          ? rng.weighted([[0, 4], [rng.int(1, 3), 4], [rng.int(4, 10), 2]] as const)
          : rng.weighted([[0, 6], [1, 3], [rng.int(2, 3), 1]] as const);
    let last = limaTime(limaDay(end) - daysBack, rng.int(7 * 60, 22 * 60 + 30));
    if (last > end) last = end - rng.int(5, 120) * MINUTE;
    if (last < s.startMs) last = Math.min(end, s.startMs + HOUR);
    s.row.lastLoginAt = new Date(Math.min(last, NOW - MINUTE));
  }
}
