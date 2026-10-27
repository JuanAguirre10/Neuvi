// Datos de demostración: cuentas suscritas a Neuvi (centros y psicólogos independientes de Lima y
// regiones) con su equipo, pacientes, historias clínicas, agenda, paquetes y pagos; además la
// suscripción, facturación y notas internas de cada cuenta y el equipo de Neuvi (/admin).
// Uso: npm run db:seed   (BORRA todos los datos de la BD antes de insertar)
// Contraseña de todos los usuarios demo (consultorios y equipo Neuvi): neuvi2026
//
// Todo se genera en memoria con un PRNG determinista (fechas relativas al momento de ejecución) y se
// inserta por lotes. Al final corre verificaciones de consistencia (prisma/seed/checks.ts).
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { buildSubscription, buildTeam, createLedger, finalizeLedger, PLATFORM_ADMINS } from "./seed/billing";
import { DEMO_ORGS, GENERATED_ORGS } from "./seed/catalog/orgs";
import { runChecks } from "./seed/checks";
import { createContext } from "./seed/context";
import { insertAll, reset, upsertPlans } from "./seed/insert";
import { buildOrg, setLastLogins } from "./seed/org";
import { generateTenant } from "./seed/tenant";

const db = new PrismaClient();
const PASSWORD = "neuvi2026";

function generate(passwordHash: string) {
  const ctx = createContext(passwordHash);
  const team = buildTeam(ctx);
  const ledger = createLedger();
  const documents = new Set<string>();
  for (const spec of [...DEMO_ORGS, ...GENERATED_ORGS]) {
    const org = buildOrg(ctx, spec);
    buildSubscription(ctx, org, team, ledger);
    setLastLogins(ctx, org);
    generateTenant(ctx, org, documents);
  }
  finalizeLedger(ctx, ledger);
  return ctx.rows;
}

async function counts() {
  const [
    organizaciones,
    suscripciones,
    eventos,
    facturas,
    cobros,
    notasInternas,
    equipoNeuvi,
    usuarios,
    consultorios,
    pacientes,
    historias,
    paquetes,
    citas,
    notasEvolucion,
    pagos,
    asignaciones,
  ] = await Promise.all([
    db.organization.count(),
    db.subscription.count(),
    db.subscriptionEvent.count(),
    db.subscriptionInvoice.count(),
    db.subscriptionPayment.count(),
    db.accountNote.count(),
    db.platformAdmin.count(),
    db.user.count(),
    db.room.count(),
    db.patient.count(),
    db.clinicalRecord.count(),
    db.package.count(),
    db.appointment.count(),
    db.sessionNote.count(),
    db.payment.count(),
    db.patientAssignment.count(),
  ]);
  return {
    organizaciones,
    suscripciones,
    eventos,
    facturas,
    cobros,
    notasInternas,
    equipoNeuvi,
    usuarios,
    consultorios,
    pacientes,
    historias,
    paquetes,
    citas,
    notasEvolucion,
    pagos,
    asignaciones,
  };
}

async function main() {
  const started = Date.now();
  const passwordHash = await hash(PASSWORD, 10);
  // Se genera todo antes de tocar la BD: si algo falla, los datos actuales quedan intactos.
  const rows = generate(passwordHash);

  await reset(db);
  await upsertPlans(db);
  await insertAll(db, rows);

  console.log("Seed completado:");
  console.table(await counts());

  const results = await runChecks(db);
  const failed = results.filter((r) => r.n > 0);
  console.log(`Verificaciones: ${results.length - failed.length}/${results.length} sin violaciones.`);
  for (const f of failed) console.error(`  ✗ ${f.name}: ${f.n}`);
  if (failed.length > 0) process.exitCode = 1;

  console.log(`\nContraseña de todos los usuarios demo: ${PASSWORD}`);
  console.log("Consultorios: admin@bienestar.pe (administradora), recepcion@bienestar.pe (recepción),");
  console.log("  lucia@bienestar.pe, diego@bienestar.pe, andrea@bienestar.pe (psicólogos), ana@neuvi.demo (independiente)");
  console.log(
    `Equipo Neuvi (/admin): ${PLATFORM_ADMINS.filter((a) => a.leftDaysAgo == null)
      .map((a) => `${a.email} (${a.role.toLowerCase()})`)
      .join(", ")}`,
  );
  console.log(`Tiempo: ${((Date.now() - started) / 1000).toFixed(1)} s`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
