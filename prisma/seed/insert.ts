// Borrado e inserción masiva. createMany por lotes en orden de dependencias (FK): pocas consultas
// grandes en vez de miles de inserts individuales, lo que importa sobre todo con Neon por HTTPS.
import type { PrismaClient } from "@prisma/client";
import type { Rows } from "./context";

/** ~32 000 parámetros por consulta como máximo en PostgreSQL: lotes de 1000 filas sobran. */
const BATCH = 1000;

async function inBatches<T>(rows: T[], insert: (data: T[]) => Promise<unknown>): Promise<void> {
  for (let i = 0; i < rows.length; i += BATCH) await insert(rows.slice(i, i + BATCH));
}

/** Vacía todas las tablas, de las hojas a la raíz. */
export async function reset(db: PrismaClient): Promise<void> {
  await db.subscriptionPayment.deleteMany();
  await db.subscriptionInvoice.deleteMany();
  await db.subscriptionEvent.deleteMany();
  await db.accountNote.deleteMany();
  await db.subscription.deleteMany();
  await db.subscriptionPlan.deleteMany();
  await db.platformAdmin.deleteMany();
  await db.patientAssignment.deleteMany();
  await db.sessionNote.deleteMany();
  await db.clinicalRecord.deleteMany();
  await db.payment.deleteMany();
  await db.appointment.deleteMany();
  await db.package.deleteMany();
  await db.patient.deleteMany();
  await db.room.deleteMany();
  await db.user.deleteMany();
  await db.organization.deleteMany();
}

/** Catálogo de planes, igual que en la migración (precio de lista por definir). */
export async function upsertPlans(db: PrismaClient): Promise<void> {
  const plans = [
    {
      code: "INDIVIDUAL" as const,
      name: "Plan Individual",
      description: "Para psicólogos independientes: un profesional.",
      listPriceCents: null,
      perProfessional: false,
      maxProfessionals: 1,
    },
    {
      code: "CENTRO" as const,
      name: "Plan Centro Psicológico",
      description: "Para centros con varios psicólogos, consultorios y recepción. Se cobra por psicólogo activo.",
      listPriceCents: null,
      perProfessional: true,
      maxProfessionals: null,
    },
  ];
  for (const { code, ...data } of plans) {
    await db.subscriptionPlan.upsert({ where: { code }, create: { code, ...data, active: true }, update: { ...data, active: true } });
  }
}

export async function insertAll(db: PrismaClient, rows: Rows): Promise<void> {
  await inBatches(rows.platformAdmins, (data) => db.platformAdmin.createMany({ data }));
  await inBatches(rows.organizations, (data) => db.organization.createMany({ data }));
  await inBatches(rows.subscriptions, (data) => db.subscription.createMany({ data }));
  await inBatches(rows.subscriptionEvents, (data) => db.subscriptionEvent.createMany({ data }));
  await inBatches(rows.subscriptionInvoices, (data) => db.subscriptionInvoice.createMany({ data }));
  await inBatches(rows.subscriptionPayments, (data) => db.subscriptionPayment.createMany({ data }));
  await inBatches(rows.accountNotes, (data) => db.accountNote.createMany({ data }));
  await inBatches(rows.users, (data) => db.user.createMany({ data }));
  await inBatches(rows.rooms, (data) => db.room.createMany({ data }));
  await inBatches(rows.patients, (data) => db.patient.createMany({ data }));
  await inBatches(rows.clinicalRecords, (data) => db.clinicalRecord.createMany({ data }));
  await inBatches(rows.packages, (data) => db.package.createMany({ data }));
  await inBatches(rows.appointments, (data) => db.appointment.createMany({ data }));
  await inBatches(rows.sessionNotes, (data) => db.sessionNote.createMany({ data }));
  await inBatches(rows.payments, (data) => db.payment.createMany({ data }));
  await inBatches(rows.patientAssignments, (data) => db.patientAssignment.createMany({ data }));
}
