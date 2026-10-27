// Estado compartido del seed: PRNG, generador de ids y filas a insertar (en orden de dependencias).
import type { Prisma } from "@prisma/client";
import { Rng, idFactory } from "./random";

export function emptyRows() {
  return {
    platformAdmins: [] as Prisma.PlatformAdminCreateManyInput[],
    organizations: [] as Prisma.OrganizationCreateManyInput[],
    subscriptions: [] as Prisma.SubscriptionCreateManyInput[],
    subscriptionEvents: [] as Prisma.SubscriptionEventCreateManyInput[],
    subscriptionInvoices: [] as Prisma.SubscriptionInvoiceCreateManyInput[],
    subscriptionPayments: [] as Prisma.SubscriptionPaymentCreateManyInput[],
    accountNotes: [] as Prisma.AccountNoteCreateManyInput[],
    users: [] as Prisma.UserCreateManyInput[],
    rooms: [] as Prisma.RoomCreateManyInput[],
    patients: [] as Prisma.PatientCreateManyInput[],
    clinicalRecords: [] as Prisma.ClinicalRecordCreateManyInput[],
    packages: [] as Prisma.PackageCreateManyInput[],
    appointments: [] as Prisma.AppointmentCreateManyInput[],
    sessionNotes: [] as Prisma.SessionNoteCreateManyInput[],
    payments: [] as Prisma.PaymentCreateManyInput[],
    patientAssignments: [] as Prisma.PatientAssignmentCreateManyInput[],
  };
}

export type Rows = ReturnType<typeof emptyRows>;

export type Ctx = {
  rng: Rng;
  id: () => string;
  rows: Rows;
  passwordHash: string;
  /** Correos de usuarios ya usados (User.email es único en toda la plataforma). */
  emails: Set<string>;
  licenses: Set<number>;
};

export function createContext(passwordHash: string): Ctx {
  return {
    rng: new Rng(20261026),
    id: idFactory(7919),
    rows: emptyRows(),
    passwordHash,
    emails: new Set(),
    licenses: new Set(),
  };
}

/** "José Ñahui" -> "jose.nahui" (para correos y dominios). */
export function slug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "");
}

export function mobile(rng: Rng): string {
  return `9${rng.digits(8)}`;
}

/** Correo único de usuario: si ya existe, agrega un número. */
export function uniqueEmail(ctx: Ctx, local: string, domain: string): string {
  let email = `${local}@${domain}`;
  for (let n = 2; ctx.emails.has(email); n++) email = `${local}${n}@${domain}`;
  ctx.emails.add(email);
  return email;
}

/** RUC con dígito verificador (módulo 11), prefijo 20 (empresa) o 10 (persona natural). */
export function ruc(rng: Rng, prefix: "10" | "20"): string {
  const body = prefix + rng.digits(8);
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = [...body].reduce((s, d, i) => s + Number(d) * weights[i]!, 0);
  const check = (11 - (sum % 11)) % 10;
  return body + check;
}

/** Monto redondeado a decenas de sol (en céntimos). */
export function roundSoles(cents: number, step = 1000): number {
  return Math.max(step, Math.round(cents / step) * step);
}
