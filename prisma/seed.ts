// Datos de demostración: un centro psicológico y un psicólogo independiente.
// Uso: npm run db:seed   (BORRA todos los datos de la BD antes de insertar)
// Contraseña de todos los usuarios demo: neuvi2026
import { PrismaClient, type AppointmentStatus, type PaymentMethod, type Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import { addDaysKey, fromLimaLocal, startOfLimaWeekKey, todayKey } from "../src/lib/dates";

const db = new PrismaClient();
const PASSWORD = "neuvi2026";
const MINUTES = 50;

// PRNG determinista para que el seed sea reproducible.
let s = 20260930;
const rand = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)]!;
const chance = (p: number) => rand() < p;

const DISTRICTS = ["Miraflores", "San Isidro", "Surco", "San Borja", "Jesús María", "Lince", "Pueblo Libre", "La Molina", "Magdalena", "San Miguel", "Los Olivos", "Barranco"];
const REASONS = [
  "Ansiedad y dificultad para dormir por carga laboral.",
  "Estado de ánimo bajo tras la ruptura de una relación de pareja.",
  "Conflictos familiares y dificultades de comunicación en casa.",
  "Estrés académico y temor a desaprobar cursos.",
  "Duelo por el fallecimiento reciente de un familiar.",
  "Crisis de angustia en espacios concurridos.",
  "Baja autoestima e inseguridad en el trabajo.",
  "Dificultades para adaptarse a un cambio de ciudad.",
  "Irritabilidad y discusiones frecuentes con la pareja.",
];
const CHILD_REASONS = [
  "Dificultades de atención y conducta en el colegio (referido por tutora).",
  "Ansiedad de separación al ir al colegio.",
  "Cambios de conducta tras la separación de los padres.",
];
const MOODS = ["Ansioso, pero colaborador", "Eutímico", "Ánimo bajo, llanto al inicio", "Tranquilo y participativo", "Irritable al inicio, luego receptivo"];
const TOPICS = ["Manejo de pensamientos automáticos", "Rutina de sueño", "Comunicación asertiva con la familia", "Proceso de duelo", "Autoestima y autocuidado", "Exposición gradual a situaciones temidas", "Organización del tiempo de estudio"];
const INTERVENTIONS = ["Reestructuración cognitiva", "Técnicas de respiración diafragmática", "Psicoeducación", "Registro de pensamientos", "Role playing", "Activación conductual", "Juego terapéutico"];
const HOMEWORK = ["Registro diario de emociones", "Practicar respiración 10 minutos al día", "Lista de actividades agradables", "Diario de sueño", "Conversación pendiente con su madre usando lo practicado"];
const METHODS: PaymentMethod[] = ["YAPE", "YAPE", "YAPE", "YAPE", "EFECTIVO", "EFECTIVO", "TRANSFERENCIA", "TRANSFERENCIA", "PLIN", "TARJETA"];

type PatientSeed = {
  firstName: string;
  lastName: string;
  sex: "FEMENINO" | "MASCULINO";
  minor?: boolean;
  kind: "regular" | "nuevo" | "abandono" | "alta";
};

async function reset() {
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

function dni() {
  return String(10000000 + Math.floor(rand() * 89999999));
}
function phone() {
  return `9${String(Math.floor(rand() * 100000000)).padStart(8, "0")}`;
}
function birthDate(minor: boolean) {
  const year = minor ? 2014 + Math.floor(rand() * 5) : 1975 + Math.floor(rand() * 30);
  const month = 1 + Math.floor(rand() * 12);
  const day = 1 + Math.floor(rand() * 28);
  return new Date(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00Z`);
}

type Slot = { dow: number; time: string };
function slotsFor(times: string[]): Slot[] {
  const all: Slot[] = [];
  for (let dow = 0; dow < 5; dow++) for (const time of times) all.push({ dow, time });
  // barajar
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [all[i], all[j]] = [all[j]!, all[i]!];
  }
  return all;
}

async function seedPatients(opts: {
  organizationId: string;
  professionalId: string;
  roomId: string | null;
  registeredById: string;
  patients: PatientSeed[];
  times: string[];
  pricePerPackage: { 4: number; 8: number };
  createdById: string;
  /** Quien figura en la bitácora como autor de la asignación inicial (el administrador). */
  assignedById: string;
}) {
  const now = Date.now();
  const today = todayKey();
  const weekStart = startOfLimaWeekKey(today);
  const slots = slotsFor(opts.times);

  for (const [i, p] of opts.patients.entries()) {
    const slot = slots[i % slots.length]!;
    const minor = !!p.minor;
    const patient = await db.patient.create({
      data: {
        organizationId: opts.organizationId,
        professionalId: opts.professionalId,
        firstName: p.firstName,
        lastName: p.lastName,
        documentType: "DNI",
        documentNumber: dni(),
        birthDate: birthDate(minor),
        sex: p.sex,
        phone: phone(),
        email: minor ? null : `${p.firstName.split(" ")[0]!.toLowerCase()}.${p.lastName.split(" ")[0]!.toLowerCase()}@correo.pe`.normalize("NFD").replace(/[̀-ͯ]/g, ""),
        district: pick(DISTRICTS),
        occupation: minor ? "Estudiante (primaria)" : pick(["Docente", "Ingeniera de sistemas", "Contador", "Estudiante universitaria", "Administrador", "Enfermera", "Diseñador gráfico", "Abogada"]),
        educationLevel: minor ? "Primaria en curso" : pick(["Superior universitaria", "Superior técnica", "Secundaria completa"]),
        maritalStatus: minor ? null : pick(["Soltero(a)", "Casado(a)", "Conviviente", "Divorciado(a)"]),
        guardianName: minor ? `${pick(["Rocío", "Julio", "Silvia", "Martín"])} ${p.lastName.split(" ")[0]}` : null,
        guardianRelationship: minor ? pick(["Madre", "Padre"]) : null,
        guardianPhone: minor ? phone() : null,
        emergencyContactName: minor ? null : `${pick(["Elena", "Raúl", "Patricia", "Óscar"])} ${pick(["Rojas", "Paredes", "Ríos"])}`,
        emergencyContactRelationship: minor ? null : pick(["Madre", "Hermano(a)", "Pareja"]),
        emergencyContactPhone: minor ? null : phone(),
        referralSource: pick(["Recomendación de un familiar", "Instagram", "Google", "Referido por médico", "Colegio"]),
        status: p.kind === "alta" ? "ALTA" : "ACTIVO",
      },
    });

    await db.clinicalRecord.create({
      data: {
        patientId: patient.id,
        // La escribió el tratante (si quedara en null, la regla de autoasignación la trataría como ajena).
        updatedById: opts.professionalId,
        consultationReason: minor ? pick(CHILD_REASONS) : pick(REASONS),
        currentProblemHistory: "Refiere inicio de los síntomas hace aproximadamente 4 meses, con aumento progresivo en las últimas semanas.",
        personalHistory: "Sin antecedentes médicos relevantes. Niega hospitalizaciones.",
        previousTreatments: chance(0.3) ? "Recibió terapia psicológica breve hace dos años." : "Ninguno.",
        familyHistory: chance(0.4) ? "Madre con antecedentes de ansiedad." : "No refiere antecedentes relevantes.",
        currentMedication: chance(0.2) ? "Sertralina 50 mg/día (indicada por psiquiatra)." : "Ninguna.",
        substanceUse: minor ? null : "Consumo social de alcohol. Niega otras sustancias.",
        mentalStatusExam: "Lúcido, orientado en tiempo, espacio y persona. Discurso coherente. Afecto congruente.",
        diagnosticImpression: minor ? "Dificultades de regulación emocional en contexto escolar." : pick(["Sintomatología ansiosa moderada.", "Episodio depresivo leve.", "Reacción de adaptación."]),
        diagnosisCode: minor ? null : pick(["F41.1", "F32.0", "F43.2"]),
        treatmentGoals: "1) Disminuir la intensidad de los síntomas. 2) Desarrollar estrategias de afrontamiento. 3) Fortalecer red de apoyo.",
        treatmentPlan: minor ? "Terapia de juego con orientación a padres cada dos sesiones." : "Terapia cognitivo-conductual, 1 sesión semanal.",
        riskLevel: chance(0.1) ? "MODERADO" : "NINGUNO",
        informedConsent: true,
        informedConsentDate: new Date(now - 60 * 24 * 60 * 60 * 1000),
      },
    });

    // Semanas con cita según el tipo de paciente (0 = esta semana).
    const [fromWeek, toWeek] =
      p.kind === "nuevo" ? [-1, 2] : p.kind === "abandono" ? [-6, -3] : p.kind === "alta" ? [-11, -4] : [-2 - Math.floor(rand() * 6), 2];

    type Appt = { startsAt: Date; endsAt: Date; status: AppointmentStatus };
    const appts: Appt[] = [];
    for (let w = fromWeek; w <= toWeek; w++) {
      const dateKey = addDaysKey(weekStart, w * 7 + slot.dow);
      const startsAt = fromLimaLocal(dateKey, slot.time);
      const endsAt = new Date(startsAt.getTime() + MINUTES * 60 * 1000);
      let status: AppointmentStatus;
      if (endsAt.getTime() < now) {
        status = chance(0.07) ? "NO_ASISTIO" : chance(0.04) ? "CANCELADA" : "ATENDIDA";
      } else {
        status = startsAt.getTime() - now < 3 * 24 * 60 * 60 * 1000 && chance(0.6) ? "CONFIRMADA" : "PROGRAMADA";
      }
      appts.push({ startsAt, endsAt, status });
    }

    // Asignación a paquetes: atendidas y agendadas consumen cupo.
    let current: { id: string; total: number; used: number; startsAt: Date } | null = null;
    const packages: { id: string; total: number; used: number; startsAt: Date }[] = [];
    let noteNumber = 0;
    for (const a of appts) {
      const consumes = a.status === "ATENDIDA" || a.status === "PROGRAMADA" || a.status === "CONFIRMADA";
      const exhausted = !current || current.used >= current.total;
      // Una cita futura con el paquete agotado queda sin paquete: el paciente aún no renovó
      // (es justo el caso que el panel de renovaciones debe detectar).
      if (consumes && exhausted && current && a.status !== "ATENDIDA") {
        await db.appointment.create({
          data: {
            organizationId: opts.organizationId,
            patientId: patient.id,
            professionalId: opts.professionalId,
            roomId: opts.roomId,
            packageId: null,
            startsAt: a.startsAt,
            endsAt: a.endsAt,
            status: a.status,
            modality: "PRESENCIAL",
            createdById: opts.createdById,
          },
        });
        continue;
      }
      if (consumes && exhausted) {
        const total = p.kind === "abandono" ? 4 : chance(0.65) ? 4 : 8;
        const pkg = await db.package.create({
          data: {
            organizationId: opts.organizationId,
            patientId: patient.id,
            name: `Paquete ${total} sesiones`,
            totalSessions: total,
            priceCents: opts.pricePerPackage[total as 4 | 8],
            startDate: a.startsAt,
            createdAt: a.startsAt,
          },
        });
        current = { id: pkg.id, total, used: 0, startsAt: a.startsAt };
        packages.push(current);
      }
      if (consumes && current) current.used++;
      const appointment = await db.appointment.create({
        data: {
          organizationId: opts.organizationId,
          patientId: patient.id,
          professionalId: opts.professionalId,
          roomId: opts.roomId,
          packageId: a.status === "CANCELADA" ? null : (current?.id ?? null),
          startsAt: a.startsAt,
          endsAt: a.endsAt,
          status: a.status,
          modality: chance(0.15) ? "VIRTUAL" : "PRESENCIAL",
          cancelReason: a.status === "CANCELADA" ? "El paciente avisó que no podía asistir." : null,
          reminderSentAt:
            a.status === "CONFIRMADA" || (a.status !== "PROGRAMADA" && chance(0.8))
              ? new Date(a.startsAt.getTime() - 24 * 60 * 60 * 1000)
              : null,
          createdById: opts.createdById,
        },
      });
      if (a.status === "ATENDIDA") {
        noteNumber++;
        await db.sessionNote.create({
          data: {
            patientId: patient.id,
            authorId: opts.professionalId,
            appointmentId: appointment.id,
            sessionDate: a.startsAt,
            sessionNumber: noteNumber,
            modality: appointment.modality,
            moodObserved: pick(MOODS),
            topics: pick(TOPICS),
            development:
              noteNumber === 1
                ? "Sesión de evaluación inicial. Se exploró el motivo de consulta, se establecieron acuerdos de trabajo y se firmó el consentimiento informado."
                : "Se revisaron las tareas de la semana. El paciente reporta avances parciales y se trabajó en las situaciones que generaron mayor malestar.",
            interventions: pick(INTERVENTIONS),
            homework: pick(HOMEWORK),
            nextSessionPlan: "Continuar con el plan de intervención y revisar la tarea asignada.",
            riskLevel: "NINGUNO",
          },
        });
      }
    }

    // El paciente se registró un día antes de su primera cita (para que los reportes de
    // "pacientes nuevos" por mes tengan sentido).
    const registeredAt = appts[0] ? new Date(appts[0].startsAt.getTime() - 24 * 60 * 60 * 1000) : patient.createdAt;
    if (appts[0]) {
      await db.patient.update({ where: { id: patient.id }, data: { createdAt: registeredAt } });
    }

    // Asignación inicial en la bitácora de tratantes.
    await db.patientAssignment.create({
      data: {
        organizationId: opts.organizationId,
        patientId: patient.id,
        fromUserId: null,
        toUserId: opts.professionalId,
        changedById: opts.assignedById,
        createdAt: registeredAt,
      },
    });

    // Estado de cada paquete + pagos.
    for (const pkg of packages) {
      const attended = await db.appointment.count({ where: { packageId: pkg.id, status: "ATENDIDA" } });
      const completed = attended >= pkg.total;
      const price = opts.pricePerPackage[pkg.total as 4 | 8];
      await db.package.update({
        where: { id: pkg.id },
        data: {
          status: completed ? "COMPLETADO" : "ACTIVO",
          renewalNotifiedAt: !completed && pkg.total - attended <= 1 && chance(0.4) ? new Date(now - 24 * 60 * 60 * 1000) : null,
        },
      });
      const paidAt = new Date(pkg.startsAt.getTime() - 30 * 60 * 1000);
      const partial = !completed && chance(0.3);
      const payments: Prisma.PaymentCreateManyInput[] = [];
      if (partial) {
        payments.push({ organizationId: opts.organizationId, patientId: patient.id, packageId: pkg.id, amountCents: Math.round(price / 2), method: pick(METHODS), paidAt, registeredById: opts.registeredById });
      } else if (chance(0.3)) {
        const half = Math.round(price / 2);
        payments.push({ organizationId: opts.organizationId, patientId: patient.id, packageId: pkg.id, amountCents: half, method: pick(METHODS), paidAt, registeredById: opts.registeredById });
        payments.push({ organizationId: opts.organizationId, patientId: patient.id, packageId: pkg.id, amountCents: price - half, method: pick(METHODS), paidAt: new Date(paidAt.getTime() + 14 * 24 * 60 * 60 * 1000 > now ? now - 60 * 60 * 1000 : paidAt.getTime() + 14 * 24 * 60 * 60 * 1000), registeredById: opts.registeredById });
      } else {
        payments.push({ organizationId: opts.organizationId, patientId: patient.id, packageId: pkg.id, amountCents: price, method: pick(METHODS), paidAt, registeredById: opts.registeredById });
      }
      for (const pay of payments) {
        if (pay.method === "YAPE" || pay.method === "PLIN" || pay.method === "TRANSFERENCIA") pay.reference = String(100000 + Math.floor(rand() * 899999));
      }
      await db.payment.createMany({ data: payments });
    }
  }
}

async function main() {
  await reset();
  const passwordHash = await hash(PASSWORD, 10);
  const DAY = 24 * 60 * 60 * 1000;

  // ---------------- Centro psicológico ----------------
  const centro = await db.organization.create({
    data: {
      name: "Centro Psicológico Bienestar",
      type: "CENTRO",
      plan: "PRUEBA",
      trialEndsAt: new Date(Date.now() + 5 * DAY),
      phone: "987654321",
      email: "contacto@bienestar.pe",
      address: "Av. Arequipa 2450, of. 301",
      ruc: "20601234567",
    },
  });
  const [admin, recepcion, lucia, diego, andrea] = await Promise.all([
    db.user.create({ data: { organizationId: centro.id, name: "Carla Mendoza", email: "admin@bienestar.pe", passwordHash, role: "ADMIN", phone: "987111222" } }),
    db.user.create({ data: { organizationId: centro.id, name: "Rosa Quispe", email: "recepcion@bienestar.pe", passwordHash, role: "RECEPCION", phone: "987333444" } }),
    db.user.create({ data: { organizationId: centro.id, name: "Lucía Fernández", email: "lucia@bienestar.pe", passwordHash, role: "PSICOLOGO", isProfessional: true, specialty: "Terapia cognitivo-conductual (adultos)", licenseNumber: "C.Ps.P. 28451", calendarColor: "#4C8DD7" } }),
    db.user.create({ data: { organizationId: centro.id, name: "Diego Salazar", email: "diego@bienestar.pe", passwordHash, role: "PSICOLOGO", isProfessional: true, specialty: "Psicología infantil y familiar", licenseNumber: "C.Ps.P. 31207", calendarColor: "#39B6AF" } }),
    db.user.create({ data: { organizationId: centro.id, name: "Andrea Villanueva", email: "andrea@bienestar.pe", passwordHash, role: "PSICOLOGO", isProfessional: true, specialty: "Terapia de pareja", licenseNumber: "C.Ps.P. 25873", calendarColor: "#E5A13A" } }),
  ]);
  const [c1, c2, c3] = await Promise.all([
    db.room.create({ data: { organizationId: centro.id, name: "Consultorio 1" } }),
    db.room.create({ data: { organizationId: centro.id, name: "Consultorio 2" } }),
    db.room.create({ data: { organizationId: centro.id, name: "Sala familiar", description: "Ambiente amplio para terapia familiar e infantil" } }),
  ]);

  const common = { organizationId: centro.id, registeredById: recepcion.id, createdById: recepcion.id, assignedById: admin.id, pricePerPackage: { 4: 44000, 8: 84000 } };
  await seedPatients({
    ...common,
    professionalId: lucia.id,
    roomId: c1.id,
    times: ["09:00", "10:00", "11:00", "16:00", "17:00", "18:00"],
    patients: [
      { firstName: "Valeria", lastName: "Rojas Paredes", sex: "FEMENINO", kind: "regular" },
      { firstName: "Jorge", lastName: "Huamán Castillo", sex: "MASCULINO", kind: "regular" },
      { firstName: "Camila", lastName: "Torres Vega", sex: "FEMENINO", kind: "regular" },
      { firstName: "Renato", lastName: "Gutiérrez Ríos", sex: "MASCULINO", kind: "regular" },
      { firstName: "Milagros", lastName: "Chávez Soto", sex: "FEMENINO", kind: "abandono" },
      { firstName: "Sebastián", lastName: "Vargas León", sex: "MASCULINO", kind: "nuevo" },
      { firstName: "Karina", lastName: "Espinoza Luna", sex: "FEMENINO", kind: "regular" },
      { firstName: "Álvaro", lastName: "Palacios Díaz", sex: "MASCULINO", kind: "alta" },
    ],
  });
  await seedPatients({
    ...common,
    professionalId: diego.id,
    roomId: c3.id,
    times: ["15:00", "16:00", "17:00", "18:00"],
    pricePerPackage: { 4: 40000, 8: 76000 },
    patients: [
      { firstName: "Mateo", lastName: "Quispe Flores", sex: "MASCULINO", minor: true, kind: "regular" },
      { firstName: "Luana", lastName: "Mendoza García", sex: "FEMENINO", minor: true, kind: "regular" },
      { firstName: "Thiago", lastName: "Ramírez Cárdenas", sex: "MASCULINO", minor: true, kind: "nuevo" },
      { firstName: "Ariana", lastName: "Alvarado Núñez", sex: "FEMENINO", minor: true, kind: "regular" },
      { firstName: "Gael", lastName: "Salinas Pérez", sex: "MASCULINO", minor: true, kind: "abandono" },
      { firstName: "Isabella", lastName: "Campos Herrera", sex: "FEMENINO", minor: true, kind: "regular" },
    ],
  });
  await seedPatients({
    ...common,
    professionalId: andrea.id,
    roomId: c2.id,
    times: ["10:00", "11:00", "12:00", "18:00", "19:00"],
    patients: [
      { firstName: "Daniela", lastName: "Cárdenas Ruiz", sex: "FEMENINO", kind: "regular" },
      { firstName: "Luis", lastName: "Paredes Aguilar", sex: "MASCULINO", kind: "regular" },
      { firstName: "Fernanda", lastName: "Vásquez Ortiz", sex: "FEMENINO", kind: "regular" },
      { firstName: "Carlos", lastName: "Salazar Medina", sex: "MASCULINO", kind: "nuevo" },
      { firstName: "Gabriela", lastName: "Ríos Tapia", sex: "FEMENINO", kind: "regular" },
    ],
  });

  // ---------------- Psicóloga independiente ----------------
  const individual = await db.organization.create({
    data: {
      name: "Consultorio Ps. Ana Torres",
      type: "INDIVIDUAL",
      plan: "INDIVIDUAL",
      trialEndsAt: new Date(Date.now() - 20 * DAY),
      phone: "986555777",
      email: "ana@neuvi.demo",
      address: "Calle Los Pinos 180, Miraflores",
    },
  });
  const ana = await db.user.create({
    data: {
      organizationId: individual.id,
      name: "Ana Torres",
      email: "ana@neuvi.demo",
      passwordHash,
      role: "ADMIN",
      isProfessional: true,
      specialty: "Psicología clínica (adultos y adolescentes)",
      licenseNumber: "C.Ps.P. 30112",
      calendarColor: "#4C8DD7",
      phone: "986555777",
    },
  });
  await seedPatients({
    organizationId: individual.id,
    professionalId: ana.id,
    roomId: null,
    registeredById: ana.id,
    createdById: ana.id,
    assignedById: ana.id,
    pricePerPackage: { 4: 36000, 8: 68000 },
    times: ["08:00", "19:00", "20:00"],
    patients: [
      { firstName: "Sofía", lastName: "Castillo Rivas", sex: "FEMENINO", kind: "regular" },
      { firstName: "Miguel", lastName: "Flores Lozano", sex: "MASCULINO", kind: "regular" },
      { firstName: "Alejandra", lastName: "García Benites", sex: "FEMENINO", kind: "regular" },
      { firstName: "Kevin", lastName: "Rojas Ugarte", sex: "MASCULINO", kind: "abandono" },
      { firstName: "Patricia", lastName: "León Arévalo", sex: "FEMENINO", kind: "nuevo" },
      { firstName: "Ricardo", lastName: "Mejía Solís", sex: "MASCULINO", kind: "regular" },
    ],
  });

  const counts = {
    organizaciones: await db.organization.count(),
    usuarios: await db.user.count(),
    pacientes: await db.patient.count(),
    citas: await db.appointment.count(),
    paquetes: await db.package.count(),
    pagos: await db.payment.count(),
    notas: await db.sessionNote.count(),
    asignaciones: await db.patientAssignment.count(),
  };
  console.log("Seed completado:", counts);
  console.log(`Usuarios demo (contraseña: ${PASSWORD}): admin@bienestar.pe, recepcion@bienestar.pe, lucia@bienestar.pe, diego@bienestar.pe, andrea@bienestar.pe, ana@neuvi.demo`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
