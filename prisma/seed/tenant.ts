// Datos de cada consultorio: se simula la agenda semana a semana por profesional (llegadas, sesiones,
// cancelaciones, altas, abandonos y traspasos) y luego se generan las filas de pacientes, historias,
// citas, notas, paquetes, pagos y la bitácora de tratantes.
//
// Reglas que se respetan por construcción:
//   - Grilla horaria por organización (duración <= 60 min): dos citas no se cruzan si no comparten
//     inicio. `busy` guarda profesional@inicio, consultorio@inicio y paciente@inicio.
//   - Paquetes como en src/lib/domain/packages.ts: usadas = ATENDIDA (+ NO_ASISTIO si la organización
//     lo configura); una cita solo ocupa cupo si el paquete lo tiene; si no, queda sin paquete.
//   - Pagos nunca superan el precio del paquete.
import type { AppointmentStatus, DocumentType, Modality, PackageStatus, PatientStatus, PaymentMethod, RiskLevel, Sex as SexEnum } from "@prisma/client";
import {
  CHILD_MEDICATION,
  CLOSERS,
  CLOSING_SESSION,
  FAMILY_HISTORY,
  FIRST_SESSION,
  FIRST_SESSION_FIELDS,
  MEDICATION,
  MENTAL_STATUS,
  MOODS,
  OPENERS,
  PERSONAL_HISTORY,
  PREVIOUS_TREATMENTS,
  RISK_NOTES,
  SPECIALTIES,
  SUBSTANCE_USE,
  THEMES,
  TRANSFER_SESSION,
  type AgeGroup,
  type ThemeKey,
} from "./catalog/clinical";
import {
  ADULT_ADMIN_NOTES,
  ADULT_EDUCATION,
  APPOINTMENT_NOTES,
  CANCEL_REASONS,
  CHILD_REFERRAL_SOURCES,
  EMERGENCY_RELATIONSHIPS,
  MARITAL_STATUS,
  MINOR_ADMIN_NOTES,
  PAUSE_NOTES,
  REFERRAL_SOURCES,
} from "./catalog/operations";
import type { PresetPatient, Sex } from "./catalog/orgs";
import {
  CHILD_FEMALE_NAMES,
  CHILD_MALE_NAMES,
  COMMON_SURNAMES,
  FEMALE_NAMES,
  MALE_NAMES,
  MIGRANT_FEMALE_NAMES,
  MIGRANT_MALE_NAMES,
  MIGRANT_SURNAMES,
  OCCUPATIONS,
  TEEN_FEMALE_NAMES,
  TEEN_MALE_NAMES,
} from "./catalog/people";
import { CITIES, zoneOf } from "./catalog/places";
import { mobile, roundSoles, slug, type Ctx } from "./context";
import { activeAt, surname, type OrgState, type Slot, type Staff } from "./org";
import { DAY, HOUR, MINUTE, NOW, TODAY, dateOnly, isHoliday, limaDay, limaTime, mondayOf, monthOf, weekday } from "./time";

/** Llegada de pacientes nuevos según el mes (verano y fiestas bajan; marzo y abril suben). */
const SEASON = [0, 0.7, 0.75, 1.25, 1.15, 1.05, 1, 0.95, 1, 1.05, 1, 0.95, 0.75];

type SimAppt = {
  id: string;
  start: number;
  end: number;
  prof: Staff;
  roomId: string | null;
  status: AppointmentStatus;
  modality: Modality;
  /** Cuándo avisó el paciente (solo canceladas). */
  cancelMs: number | null;
  /** Si reprograma una cita cancelada: cuándo se canceló aquella. */
  rebookedAfter: number | null;
};

type SimPatient = {
  id: string;
  age: AgeGroup;
  sex: Sex;
  theme: ThemeKey;
  migrant: boolean;
  pref: 1 | 4 | 8;
  modality: "presencial" | "virtual" | "mixto";
  freq: 1 | 2;
  planned: number;
  done: number;
  future: number;
  /** Sesiones previas a Neuvi (pacientes que el profesional ya atendía). */
  prior: number;
  createdMs: number;
  status: PatientStatus;
  statusMs: number;
  history: { prof: Staff; fromMs: number; by: Staff }[];
  appts: SimAppt[];
  slot: Slot | null;
  nextWeek: number;
  noShows: number;
  transferAt: number | null;
  wantsTransfer: boolean;
  preset: PresetPatient | null;
  dropAfter: number | null;
  /** Sin salidas aleatorias (pacientes con nombre de las cuentas demo). */
  steady: boolean;
};

type Incoming = Map<string, { patient: SimPatient; week: number }[]>;

function desks(org: OrgState, ms: number): Staff[] {
  return org.staff.filter((s) => s.role === "RECEPCION" && activeAt(s, ms));
}

/** Quién registra algo en la agenda o en caja en ese momento. */
function frontOffice(ctx: Ctx, org: OrgState, prof: Staff, ms: number): Staff {
  const { rng } = ctx;
  const d = desks(org, ms);
  const r = rng.next();
  if (org.type === "INDIVIDUAL") return d.length > 0 && r < 0.45 ? d[0]! : prof;
  if (d.length > 0 && r < 0.72) return rng.pick(d);
  if (r < 0.86 || !activeAt(prof, ms)) return org.admin;
  return prof;
}

/** Quién hace un traspaso: otro administrador o recepción, nunca el nuevo tratante. */
function transferBy(ctx: Ctx, org: OrgState, target: Staff, ms: number): Staff | null {
  const options = org.staff.filter((s) => (s.role === "ADMIN" || s.role === "RECEPCION") && s.id !== target.id && activeAt(s, ms));
  if (options.length === 0) return null;
  const admin = options.find((s) => s.role === "ADMIN");
  return admin && ctx.rng.chance(0.5) ? admin : ctx.rng.pick(options);
}

// ---------------------------------------------------------------------------
// Simulación de agenda
// ---------------------------------------------------------------------------

function simulate(ctx: Ctx, org: OrgState): SimPatient[] {
  const profs = org.staff.filter((s) => s.isProfessional);
  // Quien deja el centro va primero: sus pacientes se traspasan a profesionales simulados después.
  const order = [...profs.filter((p) => p.leftMs != null), ...ctx.rng.shuffle(profs.filter((p) => p.leftMs == null))];
  const incoming: Incoming = new Map();
  const busy = new Set<string>();
  const all: SimPatient[] = [];
  order.forEach((prof, i) => simulateProfessional(ctx, org, prof, order.slice(i + 1), incoming, busy, all));
  return all;
}

function simulateProfessional(ctx: Ctx, org: OrgState, prof: Staff, later: Staff[], incoming: Incoming, busy: Set<string>, all: SimPatient[]): void {
  const { rng } = ctx;
  const leftDay = prof.leftMs != null ? limaDay(prof.leftMs) : null;
  const firstDay = Math.max(prof.startDay, org.signupDay);
  const lastDay = Math.min(leftDay ?? Infinity, org.activityEndDay);
  if (lastDay < firstDay || prof.slots.length === 0) return;

  const owner = new Map<string, SimPatient>();
  const key = (s: Slot) => `${s.dow}:${s.min}`;
  let active: SimPatient[] = [];
  const activeRooms = org.rooms.filter((r) => r.active);
  const preferred = prof.roomIdx != null ? org.rooms[prof.roomIdx] : undefined;
  const roomOrder = preferred?.active ? [preferred, ...activeRooms.filter((r) => r !== preferred)] : activeRooms;
  const firstWeek = mondayOf(firstDay);
  const presets = org.presets.filter((x) => x.professional === prof.email);
  const newcomersWeek = mondayOf(TODAY) - 7;

  const takeSlot = (p: SimPatient, week: number): boolean => {
    const free = prof.slots.filter((s) => !owner.has(key(s)));
    if (free.length === 0) return false;
    const afterSchool = free.filter((s) => s.dow === 5 || s.min >= 15 * 60);
    const slot = rng.pick(p.age !== "adulto" && afterSchool.length > 0 ? afterSchool : free);
    p.slot = slot;
    p.nextWeek = week;
    owner.set(key(slot), p);
    return true;
  };

  const release = (p: SimPatient) => {
    if (p.slot && owner.get(key(p.slot)) === p) owner.delete(key(p.slot));
    active = active.filter((x) => x !== p);
  };

  // Si nadie pudo marcar el cambio (la cuenta ya no tenía acceso), el paciente queda ACTIVO.
  const finish = (p: SimPatient, status: PatientStatus, ms: number) => {
    release(p);
    const at = Math.min(ms, NOW - HOUR);
    if (ms > org.accessEndMs) return;
    p.status = status;
    p.statusMs = at;
  };

  const newPatient = (week: number, cohort: boolean, preset: PresetPatient | null): SimPatient | null => {
    const specialty = SPECIALTIES[prof.specialty!];
    let theme: ThemeKey;
    let age: AgeGroup;
    if (preset) {
      age = preset.minor ? "nino" : "adulto";
      const options = specialty.themes.filter(([t]) => (THEMES[t].ages as readonly AgeGroup[]).includes(age));
      theme = rng.weighted(options.length > 0 ? options : specialty.themes);
    } else {
      theme = rng.weighted(specialty.themes);
      age = rng.pick(THEMES[theme].ages);
    }
    const migrant = !preset && age === "adulto" && rng.chance(0.06);
    if (migrant && rng.chance(0.4)) theme = "migracion";
    const sex: Sex = preset ? preset.sex : age === "nino" ? (rng.chance(0.58) ? "M" : "F") : rng.chance(0.62) ? "F" : "M";
    let planned = cohort
      ? rng.int(8, 32)
      : rng.weighted([[rng.int(1, 3), 3], [rng.int(4, 8), 12], [rng.int(9, 16), 30], [rng.int(17, 32), 40], [rng.int(33, 52), 15]] as const);
    let dropAfter: number | null = null;
    if (preset?.kind === "regular") planned = 60;
    if (preset?.kind === "nuevo") planned = 20;
    if (preset?.kind === "alta") planned = rng.int(6, 8);
    if (preset?.kind === "abandono") {
      planned = 60;
      dropAfter = rng.int(3, 5);
    }
    const p: SimPatient = {
      id: ctx.id(),
      age,
      sex,
      theme,
      migrant,
      pref: theme === "neuro" ? 4 : rng.weighted([[1, 22], [4, 48], [8, 30]] as const),
      modality:
        org.rooms.length === 0 && org.type === "INDIVIDUAL" && rng.chance(0.3)
          ? "virtual"
          : age === "adulto"
            ? rng.weighted([["presencial", 62], ["mixto", 22], ["virtual", 16]] as const)
            : rng.weighted([["presencial", 85], ["mixto", 15]] as const),
      freq: age !== "nino" && !preset && rng.chance(0.07) ? 2 : 1,
      planned,
      done: 0,
      future: 0,
      prior: cohort ? rng.int(2, 18) : 0,
      createdMs: 0,
      status: "ACTIVO",
      statusMs: 0,
      history: [],
      appts: [],
      slot: null,
      nextWeek: week,
      noShows: 0,
      transferAt: !preset && org.type === "CENTRO" && later.length > 0 && rng.chance(0.1) ? rng.int(2, Math.max(2, planned - 2)) : null,
      wantsTransfer: false,
      preset,
      dropAfter,
      steady: !!preset,
    };
    if (!takeSlot(p, week)) return null;
    const floor = Math.max(org.createdMs, prof.startMs) + 30 * MINUTE;
    const firstStart = limaTime(week + p.slot!.dow, p.slot!.min);
    const wanted = cohort ? floor + rng.int(20, 3 * 24 * 60) * MINUTE : firstStart - rng.int(1, 6) * DAY - rng.int(0, 10) * HOUR;
    p.createdMs = Math.min(NOW - rng.int(10, 600) * MINUTE, Math.max(floor, wanted));
    if (p.createdMs < floor) p.createdMs = Math.min(NOW - 5 * MINUTE, floor);
    p.history.push({ prof, fromMs: p.createdMs, by: frontOffice(ctx, org, prof, p.createdMs) });
    active.push(p);
    all.push(p);
    return p;
  };

  const book = (p: SimPatient, start: number, forced?: AppointmentStatus): SimAppt | null => {
    const end = start + org.minutes * MINUTE;
    if (busy.has(`${prof.id}@${start}`) || busy.has(`${p.id}@${start}`)) return null;
    let status: AppointmentStatus;
    if (end <= NOW) {
      if (forced) status = forced;
      else {
        const r = rng.next();
        status = r < 0.075 ? "CANCELADA" : r < 0.13 ? "NO_ASISTIO" : "ATENDIDA";
      }
    } else {
      if (p.future >= p.planned - p.done) return null;
      p.future++;
      status = start <= NOW || (start - NOW < 2 * DAY && rng.chance(0.6)) ? "CONFIRMADA" : "PROGRAMADA";
    }
    let modality: Modality = p.modality === "virtual" || (p.modality === "mixto" && rng.chance(0.35)) ? "VIRTUAL" : "PRESENCIAL";
    let roomId: string | null = null;
    if (modality === "PRESENCIAL" && roomOrder.length > 0) {
      const room = roomOrder.find((r) => !busy.has(`${r.id}@${start}`));
      if (room) roomId = room.id;
      else modality = "VIRTUAL";
    }
    busy.add(`${prof.id}@${start}`);
    busy.add(`${p.id}@${start}`);
    if (roomId) busy.add(`${roomId}@${start}`);
    const cancelMs = status === "CANCELADA" ? start - rng.int(3, 40) * HOUR : null;
    const appt: SimAppt = { id: ctx.id(), start, end, prof, roomId, status, modality, cancelMs, rebookedAfter: null };
    p.appts.push(appt);
    return appt;
  };

  const afterSession = (p: SimPatient, a: SimAppt) => {
    if (a.end > NOW) return;
    if (a.status === "ATENDIDA") {
      p.done++;
      p.noShows = 0;
      if (p.dropAfter != null && p.done >= p.dropAfter) return finish(p, "ABANDONO", a.end + rng.int(10, 20) * DAY);
      if (p.done >= p.planned) return finish(p, "ALTA", a.end + rng.int(10, 120) * MINUTE);
      if (!p.steady) {
        if (rng.chance(p.done <= 2 ? 0.03 : 0.009)) return finish(p, "ABANDONO", a.end + rng.int(14, 30) * DAY);
        if (rng.chance(0.005)) return finish(p, "EN_PAUSA", a.end + rng.int(1, 6) * DAY);
      }
      if (p.transferAt === p.done) p.wantsTransfer = true;
      // Al final del proceso las sesiones se espacian.
      if (p.freq === 1 && p.planned >= 10 && p.planned - p.done <= 3) p.freq = 2;
    } else if (a.status === "NO_ASISTIO") {
      p.noShows++;
      if (!p.steady && (p.noShows >= 2 || rng.chance(0.08))) finish(p, "ABANDONO", a.end + rng.int(14, 30) * DAY);
    }
  };

  /** Reprograma una cita cancelada en otro horario libre de la misma semana. */
  const rebook = (p: SimPatient, cancelled: SimAppt, week: number) => {
    const cancelMs = cancelled.cancelMs ?? cancelled.start;
    if (!active.includes(p)) return;
    for (let day = limaDay(cancelled.start) + 1; day <= Math.min(week + 5, lastDay); day++) {
      if (isHoliday(day)) continue;
      const options = rng.shuffle(prof.slots.filter((s) => s.dow === weekday(day)));
      for (const s of options) {
        const start = limaTime(day, s.min);
        if (start <= cancelMs + 2 * HOUR) continue;
        const past = start + org.minutes * MINUTE <= NOW;
        const b = book(p, start, past ? (rng.chance(0.92) ? "ATENDIDA" : "NO_ASISTIO") : undefined);
        if (!b) continue;
        b.rebookedAfter = cancelMs;
        afterSession(p, b);
        return;
      }
    }
  };

  const transfer = (p: SimPatient, week: number, leaving: boolean) => {
    p.wantsTransfer = false;
    const targetWeek = week + 7;
    const lastEnd = p.appts.at(-1)?.end ?? p.createdMs;
    const changeMs = Math.min(NOW - HOUR, Math.max(lastEnd + HOUR, limaTime(week + 4, rng.int(9 * 60, 18 * 60))));
    const fits = later.filter(
      (t) => t.startMs <= limaTime(targetWeek, 0) && (t.leftMs == null || t.leftMs > limaTime(targetWeek + 28, 0)) && t.ages.has(p.age),
    );
    const target = fits.length > 0 && !(leaving && rng.chance(0.15)) ? rng.pick(fits) : null;
    const by = target ? transferBy(ctx, org, target, changeMs) : null;
    if (!target || !by) {
      if (leaving) finish(p, "ABANDONO", changeMs + rng.int(2, 7) * DAY);
      return;
    }
    release(p);
    p.history.push({ prof: target, fromMs: changeMs, by });
    if (!incoming.has(target.id)) incoming.set(target.id, []);
    incoming.get(target.id)!.push({ patient: p, week: targetWeek });
  };

  const queue = incoming.get(prof.id) ?? [];
  const leavesHere = leftDay != null && leftDay <= org.activityEndDay;

  for (let w = firstWeek; w <= lastDay; w += 7) {
    for (const item of queue) {
      if (item.week !== w) continue;
      if (takeSlot(item.patient, w)) active.push(item.patient);
      else if (item.patient.history.at(-1)!.fromMs + 3 * DAY <= org.accessEndMs) {
        item.patient.status = "ABANDONO";
        item.patient.statusMs = Math.min(NOW - HOUR, item.patient.history.at(-1)!.fromMs + 3 * DAY);
      }
    }

    if (w === firstWeek) {
      if (prof.cohort) {
        const n = Math.max(0, Math.round(prof.capacity * rng.float(0.35, 0.55)) - presets.length);
        for (let i = 0; i < n; i++) newPatient(w, true, null);
      }
      for (const pre of presets) if (pre.kind !== "nuevo") newPatient(w, true, pre);
    } else if (w + 4 <= lastDay && w <= TODAY + 7) {
      if (w === newcomersWeek) for (const pre of presets) if (pre.kind === "nuevo") newPatient(w, false, pre);
      const free = prof.capacity - active.length;
      if (free > 0) {
        const chance = Math.min(0.7, 0.2 + 0.1 * free) * SEASON[monthOf(w + 3)]!;
        if (rng.chance(chance)) newPatient(w, false, null);
        if (free > 2 && rng.chance(chance * 0.3)) newPatient(w, false, null);
      }
    }

    const rebooks: { p: SimPatient; a: SimAppt }[] = [];
    for (const p of [...active]) {
      if (p.nextWeek > w || !p.slot) continue;
      p.nextWeek = w + 7 * p.freq;
      const day = w + p.slot.dow;
      if (day < firstDay || day > lastDay || isHoliday(day)) continue;
      const start = limaTime(day, p.slot.min);
      if (start < p.createdMs + HOUR) {
        p.nextWeek = w + 7;
        continue;
      }
      const a = book(p, start);
      if (!a) continue;
      if (a.status === "CANCELADA" && rng.chance(0.6)) rebooks.push({ p, a });
      else afterSession(p, a);
    }
    for (const r of rebooks) rebook(r.p, r.a, w);

    const leaving = leavesHere && w + 7 > lastDay;
    for (const p of [...active]) {
      if (!leaving && !p.wantsTransfer) continue;
      if (w + 7 > TODAY) {
        p.wantsTransfer = false;
        continue;
      }
      transfer(p, w, leaving);
    }
  }
}

// ---------------------------------------------------------------------------
// Filas
// ---------------------------------------------------------------------------

function surnameOf(ctx: Ctx, org: OrgState): string {
  return surname(ctx.rng, org.spec.region);
}

function paymentMethod(ctx: Ctx, org: OrgState): PaymentMethod {
  return org.spec.region === "lima"
    ? ctx.rng.weighted([["YAPE", 38], ["EFECTIVO", 15], ["TRANSFERENCIA", 20], ["PLIN", 12], ["TARJETA", 15]] as const)
    : ctx.rng.weighted([["YAPE", 40], ["EFECTIVO", 28], ["TRANSFERENCIA", 15], ["PLIN", 10], ["TARJETA", 7]] as const);
}

function paymentReference(ctx: Ctx, m: PaymentMethod): string | null {
  if (m === "YAPE" || m === "PLIN") return ctx.rng.digits(8);
  if (m === "TRANSFERENCIA") return ctx.rng.digits(10);
  if (m === "TARJETA") return ctx.rng.chance(0.6) ? `Voucher ${ctx.rng.digits(6)}` : null;
  return null;
}

function materialize(ctx: Ctx, org: OrgState, p: SimPatient, docs: Set<string>): void {
  const { rng, rows } = ctx;
  const appts = [...p.appts].sort((a, b) => a.start - b.start);
  const treating = p.history.at(-1)!.prof;
  const theme = THEMES[p.theme];
  const region = org.spec.region;
  const female = p.sex === "F";
  const minor = p.age !== "adulto";

  // ---------- Datos del paciente ----------
  let firstName: string;
  let lastName: string;
  if (p.preset) {
    firstName = p.preset.firstName;
    lastName = p.preset.lastName;
  } else if (p.migrant) {
    firstName = rng.pick(female ? MIGRANT_FEMALE_NAMES : MIGRANT_MALE_NAMES);
    lastName = `${rng.pick(MIGRANT_SURNAMES)} ${rng.pick(MIGRANT_SURNAMES)}`;
  } else {
    const pool = p.age === "nino" ? (female ? CHILD_FEMALE_NAMES : CHILD_MALE_NAMES) : p.age === "adolescente" ? (female ? TEEN_FEMALE_NAMES : TEEN_MALE_NAMES) : female ? FEMALE_NAMES : MALE_NAMES;
    firstName = rng.pick(pool);
    const s1 = surnameOf(ctx, org);
    let s2 = surnameOf(ctx, org);
    if (s2 === s1) s2 = rng.pick(COMMON_SURNAMES);
    lastName = `${s1} ${s2}`;
  }
  const [surname1, surname2] = lastName.split(" ") as [string, string];

  let documentType: DocumentType = "DNI";
  const newDoc = (): string => {
    if (documentType === "CE") return `00${rng.digits(7)}`;
    if (documentType === "PASAPORTE") return rng.digits(9);
    return `${minor ? rng.int(7, 9) : rng.int(0, 7)}${rng.digits(7)}`;
  };
  if (p.migrant) documentType = rng.chance(0.8) ? "CE" : "PASAPORTE";
  let documentNumber = newDoc();
  while (docs.has(`${org.id}:${documentNumber}`)) documentNumber = newDoc();
  docs.add(`${org.id}:${documentNumber}`);

  const contactDay = limaDay(p.createdMs);
  const years =
    p.age === "nino"
      ? rng.int(5, 11)
      : p.age === "adolescente"
        ? rng.int(12, 17)
        : rng.weighted([[rng.int(18, 25), 20], [rng.int(26, 35), 35], [rng.int(36, 50), 30], [rng.int(51, 70), 15]] as const);
  const birthDate = dateOnly(contactDay - Math.round(years * 365.25) - rng.int(0, 364));
  const sexValue: SexEnum = !minor && rng.chance(0.012) ? "NO_ESPECIFICA" : !minor && rng.chance(0.008) ? "OTRO" : female ? "FEMENINO" : "MASCULINO";

  const guardianRel = minor ? rng.weighted([["Madre", 70], ["Padre", 22], ["Abuela", 5], ["Tía", 3]] as const) : null;
  const companion = guardianRel ? `su ${guardianRel.toLowerCase()}` : "su familiar";
  const say = (text: string) =>
    text
      .replaceAll("{o}", female ? "a" : "o")
      .replaceAll("{a}", female ? "a" : "")
      .replaceAll("{acomp}", companion)
      .replaceAll("{Acomp}", companion.charAt(0).toUpperCase() + companion.slice(1))
      .replaceAll("{nino}", female ? "la niña" : "el niño")
      .replaceAll("{adolescente}", female ? "la adolescente" : "el adolescente")
      .replaceAll("{n}", String(rng.int(2, 12)));

  const city = CITIES[region];
  const district = rng.chance(0.85) ? rng.pick(zoneOf(region, org.spec.district)) : rng.pick(city.zones.flat());
  let occupation: string;
  let educationLevel: string;
  if (p.age === "nino") {
    occupation = years <= 5 ? "Estudiante (inicial)" : `Estudiante (${years - 5}.° de primaria)`;
    educationLevel = years <= 5 ? "Inicial" : "Primaria";
  } else if (p.age === "adolescente") {
    occupation = `Estudiante (${Math.min(5, years - 11)}.° de secundaria)`;
    educationLevel = "Secundaria";
  } else if (years <= 23 && rng.chance(0.6)) {
    occupation = female ? "Estudiante universitaria" : "Estudiante universitario";
    educationLevel = "Universitario";
  } else {
    occupation = years >= 63 && rng.chance(0.6) ? (female ? "Jubilada" : "Jubilado") : rng.pick(OCCUPATIONS)[female ? 1 : 0];
    educationLevel = rng.pick(ADULT_EDUCATION);
  }
  const maritalStatus = minor ? null : p.theme === "pareja" ? rng.pick(["Casado(a)", "Conviviente"]) : years < 26 && rng.chance(0.85) ? "Soltero(a)" : rng.pick(MARITAL_STATUS);
  const personFor = (rel: string) => {
    const relFemale = ["Madre", "Abuela", "Tía"].includes(rel) || (rel.includes("(a)") && rng.chance(0.5));
    const name = rng.pick(relFemale ? FEMALE_NAMES : MALE_NAMES);
    if (rel === "Madre") return `${name} ${surname2} ${surnameOf(ctx, org)}`;
    if (rel === "Padre") return `${name} ${surname1} ${surnameOf(ctx, org)}`;
    return `${name} ${surnameOf(ctx, org)} ${surnameOf(ctx, org)}`;
  };
  const emergencyRel = guardianRel ? (guardianRel === "Padre" ? "Madre" : "Padre") : rng.pick(EMERGENCY_RELATIONSHIPS);
  let adminNotes: string | null = null;
  if (p.status === "EN_PAUSA" && rng.chance(0.7)) adminNotes = rng.pick(PAUSE_NOTES);
  else if (rng.chance(0.2)) adminNotes = rng.pick(minor ? MINOR_ADMIN_NOTES : ADULT_ADMIN_NOTES);
  const emailUser = `${slug(firstName.split(" ")[0]!)}.${slug(surname1)}${rng.chance(0.45) ? rng.int(1, 99) : ""}`;

  // ---------- Paquetes ----------
  type Pkg = {
    id: string;
    total: number;
    used: number;
    scheduled: number;
    price: number;
    name: string;
    notes: string | null;
    createdMs: number;
    lastUseMs: number;
    thresholdMs: number | null;
    prof: Staff;
  };
  const pkgs: Pkg[] = [];
  const packageOf = new Map<string, string | null>();
  let cur: Pkg | null = null;
  let attendedSoFar = 0;
  let lastAttendedEnd = p.createdMs;
  const buy = (ms: number, prof: Staff): Pkg => {
    let total: number = p.pref;
    let name: string;
    let price: number;
    if (p.theme === "neuro" && pkgs.length === 0) {
      total = 4;
      name = "Evaluación neuropsicológica";
      price = prof.prices.evaluation;
    } else {
      // Quien está por terminar su proceso compra las últimas sesiones sueltas.
      if (total > 1 && p.status === "ALTA" && p.planned - attendedSoFar <= 3) total = 1;
      name = total === 1 ? "Sesión individual" : `Paquete ${total} sesiones`;
      price = total === 1 ? prof.prices.single : total === 4 ? prof.prices.p4 : prof.prices.p8;
    }
    let notes: string | null = null;
    if (total > 1 && rng.chance(0.06)) {
      price = roundSoles(price * 0.9);
      notes = rng.pick(["Descuento por pago adelantado", "Tarifa social acordada con la administración", "Convenio con su empresa: 10 % de descuento"]);
    }
    const pkg: Pkg = { id: ctx.id(), total, used: 0, scheduled: 0, price, name, notes, createdMs: ms, lastUseMs: ms, thresholdMs: null, prof };
    pkgs.push(pkg);
    return pkg;
  };
  for (const a of appts) {
    const consumes = a.status === "ATENDIDA" || (org.noShowConsumes && a.status === "NO_ASISTIO");
    const scheduled = a.status === "PROGRAMADA" || a.status === "CONFIRMADA";
    const hasRoom = cur != null && cur.used + cur.scheduled < cur.total;
    if (consumes || scheduled) {
      if (!hasRoom) {
        if (a.status === "ATENDIDA") cur = buy(a.start - rng.int(5, 40) * MINUTE, a.prof);
        else if (scheduled && rng.chance(pkgs.length === 0 ? 0.45 : 0.3)) {
          const ms = Math.min(NOW - 5 * MINUTE, Math.max(lastAttendedEnd + 10 * MINUTE, p.createdMs + 10 * MINUTE, Math.min(NOW - rng.int(1, 48) * HOUR, a.start - HOUR)));
          cur = buy(ms, a.prof);
        } else {
          // Paquete agotado y sin renovar: la cita queda sin paquete (aparece en renovaciones).
          packageOf.set(a.id, null);
          continue;
        }
      }
      const pkg = cur!;
      packageOf.set(a.id, pkg.id);
      if (consumes) {
        pkg.used++;
        pkg.lastUseMs = a.end;
        if (pkg.thresholdMs == null && pkg.total > org.renewalThreshold && pkg.total - pkg.used <= org.renewalThreshold) pkg.thresholdMs = a.end;
      } else pkg.scheduled++;
    } else {
      // Cancelada o inasistencia que no descuenta: el vínculo queda como historial si había cupo.
      packageOf.set(a.id, hasRoom ? cur!.id : null);
    }
    if (a.status === "ATENDIDA") {
      attendedSoFar++;
      lastAttendedEnd = a.end;
    }
  }

  // ---------- Historia clínica ----------
  const attended = appts.filter((a) => a.status === "ATENDIDA");
  const lastAttended = attended.at(-1) ?? null;
  const seen = attended.length > 0 || p.prior > 0;
  const risk: RiskLevel = seen && rng.chance(theme.risk) ? (rng.chance(0.2) ? "ALTO" : "MODERADO") : seen && rng.chance(0.08) ? "BAJO" : "NINGUNO";
  const recordCreated = p.prior > 0 ? p.createdMs + rng.int(10, 120) * MINUTE : (attended[0]?.end ?? p.createdMs) + rng.int(5, 90) * MINUTE;
  const transferMs = p.history.length > 1 ? p.history.at(-1)!.fromMs : 0;
  const recordUpdated = Math.max(recordCreated, transferMs, lastAttended ? lastAttended.end + rng.int(5, 60) * MINUTE : 0);
  const tone = p.age === "adolescente" && theme.mental === "nino" ? "neutro" : theme.mental;
  const consentMs = p.prior > 0 ? p.createdMs - p.prior * 7 * DAY : (attended[0]?.start ?? null);
  rows.clinicalRecords.push({
    id: ctx.id(),
    patientId: p.id,
    consultationReason: say(rng.pick(theme.reasons)),
    currentProblemHistory: seen ? say(rng.pick(theme.history)) : null,
    personalHistory: seen ? rng.pick(PERSONAL_HISTORY[p.age]) : null,
    previousTreatments: seen ? (p.prior > 0 && rng.chance(0.3) ? "Inició el proceso con el mismo profesional antes de usar el sistema." : rng.pick(PREVIOUS_TREATMENTS)) : null,
    familyHistory: seen ? rng.pick(FAMILY_HISTORY) : null,
    currentMedication: seen ? (p.theme === "atencion" ? rng.pick(CHILD_MEDICATION) : minor ? "Ninguna." : rng.pick(MEDICATION)) : null,
    substanceUse: seen && p.age !== "nino" ? rng.pick(SUBSTANCE_USE[p.age === "adolescente" ? "adolescente" : "adulto"]) : null,
    mentalStatusExam: seen ? say(MENTAL_STATUS[tone]) : null,
    diagnosticImpression: seen ? rng.pick(theme.impressions) : null,
    diagnosisCode: seen ? rng.pick(theme.codes) : null,
    treatmentGoals: seen ? rng.pick(theme.goals) : null,
    treatmentPlan: seen ? say(rng.pick(theme.plans)) : null,
    riskLevel: risk,
    riskNotes: risk === "NINGUNO" ? null : rng.pick(RISK_NOTES[risk]),
    informedConsent: consentMs != null,
    informedConsentDate: consentMs != null ? new Date(consentMs) : null,
    updatedById: treating.id,
    createdAt: new Date(Math.min(NOW, recordCreated)),
    updatedAt: new Date(Math.min(NOW, recordUpdated)),
  });

  // ---------- Citas y notas de evolución ----------
  const ageKey = p.age === "nino" ? "nino" : "adulto";
  const fromFor = (prof: Staff) => {
    let from = p.createdMs;
    for (const h of p.history) if (h.prof.id === prof.id) from = h.fromMs;
    return from;
  };
  let noteCount = 0;
  let lastAuthor: string | null = null;
  appts.forEach((a, i) => {
    const lower = Math.max(p.createdMs, fromFor(a.prof)) + 5 * MINUTE;
    const upper = Math.min(NOW - 5 * MINUTE, a.start - 30 * MINUTE);
    const wanted = a.rebookedAfter != null ? a.rebookedAfter + rng.int(5, 90) * MINUTE : a.start - rng.int(1, 8) * DAY - rng.int(0, 8) * HOUR;
    const createdMs = Math.max(lower, Math.min(upper, wanted));
    const creator = frontOffice(ctx, org, a.prof, createdMs);
    const cancelMs = a.cancelMs != null ? Math.max(createdMs + 10 * MINUTE, Math.min(a.start - 10 * MINUTE, a.cancelMs)) : null;
    const reminderMs = a.start - rng.int(18, 28) * HOUR;
    const sendReminder =
      reminderMs > createdMs &&
      reminderMs <= NOW &&
      (a.status === "CONFIRMADA" ||
        ((a.status === "ATENDIDA" || a.status === "NO_ASISTIO") && rng.chance(0.78)) ||
        (a.status === "CANCELADA" && reminderMs < cancelMs! && rng.chance(0.5)) ||
        (a.status === "PROGRAMADA" && rng.chance(0.35)));
    const past = a.status === "ATENDIDA" || a.status === "NO_ASISTIO";
    const updatedMs = past ? Math.min(NOW, a.end + rng.int(1, 180) * MINUTE) : (cancelMs ?? (sendReminder ? reminderMs : createdMs));
    let notes: string | null = null;
    if (i === 0 && rng.chance(0.45)) notes = "Primera cita";
    else if (a.modality === "VIRTUAL" && rng.chance(0.15)) notes = "Enviar el enlace de Meet 15 minutos antes";
    else if (rng.chance(0.04)) notes = rng.pick(APPOINTMENT_NOTES.filter((n) => n !== "Primera cita" && (minor || n !== "Viene con su mamá")));
    const reason = rng.pick(CANCEL_REASONS);
    rows.appointments.push({
      id: a.id,
      organizationId: org.id,
      patientId: p.id,
      professionalId: a.prof.id,
      roomId: a.roomId,
      packageId: packageOf.get(a.id) ?? null,
      startsAt: new Date(a.start),
      endsAt: new Date(a.end),
      status: a.status,
      modality: a.modality,
      notes,
      cancelReason: a.status === "CANCELADA" ? (a.prof.sex === "M" ? reason.replace("La psicóloga", "El psicólogo") : reason) : null,
      reminderSentAt: sendReminder ? new Date(reminderMs) : null,
      createdById: creator.id,
      createdAt: new Date(createdMs),
      updatedAt: new Date(Math.max(createdMs, updatedMs)),
    });

    if (a.status !== "ATENDIDA") return;
    noteCount++;
    const isFirst = p.prior === 0 && noteCount === 1;
    const isClosing = p.status === "ALTA" && a === lastAttended && !isFirst;
    const isTransfer = lastAuthor != null && lastAuthor !== a.prof.id;
    lastAuthor = a.prof.id;
    let development: string;
    if (isFirst) development = say(FIRST_SESSION[p.age]);
    else if (isClosing) development = say(CLOSING_SESSION[ageKey]);
    else if (isTransfer) development = TRANSFER_SESSION;
    else development = `${say(rng.pick(OPENERS[p.age]))} ${say(rng.pick(theme.work))} ${say(rng.pick(CLOSERS[ageKey]))}`;
    let noteRisk: RiskLevel = rng.chance(0.02) ? "BAJO" : "NINGUNO";
    if (risk === "ALTO" || risk === "MODERADO") noteRisk = noteCount <= 2 ? risk : noteCount <= 5 ? rng.pick(["MODERADO", "BAJO"] as const) : rng.pick(["BAJO", "NINGUNO", "NINGUNO"] as const);
    const noteMs = Math.min(NOW - MINUTE, a.end + rng.int(5, 240) * MINUTE);
    rows.sessionNotes.push({
      id: ctx.id(),
      patientId: p.id,
      authorId: a.prof.id,
      appointmentId: a.id,
      sessionDate: new Date(a.start),
      sessionNumber: p.prior + noteCount,
      modality: a.modality,
      moodObserved: say(rng.pick(MOODS[ageKey])),
      topics: isFirst ? FIRST_SESSION_FIELDS.topics : rng.pick(theme.topics).replace("{o}", female ? "a" : "o"),
      development,
      interventions: isFirst ? FIRST_SESSION_FIELDS.interventions : rng.pick(theme.interventions),
      homework: isClosing ? null : isFirst ? FIRST_SESSION_FIELDS.homework : say(rng.pick(theme.homework)),
      nextSessionPlan: isClosing ? "Control de seguimiento opcional en un mes." : isFirst ? FIRST_SESSION_FIELDS.nextSessionPlan : rng.pick(theme.next),
      riskLevel: noteRisk,
      createdAt: new Date(Math.max(a.end, noteMs)),
      updatedAt: new Date(Math.max(a.end, noteMs)),
    });
  });

  // ---------- Paquetes y pagos ----------
  pkgs.forEach((k, idx) => {
    let status: PackageStatus = k.used >= k.total ? "COMPLETADO" : "ACTIVO";
    let updatedMs = k.lastUseMs;
    if (status === "ACTIVO" && p.status === "ABANDONO" && k.scheduled === 0 && rng.chance(0.5)) {
      status = "CANCELADO";
      updatedMs = Math.max(updatedMs, p.statusMs);
    }
    const isLast = idx === pkgs.length - 1;
    let renewalNotifiedAt: Date | null = null;
    if (k.thresholdMs != null) {
      const ms = k.thresholdMs + rng.int(1, 30) * HOUR;
      const notify = (status === "COMPLETADO" && !isLast && rng.chance(0.55)) || (status === "ACTIVO" && isLast && rng.chance(0.4));
      if (notify && ms <= NOW && ms <= org.accessEndMs) renewalNotifiedAt = new Date(ms);
    }
    rows.packages.push({
      id: k.id,
      organizationId: org.id,
      patientId: p.id,
      name: k.name,
      totalSessions: k.total,
      priceCents: k.price,
      startDate: new Date(k.createdMs),
      status,
      renewalNotifiedAt,
      notes: k.notes,
      createdAt: new Date(k.createdMs),
      updatedAt: new Date(Math.min(NOW, Math.max(k.createdMs, updatedMs))),
    });

    const payments: { amount: number; ms: number; notes: string | null }[] = [];
    if (k.total === 1) {
      if (rng.chance(0.95)) payments.push({ amount: k.price, ms: k.createdMs + rng.int(50, 70) * MINUTE, notes: null });
    } else {
      let plan = rng.weighted([["full", 55], ["two", 30], ["partial", 15]] as const);
      if (plan === "partial" && status === "COMPLETADO" && rng.chance(0.7)) plan = "two";
      const first = roundSoles(k.price * (plan === "partial" ? rng.float(0.3, 0.6) : 0.5));
      if (plan === "full" || first >= k.price) payments.push({ amount: k.price, ms: k.createdMs, notes: null });
      else {
        payments.push({ amount: first, ms: k.createdMs, notes: plan === "two" ? "Primera cuota" : rng.chance(0.5) ? "Abono parcial" : null });
        if (plan === "two") {
          const secondMs = status === "COMPLETADO" ? Math.min(k.lastUseMs, k.createdMs + rng.int(7, 21) * DAY) : k.createdMs + rng.int(7, 21) * DAY;
          payments.push({ amount: k.price - first, ms: Math.max(k.createdMs + DAY, secondMs), notes: "Saldo del paquete" });
        }
      }
    }
    for (const pay of payments) {
      if (pay.ms > NOW || pay.ms > org.accessEndMs) continue;
      const method = paymentMethod(ctx, org);
      rows.payments.push({
        id: ctx.id(),
        organizationId: org.id,
        patientId: p.id,
        packageId: k.id,
        amountCents: pay.amount,
        method,
        paidAt: new Date(pay.ms),
        reference: paymentReference(ctx, method),
        notes: pay.notes ?? (minor && rng.chance(0.15) ? "Pagó el apoderado" : null),
        registeredById: frontOffice(ctx, org, k.prof, pay.ms).id,
        createdAt: new Date(pay.ms),
      });
    }
  });

  // ---------- Paciente y bitácora de tratantes ----------
  const lastChange = Math.max(p.createdMs, p.statusMs, transferMs);
  rows.patients.push({
    id: p.id,
    organizationId: org.id,
    professionalId: treating.id,
    firstName,
    lastName,
    documentType,
    documentNumber,
    birthDate,
    sex: sexValue,
    phone: p.age === "nino" ? null : p.age === "adolescente" && !rng.chance(0.6) ? null : mobile(rng),
    email: (minor ? rng.chance(0.3) && p.age === "adolescente" : rng.chance(0.8)) ? `${emailUser}@correo.pe` : null,
    address: `${rng.pick(city.streets)} ${rng.int(1, 40) * 50 + rng.int(0, 49)}${rng.chance(0.35) ? `, dpto. ${rng.int(1, 12)}0${rng.int(1, 4)}` : ""}`,
    district,
    occupation,
    maritalStatus,
    educationLevel,
    guardianName: guardianRel ? personFor(guardianRel) : null,
    guardianRelationship: guardianRel,
    guardianPhone: guardianRel ? mobile(rng) : null,
    emergencyContactName: personFor(emergencyRel),
    emergencyContactRelationship: emergencyRel,
    emergencyContactPhone: mobile(rng),
    referralSource: rng.pick(minor ? CHILD_REFERRAL_SOURCES : REFERRAL_SOURCES),
    status: p.status,
    adminNotes,
    createdAt: new Date(p.createdMs),
    updatedAt: new Date(Math.min(NOW, lastChange)),
  });
  p.history.forEach((h, i) => {
    rows.patientAssignments.push({
      id: ctx.id(),
      organizationId: org.id,
      patientId: p.id,
      fromUserId: i === 0 ? null : p.history[i - 1]!.prof.id,
      toUserId: h.prof.id,
      changedById: h.by.id,
      createdAt: new Date(h.fromMs),
    });
  });
}

/** Pacientes, historias, citas, notas, paquetes, pagos y bitácora de una organización. */
export function generateTenant(ctx: Ctx, org: OrgState, docs: Set<string>): void {
  for (const p of simulate(ctx, org)) materialize(ctx, org, p, docs);
}
