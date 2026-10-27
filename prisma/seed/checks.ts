// Verificaciones de consistencia que corre el seed al terminar. Cada consulta cuenta violaciones:
// todas deben dar 0. {now} y {today} se reemplazan por el instante del seed (las columnas son
// timestamp sin zona en UTC; en psql usar timezone('UTC', now()) y la fecha de hoy en Lima).
import type { PrismaClient } from "@prisma/client";
import { NOW, TODAY, dayKey } from "./time";

export const CHECKS: { name: string; sql: string }[] = [
  {
    name: "Cruces de citas del mismo profesional",
    sql: `SELECT count(*) AS n FROM "Appointment" a JOIN "Appointment" b
      ON a."professionalId" = b."professionalId" AND a.id < b.id AND a."startsAt" < b."endsAt" AND b."startsAt" < a."endsAt"
      WHERE a.status <> 'CANCELADA' AND b.status <> 'CANCELADA'`,
  },
  {
    name: "Cruces de citas en el mismo consultorio",
    sql: `SELECT count(*) AS n FROM "Appointment" a JOIN "Appointment" b
      ON a."roomId" = b."roomId" AND a.id < b.id AND a."startsAt" < b."endsAt" AND b."startsAt" < a."endsAt"
      WHERE a.status <> 'CANCELADA' AND b.status <> 'CANCELADA'`,
  },
  {
    name: "Cruces de citas del mismo paciente",
    sql: `SELECT count(*) AS n FROM "Appointment" a JOIN "Appointment" b
      ON a."patientId" = b."patientId" AND a.id < b.id AND a."startsAt" < b."endsAt" AND b."startsAt" < a."endsAt"
      WHERE a.status <> 'CANCELADA' AND b.status <> 'CANCELADA'`,
  },
  {
    name: "N.º de documento repetido en una organización",
    sql: `SELECT count(*) AS n FROM (SELECT 1 FROM "Patient" WHERE "documentNumber" IS NOT NULL
      GROUP BY "organizationId", "documentNumber" HAVING count(*) > 1) d`,
  },
  {
    name: "Cita con paciente, profesional, consultorio, paquete o creador de otra organización",
    sql: `SELECT count(*) AS n FROM "Appointment" a
      JOIN "Patient" p ON p.id = a."patientId"
      JOIN "User" u ON u.id = a."professionalId"
      LEFT JOIN "Room" r ON r.id = a."roomId"
      LEFT JOIN "Package" k ON k.id = a."packageId"
      LEFT JOIN "User" c ON c.id = a."createdById"
      WHERE p."organizationId" <> a."organizationId" OR u."organizationId" <> a."organizationId" OR NOT u."isProfessional"
         OR r."organizationId" <> a."organizationId" OR k."organizationId" <> a."organizationId"
         OR k."patientId" <> a."patientId" OR c."organizationId" <> a."organizationId"`,
  },
  {
    name: "Paquete de un paciente de otra organización",
    sql: `SELECT count(*) AS n FROM "Package" k JOIN "Patient" p ON p.id = k."patientId" WHERE p."organizationId" <> k."organizationId"`,
  },
  {
    name: "Pago con paciente, paquete o usuario de otra organización",
    sql: `SELECT count(*) AS n FROM "Payment" y
      JOIN "Patient" p ON p.id = y."patientId" JOIN "Package" k ON k.id = y."packageId" JOIN "User" u ON u.id = y."registeredById"
      WHERE p."organizationId" <> y."organizationId" OR k."organizationId" <> y."organizationId"
         OR k."patientId" <> y."patientId" OR u."organizationId" <> y."organizationId"`,
  },
  {
    name: "Nota de evolución ajena a la cita, al paciente o a la organización",
    sql: `SELECT count(*) AS n FROM "SessionNote" n
      JOIN "Patient" p ON p.id = n."patientId" JOIN "User" u ON u.id = n."authorId"
      LEFT JOIN "Appointment" a ON a.id = n."appointmentId"
      WHERE u."organizationId" <> p."organizationId" OR a."patientId" <> n."patientId" OR a."professionalId" <> n."authorId"
         OR a.status <> 'ATENDIDA'`,
  },
  {
    name: "Historia clínica escrita por alguien que no es el tratante",
    sql: `SELECT count(*) AS n FROM "ClinicalRecord" c JOIN "Patient" p ON p.id = c."patientId"
      WHERE c."updatedById" IS DISTINCT FROM p."professionalId"`,
  },
  {
    name: "Bitácora de tratantes con usuarios de otra organización",
    sql: `SELECT count(*) AS n FROM "PatientAssignment" x
      JOIN "Patient" p ON p.id = x."patientId"
      LEFT JOIN "User" f ON f.id = x."fromUserId" LEFT JOIN "User" t ON t.id = x."toUserId" LEFT JOIN "User" c ON c.id = x."changedById"
      WHERE x."organizationId" <> p."organizationId" OR f."organizationId" <> p."organizationId"
         OR t."organizationId" <> p."organizationId" OR c."organizationId" <> p."organizationId"`,
  },
  {
    name: "Bitácora: el último tratante no coincide con el del paciente, o hay autoasignación en un traspaso",
    sql: `SELECT count(*) AS n FROM "Patient" p
      LEFT JOIN LATERAL (SELECT * FROM "PatientAssignment" x WHERE x."patientId" = p.id ORDER BY x."createdAt" DESC LIMIT 1) l ON true
      WHERE l."toUserId" IS DISTINCT FROM p."professionalId"
         OR (l."fromUserId" IS NOT NULL AND l."changedById" = l."toUserId")`,
  },
  {
    name: "Tratante que no es profesional de la organización",
    sql: `SELECT count(*) AS n FROM "Patient" p LEFT JOIN "User" u ON u.id = p."professionalId"
      WHERE u.id IS NULL OR u."organizationId" <> p."organizationId" OR NOT u."isProfessional"`,
  },
  {
    name: "Paquete con más sesiones usadas o agendadas que su total, o estado incoherente",
    sql: `SELECT count(*) AS n FROM (
        SELECT k.status, k."totalSessions",
          count(a.id) FILTER (WHERE a.status = 'ATENDIDA' OR (o."noShowConsumesSession" AND a.status = 'NO_ASISTIO')) AS used,
          count(a.id) FILTER (WHERE a.status IN ('PROGRAMADA', 'CONFIRMADA')) AS scheduled
        FROM "Package" k JOIN "Organization" o ON o.id = k."organizationId" LEFT JOIN "Appointment" a ON a."packageId" = k.id
        GROUP BY k.id, o."noShowConsumesSession") s
      WHERE used + scheduled > "totalSessions"
         OR (status = 'COMPLETADO' AND used <> "totalSessions")
         OR (status = 'ACTIVO' AND used >= "totalSessions")`,
  },
  {
    name: "Pagos que superan el precio del paquete",
    sql: `SELECT count(*) AS n FROM (SELECT k.id FROM "Package" k JOIN "Payment" y ON y."packageId" = k.id
      GROUP BY k.id, k."priceCents" HAVING sum(y."amountCents") > k."priceCents") x`,
  },
  {
    name: "Cita pasada sin cerrar o cita futura ya cerrada",
    sql: `SELECT count(*) AS n FROM "Appointment"
      WHERE ("endsAt" <= {now} AND status IN ('PROGRAMADA', 'CONFIRMADA')) OR ("startsAt" > {now} AND status IN ('ATENDIDA', 'NO_ASISTIO', 'CANCELADA'))`,
  },
  {
    name: "Cita atendida sin nota de evolución",
    sql: `SELECT count(*) AS n FROM "Appointment" a LEFT JOIN "SessionNote" n ON n."appointmentId" = a.id
      WHERE a.status = 'ATENDIDA' AND n.id IS NULL`,
  },
  {
    name: "Citas futuras en cuentas suspendidas o canceladas",
    sql: `SELECT count(*) AS n FROM "Appointment" a JOIN "Subscription" s ON s."organizationId" = a."organizationId"
      WHERE s.status IN ('SUSPENDIDA', 'CANCELADA') AND a."startsAt" > {now}`,
  },
  {
    name: "Tipo de organización distinto del plan",
    sql: `SELECT count(*) AS n FROM "Organization" o JOIN "Subscription" s ON s."organizationId" = o.id WHERE o.type::text <> s."planCode"::text`,
  },
  {
    name: "Plan individual con más de un profesional activo",
    sql: `SELECT count(*) AS n FROM (SELECT o.id FROM "Organization" o JOIN "User" u ON u."organizationId" = o.id
      WHERE o.type = 'INDIVIDUAL' AND u.active AND u."isProfessional" GROUP BY o.id HAVING count(*) > 1) x`,
  },
  {
    name: "Historial: ALTA con actor o evento manual sin actor",
    sql: `SELECT count(*) AS n FROM "SubscriptionEvent" WHERE (type = 'ALTA') = ("actorId" IS NOT NULL)`,
  },
  {
    name: "Historial: el primer evento no es ALTA o el último cambio de estado no coincide con la suscripción",
    sql: `SELECT count(*) AS n FROM "Subscription" s
      LEFT JOIN LATERAL (SELECT type FROM "SubscriptionEvent" e WHERE e."subscriptionId" = s.id ORDER BY e."createdAt" ASC LIMIT 1) f ON true
      LEFT JOIN LATERAL (SELECT type FROM "SubscriptionEvent" e WHERE e."subscriptionId" = s.id
        AND e.type IN ('ALTA', 'PLAN_ACTIVADO', 'SUSPENDIDA', 'REACTIVADA', 'CANCELADA') ORDER BY e."createdAt" DESC LIMIT 1) l ON true
      WHERE f.type IS DISTINCT FROM 'ALTA' OR NOT (
        (s.status = 'PRUEBA' AND l.type = 'ALTA') OR (s.status = 'ACTIVA' AND l.type IN ('PLAN_ACTIVADO', 'REACTIVADA'))
        OR (s.status = 'SUSPENDIDA' AND l.type = 'SUSPENDIDA') OR (s.status = 'CANCELADA' AND l.type = 'CANCELADA'))`,
  },
  {
    name: "Facturas: pagos que superan el total, pagos en anuladas o anulada sin motivo",
    sql: `SELECT count(*) AS n FROM "SubscriptionInvoice" i
      LEFT JOIN (SELECT "invoiceId", sum("amountCents") AS paid, count(*) AS c FROM "SubscriptionPayment" GROUP BY "invoiceId") y ON y."invoiceId" = i.id
      WHERE coalesce(y.paid, 0) > i.seats * i."unitPriceCents" - i."discountCents"
         OR (i."voidedAt" IS NOT NULL AND (coalesce(y.c, 0) > 0 OR i."voidReason" IS NULL))`,
  },
  {
    name: "Facturas: cuenta suspendida sin facturas vencidas o cuenta en prueba con facturas",
    sql: `SELECT count(*) AS n FROM "Subscription" s WHERE
      (s.status = 'SUSPENDIDA' AND NOT EXISTS (
        SELECT 1 FROM "SubscriptionInvoice" i WHERE i."subscriptionId" = s.id AND i."voidedAt" IS NULL AND i."dueDate" < {today}
          AND (SELECT coalesce(sum(y."amountCents"), 0) FROM "SubscriptionPayment" y WHERE y."invoiceId" = i.id) < i.seats * i."unitPriceCents" - i."discountCents"))
      OR (s.status = 'PRUEBA' AND EXISTS (SELECT 1 FROM "SubscriptionInvoice" i WHERE i."subscriptionId" = s.id))`,
  },
  {
    name: "Facturas emitidas después de la cancelación o suspensión",
    sql: `SELECT count(*) AS n FROM "SubscriptionInvoice" i JOIN "SubscriptionEvent" e ON e."subscriptionId" = i."subscriptionId"
      JOIN "Subscription" s ON s.id = i."subscriptionId"
      WHERE e.type::text = s.status::text AND s.status IN ('SUSPENDIDA', 'CANCELADA') AND i."issuedAt" > e."createdAt"`,
  },
];

/** Re-evalúa cada CHECK constraint de la BD contra los datos (deben dar 0). */
async function checkConstraints(db: PrismaClient): Promise<{ name: string; n: number }[]> {
  const defs = await db.$queryRawUnsafe<{ tbl: string; name: string; def: string }[]>(
    `SELECT conrelid::regclass::text AS tbl, conname AS name, pg_get_constraintdef(oid) AS def
     FROM pg_constraint WHERE contype = 'c' AND connamespace = 'public'::regnamespace ORDER BY 1, 2`,
  );
  const results: { name: string; n: number }[] = [];
  for (const d of defs) {
    const expr = d.def.replace(/^CHECK\s*/, "");
    const [row] = await db.$queryRawUnsafe<{ n: bigint }[]>(`SELECT count(*) AS n FROM ${d.tbl} WHERE NOT ${expr}`);
    results.push({ name: `CHECK ${d.name}`, n: Number(row?.n ?? 0) });
  }
  return results;
}

export async function runChecks(db: PrismaClient): Promise<{ name: string; n: number }[]> {
  const now = `'${new Date(NOW).toISOString().replace("T", " ").replace("Z", "")}'::timestamp`;
  const today = `'${dayKey(TODAY)}'::date`;
  const results: { name: string; n: number }[] = [];
  for (const c of CHECKS) {
    const [row] = await db.$queryRawUnsafe<{ n: bigint }[]>(c.sql.replaceAll("{now}", now).replaceAll("{today}", today));
    results.push({ name: c.name, n: Number(row?.n ?? 0) });
  }
  return [...results, ...(await checkConstraints(db))];
}
