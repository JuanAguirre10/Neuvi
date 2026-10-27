// Cuentas suscritas a Neuvi. Las dos primeras son las cuentas demo (usuarios fijos); el resto se
// genera con equipo, pacientes y agenda propios. Las altas crecen mes a mes en los últimos 14 meses.
import type { BillingCycle, OrgType, Role, SubscriptionStatus } from "@prisma/client";
import type { SpecialtyKey } from "./clinical";
import type { Region } from "./places";

export type Sex = "F" | "M";
export type Person = { first: string; last: string; sex: Sex };

export type SubscriptionSpec = {
  status: SubscriptionStatus;
  cycle?: BillingCycle;
  /** Precio mensual pactado en soles (por psicólogo en el plan Centro). */
  price?: number;
  /** Días que soporte extendió la prueba. */
  extendTrial?: number;
  /** Día (desde el alta) en que finanzas activó el plan. */
  activateAt?: number;
  priceChange?: { at: number; to: number };
  /** Se registró como independiente y pasó a centro el día `at` (precio por psicólogo). */
  upgrade?: { at: number; price: number };
  /** Estuvo suspendida por una factura vencida cerca del día `at` y luego pagó. */
  pastSuspension?: { at: number };
  /** Facturas vencidas sin pagar (SUSPENDIDA: las que motivaron la suspensión). */
  overdue?: number;
  cancelAt?: number;
  cancelReason?: string;
  /** Factura anulada: la del periodo más cercano a hace `daysAgo` días. */
  voided?: { daysAgo: number; reason: string };
  /** Pago parcial en la última factura impaga (o en la última emitida). */
  partial?: boolean;
  /** 50 % de descuento en la primera factura. */
  welcome?: boolean;
};

export type FixedUser = {
  name: string;
  email: string;
  role: Role;
  sex: Sex;
  isProfessional?: boolean;
  specialty?: SpecialtyKey;
  specialtyLabel?: string;
  licenseNumber?: string;
  calendarColor?: string;
  phone?: string;
  /** Horario fijo de lunes a viernes ("HH:mm"); los sábados opcionales. */
  times?: string[];
  saturday?: string[];
  room?: number;
  /** Precios en céntimos: sesión suelta, paquete de 4 y de 8. */
  prices?: { single: number; p4: number; p8: number };
  capacity?: number;
};

export type PresetPatient = {
  firstName: string;
  lastName: string;
  sex: Sex;
  minor?: boolean;
  kind: "regular" | "nuevo" | "abandono" | "alta";
  /** Correo del psicólogo tratante. */
  professional: string;
};

export type OrgSpec = {
  name: string;
  type: OrgType;
  region: Region;
  district: string;
  domain: string;
  daysAgo: number;
  sub: SubscriptionSpec;
  /** Profesionales activos al final (incluye al administrador si atiende). */
  psychologists: number;
  reception: number;
  rooms: number;
  specialties: SpecialtyKey[];
  founder?: Person & { specialty: SpecialtyKey };
  adminAttends?: boolean;
  /** Independiente con asistente (rol recepción). */
  assistant?: boolean;
  /** Un psicólogo dejó el centro (queda inactivo y sus pacientes se traspasan). */
  leaver?: boolean;
  /** Una recepcionista se fue y la reemplazaron. */
  receptionLeaver?: boolean;
  /** Psicólogos que se sumaron meses después del alta. */
  laterHires?: number;
  /** El último consultorio está desactivado. */
  inactiveRoom?: boolean;
  previousName?: string;
  // Solo cuentas demo
  demo?: {
    exactTrialEndInDays?: number;
    address: string;
    phone: string;
    email: string;
    ruc: string | null;
    users: FixedUser[];
    rooms: (readonly [string, string | null])[];
    patients: PresetPatient[];
  };
};

const BIENESTAR_PATIENTS: PresetPatient[] = [
  { firstName: "Valeria", lastName: "Rojas Paredes", sex: "F", kind: "regular", professional: "lucia@bienestar.pe" },
  { firstName: "Jorge", lastName: "Huamán Castillo", sex: "M", kind: "regular", professional: "lucia@bienestar.pe" },
  { firstName: "Camila", lastName: "Torres Vega", sex: "F", kind: "regular", professional: "lucia@bienestar.pe" },
  { firstName: "Renato", lastName: "Gutiérrez Ríos", sex: "M", kind: "regular", professional: "lucia@bienestar.pe" },
  { firstName: "Milagros", lastName: "Chávez Soto", sex: "F", kind: "abandono", professional: "lucia@bienestar.pe" },
  { firstName: "Sebastián", lastName: "Vargas León", sex: "M", kind: "nuevo", professional: "lucia@bienestar.pe" },
  { firstName: "Karina", lastName: "Espinoza Luna", sex: "F", kind: "regular", professional: "lucia@bienestar.pe" },
  { firstName: "Álvaro", lastName: "Palacios Díaz", sex: "M", kind: "alta", professional: "lucia@bienestar.pe" },
  { firstName: "Mateo", lastName: "Quispe Flores", sex: "M", minor: true, kind: "regular", professional: "diego@bienestar.pe" },
  { firstName: "Luana", lastName: "Mendoza García", sex: "F", minor: true, kind: "regular", professional: "diego@bienestar.pe" },
  { firstName: "Thiago", lastName: "Ramírez Cárdenas", sex: "M", minor: true, kind: "nuevo", professional: "diego@bienestar.pe" },
  { firstName: "Ariana", lastName: "Alvarado Núñez", sex: "F", minor: true, kind: "regular", professional: "diego@bienestar.pe" },
  { firstName: "Gael", lastName: "Salinas Pérez", sex: "M", minor: true, kind: "abandono", professional: "diego@bienestar.pe" },
  { firstName: "Isabella", lastName: "Campos Herrera", sex: "F", minor: true, kind: "regular", professional: "diego@bienestar.pe" },
  { firstName: "Daniela", lastName: "Cárdenas Ruiz", sex: "F", kind: "regular", professional: "andrea@bienestar.pe" },
  { firstName: "Luis", lastName: "Paredes Aguilar", sex: "M", kind: "regular", professional: "andrea@bienestar.pe" },
  { firstName: "Fernanda", lastName: "Vásquez Ortiz", sex: "F", kind: "regular", professional: "andrea@bienestar.pe" },
  { firstName: "Carlos", lastName: "Salazar Medina", sex: "M", kind: "nuevo", professional: "andrea@bienestar.pe" },
  { firstName: "Gabriela", lastName: "Ríos Tapia", sex: "F", kind: "regular", professional: "andrea@bienestar.pe" },
];

const ANA_PATIENTS: PresetPatient[] = [
  { firstName: "Sofía", lastName: "Castillo Rivas", sex: "F", kind: "regular", professional: "ana@neuvi.demo" },
  { firstName: "Miguel", lastName: "Flores Lozano", sex: "M", kind: "regular", professional: "ana@neuvi.demo" },
  { firstName: "Alejandra", lastName: "García Benites", sex: "F", kind: "regular", professional: "ana@neuvi.demo" },
  { firstName: "Kevin", lastName: "Rojas Ugarte", sex: "M", kind: "abandono", professional: "ana@neuvi.demo" },
  { firstName: "Patricia", lastName: "León Arévalo", sex: "F", kind: "nuevo", professional: "ana@neuvi.demo" },
  { firstName: "Ricardo", lastName: "Mejía Solís", sex: "M", kind: "regular", professional: "ana@neuvi.demo" },
];

export const DEMO_ORGS: OrgSpec[] = [
  {
    name: "Centro Psicológico Bienestar",
    type: "CENTRO",
    region: "lima",
    district: "Lince",
    domain: "bienestar.pe",
    daysAgo: 85,
    sub: { status: "PRUEBA" },
    psychologists: 3,
    reception: 1,
    rooms: 3,
    specialties: ["tcc", "infantil", "pareja"],
    demo: {
      exactTrialEndInDays: 5,
      address: "Av. Arequipa 2450, of. 301",
      phone: "987654321",
      email: "contacto@bienestar.pe",
      ruc: "20601234567",
      users: [
        { name: "Carla Mendoza", email: "admin@bienestar.pe", role: "ADMIN", sex: "F", phone: "987111222" },
        { name: "Rosa Quispe", email: "recepcion@bienestar.pe", role: "RECEPCION", sex: "F", phone: "987333444" },
        {
          name: "Lucía Fernández",
          email: "lucia@bienestar.pe",
          role: "PSICOLOGO",
          sex: "F",
          isProfessional: true,
          specialty: "tcc",
          specialtyLabel: "Terapia cognitivo-conductual (adultos)",
          licenseNumber: "C.Ps.P. 28451",
          calendarColor: "#4C8DD7",
          times: ["09:00", "10:00", "11:00", "16:00", "17:00", "18:00"],
          room: 0,
          prices: { single: 12000, p4: 44000, p8: 84000 },
          capacity: 13,
        },
        {
          name: "Diego Salazar",
          email: "diego@bienestar.pe",
          role: "PSICOLOGO",
          sex: "M",
          isProfessional: true,
          specialty: "infantil",
          specialtyLabel: "Psicología infantil y familiar",
          licenseNumber: "C.Ps.P. 31207",
          calendarColor: "#39B6AF",
          times: ["15:00", "16:00", "17:00", "18:00"],
          saturday: ["09:00", "10:00", "11:00"],
          room: 2,
          prices: { single: 11000, p4: 40000, p8: 76000 },
          capacity: 11,
        },
        {
          name: "Andrea Villanueva",
          email: "andrea@bienestar.pe",
          role: "PSICOLOGO",
          sex: "F",
          isProfessional: true,
          specialty: "pareja",
          specialtyLabel: "Terapia de pareja",
          licenseNumber: "C.Ps.P. 25873",
          calendarColor: "#E5A13A",
          times: ["10:00", "11:00", "12:00", "18:00", "19:00"],
          room: 1,
          prices: { single: 12000, p4: 44000, p8: 84000 },
          capacity: 10,
        },
      ],
      rooms: [
        ["Consultorio 1", null],
        ["Consultorio 2", null],
        ["Sala familiar", "Ambiente amplio para terapia familiar e infantil"],
      ],
      patients: BIENESTAR_PATIENTS,
    },
  },
  {
    name: "Consultorio Ps. Ana Torres",
    type: "INDIVIDUAL",
    region: "lima",
    district: "Miraflores",
    domain: "neuvi.demo",
    daysAgo: 200,
    sub: { status: "ACTIVA", price: 69, activateAt: 89 },
    psychologists: 1,
    reception: 0,
    rooms: 0,
    specialties: ["clinica"],
    demo: {
      address: "Calle Los Pinos 180, Miraflores",
      phone: "986555777",
      email: "ana@neuvi.demo",
      ruc: null,
      users: [
        {
          name: "Ana Torres",
          email: "ana@neuvi.demo",
          role: "ADMIN",
          sex: "F",
          isProfessional: true,
          specialty: "clinica",
          specialtyLabel: "Psicología clínica (adultos y adolescentes)",
          licenseNumber: "C.Ps.P. 30112",
          calendarColor: "#4C8DD7",
          phone: "986555777",
          times: ["08:00", "17:00", "18:00", "19:00", "20:00"],
          saturday: ["09:00", "10:00", "11:00"],
          prices: { single: 10000, p4: 36000, p8: 68000 },
          capacity: 14,
        },
      ],
      rooms: [],
      patients: ANA_PATIENTS,
    },
  },
];

export const GENERATED_ORGS: OrgSpec[] = [
  // ---- 2025 ----
  {
    name: "Consultorio Ps. Rosa Delgado",
    type: "INDIVIDUAL",
    region: "lima",
    district: "Magdalena del Mar",
    domain: "rosadelgadopsicologa.pe",
    daysAgo: 415,
    founder: { first: "Rosa", last: "Delgado Vílchez", sex: "F", specialty: "tcc" },
    psychologists: 1,
    reception: 0,
    assistant: true,
    rooms: 1,
    specialties: ["tcc"],
    sub: { status: "ACTIVA", price: 59, activateAt: 90, priceChange: { at: 300, to: 69 } },
  },
  {
    name: "Centro Psicológico Renacer",
    type: "CENTRO",
    region: "lima",
    district: "Los Olivos",
    domain: "centrorenacer.pe",
    daysAgo: 386,
    psychologists: 5,
    reception: 2,
    receptionLeaver: true,
    rooms: 4,
    leaver: true,
    laterHires: 1,
    specialties: ["clinica", "infantil", "tcc", "familia", "adolescentes"],
    sub: {
      status: "ACTIVA",
      price: 55,
      activateAt: 88,
      priceChange: { at: 250, to: 50 },
      voided: { daysAgo: 400, reason: "Mes de cortesía por la migración de sus datos desde Excel." },
    },
  },
  {
    name: "Instituto de Psicología Mente Sana",
    type: "CENTRO",
    region: "lima",
    district: "San Borja",
    domain: "mentesana.com.pe",
    daysAgo: 356,
    psychologists: 7,
    reception: 2,
    rooms: 5,
    inactiveRoom: true,
    adminAttends: true,
    laterHires: 2,
    specialties: ["tcc", "clinica", "pareja", "infantil", "adolescentes", "duelo", "act"],
    sub: { status: "ACTIVA", cycle: "ANUAL", price: 48, activateAt: 92 },
  },
  {
    name: "Kawsay Centro de Psicología",
    type: "CENTRO",
    region: "cusco",
    district: "Wanchaq",
    domain: "kawsaypsicologia.pe",
    daysAgo: 323,
    psychologists: 3,
    reception: 1,
    rooms: 2,
    adminAttends: true,
    specialties: ["clinica", "infantil", "familia"],
    sub: { status: "ACTIVA", price: 45, activateAt: 95, pastSuspension: { at: 190 } },
  },
  // ---- 2026 ----
  {
    name: "Ps. Martín Cárdenas · Terapia de pareja",
    type: "INDIVIDUAL",
    region: "lima",
    district: "Miraflores",
    domain: "martincardenas.pe",
    daysAgo: 296,
    founder: { first: "Martín", last: "Cárdenas Ugarte", sex: "M", specialty: "pareja" },
    psychologists: 1,
    reception: 0,
    assistant: true,
    rooms: 1,
    specialties: ["pareja"],
    sub: { status: "ACTIVA", cycle: "ANUAL", price: 65, activateAt: 86 },
  },
  {
    name: "Centro de Terapia Familiar Raíces",
    type: "CENTRO",
    region: "lima",
    district: "Santiago de Surco",
    domain: "raicesterapiafamiliar.pe",
    daysAgo: 281,
    psychologists: 3,
    reception: 1,
    rooms: 2,
    specialties: ["familia", "pareja", "infantil"],
    sub: {
      status: "CANCELADA",
      price: 52,
      activateAt: 90,
      cancelAt: 236,
      cancelReason: "Las socias cerraron el local de Surco. Dos psicólogas seguirán atendiendo por su cuenta y evaluarán el plan individual.",
    },
  },
  {
    name: "Psicólogos Asociados del Norte",
    type: "CENTRO",
    region: "trujillo",
    district: "Trujillo",
    domain: "psicologosdelnorte.pe",
    daysAgo: 263,
    founder: { first: "Henry", last: "Alva Briceño", sex: "M", specialty: "clinica" },
    previousName: "Consultorio Ps. Henry Alva",
    psychologists: 4,
    reception: 1,
    rooms: 3,
    adminAttends: true,
    specialties: ["clinica", "tcc", "infantil", "pareja"],
    sub: { status: "ACTIVA", price: 59, activateAt: 90, upgrade: { at: 165, price: 50 }, welcome: true },
  },
  {
    name: "Huellas Centro de Desarrollo Infantil",
    type: "CENTRO",
    region: "lima",
    district: "La Molina",
    domain: "huellasinfantil.pe",
    daysAgo: 247,
    psychologists: 6,
    reception: 2,
    rooms: 5,
    leaver: true,
    specialties: ["infantil", "neuro", "infantil", "adolescentes", "familia", "neuro"],
    sub: { status: "ACTIVA", cycle: "ANUAL", price: 50, activateAt: 82 },
  },
  {
    name: "Centro Psicológico Equilibrio",
    type: "CENTRO",
    region: "arequipa",
    district: "Yanahuara",
    domain: "equilibrioarequipa.pe",
    daysAgo: 232,
    psychologists: 4,
    reception: 1,
    rooms: 3,
    specialties: ["tcc", "clinica", "adolescentes", "pareja"],
    sub: { status: "SUSPENDIDA", price: 50, activateAt: 90, overdue: 3, partial: true },
  },
  {
    name: "Sinapsis Neuropsicología",
    type: "CENTRO",
    region: "lima",
    district: "Miraflores",
    domain: "sinapsisneuro.pe",
    daysAgo: 214,
    psychologists: 3,
    reception: 1,
    rooms: 2,
    adminAttends: true,
    specialties: ["neuro", "neuro", "infantil"],
    sub: {
      status: "ACTIVA",
      price: 58,
      activateAt: 88,
      priceChange: { at: 170, to: 55 },
      voided: { daysAgo: 45, reason: "Mes bonificado por recomendar al Centro Psicológico Sanar." },
    },
  },
  {
    name: "Consultorio Ps. Gianella Seminario",
    type: "INDIVIDUAL",
    region: "piura",
    district: "Piura",
    domain: "gianellaseminario.pe",
    daysAgo: 205,
    founder: { first: "Gianella", last: "Seminario Távara", sex: "F", specialty: "adolescentes" },
    psychologists: 1,
    reception: 0,
    rooms: 0,
    specialties: ["adolescentes"],
    sub: { status: "ACTIVA", price: 62, extendTrial: 15, activateAt: 110, partial: true },
  },
  {
    name: "Centro Psicológico Nuevo Horizonte",
    type: "CENTRO",
    region: "lima",
    district: "San Juan de Lurigancho",
    domain: "nuevohorizontepsico.pe",
    daysAgo: 189,
    psychologists: 4,
    reception: 1,
    rooms: 3,
    specialties: ["clinica", "infantil", "familia", "tcc"],
    sub: { status: "ACTIVA", price: 45, activateAt: 91, overdue: 1 },
  },
  {
    name: "Espacio Vincular",
    type: "CENTRO",
    region: "lima",
    district: "Barranco",
    domain: "espaciovincular.pe",
    daysAgo: 177,
    founder: { first: "Claudia", last: "Bazán Matos", sex: "F", specialty: "pareja" },
    previousName: "Consultorio Ps. Claudia Bazán",
    psychologists: 3,
    reception: 1,
    rooms: 2,
    adminAttends: true,
    specialties: ["pareja", "familia", "clinica"],
    sub: { status: "ACTIVA", price: 69, activateAt: 90, upgrade: { at: 135, price: 52 } },
  },
  {
    name: "Consultorio Ps. Jorge Llontop",
    type: "INDIVIDUAL",
    region: "chiclayo",
    district: "Chiclayo",
    domain: "jorgellontop.pe",
    daysAgo: 166,
    founder: { first: "Jorge", last: "Llontop Chafloque", sex: "M", specialty: "tcc" },
    psychologists: 1,
    reception: 0,
    rooms: 1,
    specialties: ["tcc"],
    sub: { status: "SUSPENDIDA", price: 59, activateAt: 90, overdue: 2 },
  },
  {
    name: "Consultorio Ps. Yesenia Choque",
    type: "INDIVIDUAL",
    region: "lima",
    district: "Villa El Salvador",
    domain: "yeseniachoque.pe",
    daysAgo: 158,
    founder: { first: "Yesenia", last: "Choque Mamani", sex: "F", specialty: "clinica" },
    psychologists: 1,
    reception: 0,
    rooms: 0,
    specialties: ["clinica"],
    sub: { status: "PRUEBA" },
  },
  {
    name: "Centro de Salud Mental Despertar",
    type: "CENTRO",
    region: "piura",
    district: "Castilla",
    domain: "despertarpiura.pe",
    daysAgo: 148,
    psychologists: 2,
    reception: 1,
    rooms: 1,
    adminAttends: true,
    specialties: ["clinica", "tcc"],
    sub: {
      status: "CANCELADA",
      price: 45,
      activateAt: 85,
      cancelAt: 132,
      cancelReason: "Volvieron a la agenda en Excel: la recepcionista no se adaptó y el centro tiene poco movimiento.",
    },
  },
  {
    name: "Consultorio Ps. Patricia Zevallos",
    type: "INDIVIDUAL",
    region: "arequipa",
    district: "Arequipa",
    domain: "patriciazevallos.pe",
    daysAgo: 139,
    founder: { first: "Patricia", last: "Zevallos Begazo", sex: "F", specialty: "duelo" },
    psychologists: 1,
    reception: 0,
    rooms: 1,
    specialties: ["duelo"],
    sub: { status: "ACTIVA", price: 65, activateAt: 88, overdue: 1, partial: true },
  },
  {
    name: "Centro Psicológico Armonía",
    type: "CENTRO",
    region: "huancayo",
    district: "El Tambo",
    domain: "armoniahuancayo.pe",
    daysAgo: 131,
    psychologists: 2,
    reception: 1,
    rooms: 2,
    adminAttends: true,
    specialties: ["clinica", "infantil"],
    sub: { status: "SUSPENDIDA", price: 45, activateAt: 88, overdue: 1 },
  },
  {
    name: "Consultorio Ps. Luis Ricse",
    type: "INDIVIDUAL",
    region: "huancayo",
    district: "Huancayo",
    domain: "luisricse.pe",
    daysAgo: 127,
    founder: { first: "Luis", last: "Ricse Meza", sex: "M", specialty: "clinica" },
    psychologists: 1,
    reception: 0,
    rooms: 1,
    specialties: ["clinica"],
    sub: { status: "PRUEBA", extendTrial: 15 },
  },
  {
    name: "Crecer Juntos Centro Psicológico",
    type: "CENTRO",
    region: "lima",
    district: "Comas",
    domain: "crecerjuntos.pe",
    daysAgo: 116,
    psychologists: 3,
    reception: 1,
    rooms: 2,
    specialties: ["infantil", "infantil", "adolescentes"],
    sub: { status: "PRUEBA", extendTrial: 30 },
  },
  {
    name: "Centro Psicológico Atenea",
    type: "CENTRO",
    region: "arequipa",
    district: "Cayma",
    domain: "ateneapsicologia.pe",
    daysAgo: 112,
    founder: { first: "Gonzalo", last: "Begazo Paz", sex: "M", specialty: "tcc" },
    previousName: "Consultorio Ps. Gonzalo Begazo",
    psychologists: 3,
    reception: 1,
    rooms: 2,
    adminAttends: true,
    specialties: ["tcc", "infantil", "adolescentes"],
    // Se registró como independiente, sumó equipo durante la prueba y activó directamente el plan Centro.
    sub: { status: "ACTIVA", price: 59, activateAt: 92, upgrade: { at: 58, price: 50 } },
  },
  {
    name: "Consultorio Ps. Renzo Alvarado",
    type: "INDIVIDUAL",
    region: "lima",
    district: "San Martín de Porres",
    domain: "renzoalvarado.pe",
    daysAgo: 104,
    founder: { first: "Renzo", last: "Alvarado Huapaya", sex: "M", specialty: "tcc" },
    psychologists: 1,
    reception: 0,
    rooms: 0,
    specialties: ["tcc"],
    sub: { status: "PRUEBA" },
  },
  {
    name: "Consultorio Ps. Katherine Paredes",
    type: "INDIVIDUAL",
    region: "lima",
    district: "San Miguel",
    domain: "katherineparedes.pe",
    daysAgo: 99,
    founder: { first: "Katherine", last: "Paredes Sotelo", sex: "F", specialty: "adolescentes" },
    psychologists: 1,
    reception: 0,
    rooms: 0,
    specialties: ["adolescentes"],
    sub: {
      status: "CANCELADA",
      cancelAt: 86,
      cancelReason: "No continuará al terminar la prueba: atiende pocos pacientes al mes y le basta con su agenda de papel.",
    },
  },
  {
    name: "Consultorio Ps. Milagros Távara",
    type: "INDIVIDUAL",
    region: "lima",
    district: "Surquillo",
    domain: "milagrostavara.pe",
    daysAgo: 89,
    founder: { first: "Milagros", last: "Távara Seminario", sex: "F", specialty: "clinica" },
    psychologists: 1,
    reception: 0,
    rooms: 1,
    specialties: ["clinica"],
    sub: { status: "PRUEBA" },
  },
  {
    name: "Mindful Perú Centro de Terapia",
    type: "CENTRO",
    region: "lima",
    district: "San Isidro",
    domain: "mindfulperu.pe",
    daysAgo: 79,
    psychologists: 5,
    reception: 1,
    rooms: 3,
    adminAttends: true,
    specialties: ["act", "act", "tcc", "salud", "duelo"],
    // Activó antes de terminar la prueba para asegurar el precio anual.
    sub: { status: "ACTIVA", cycle: "ANUAL", price: 55, activateAt: 41 },
  },
  {
    name: "Centro Psicológico Sanar",
    type: "CENTRO",
    region: "trujillo",
    district: "Víctor Larco Herrera",
    domain: "sanartrujillo.pe",
    daysAgo: 71,
    psychologists: 3,
    reception: 1,
    rooms: 2,
    adminAttends: true,
    specialties: ["clinica", "tcc", "infantil"],
    sub: { status: "ACTIVA", price: 50, activateAt: 30, welcome: true },
  },
  {
    name: "Centro Psicológico Alma",
    type: "CENTRO",
    region: "lima",
    district: "Jesús María",
    domain: "centroalma.pe",
    daysAgo: 62,
    psychologists: 4,
    reception: 2,
    rooms: 3,
    specialties: ["clinica", "tcc", "pareja", "duelo"],
    sub: { status: "PRUEBA" },
  },
  {
    name: "Consultorio Ps. Nataly Rosales",
    type: "INDIVIDUAL",
    region: "lima",
    district: "Pueblo Libre",
    domain: "natalyrosales.pe",
    daysAgo: 54,
    founder: { first: "Nataly", last: "Rosales Peña", sex: "F", specialty: "tcc" },
    psychologists: 1,
    reception: 0,
    rooms: 1,
    specialties: ["tcc"],
    sub: { status: "PRUEBA" },
  },
  {
    name: "Consultorio Ps. Pierina Chumacero",
    type: "INDIVIDUAL",
    region: "piura",
    district: "Castilla",
    domain: "pierinachumacero.pe",
    daysAgo: 47,
    founder: { first: "Pierina", last: "Chumacero Vilela", sex: "F", specialty: "infantil" },
    psychologists: 1,
    reception: 0,
    rooms: 1,
    specialties: ["infantil"],
    sub: { status: "PRUEBA" },
  },
  {
    name: "Centro Psicológico Ser y Familia",
    type: "CENTRO",
    region: "lima",
    district: "Chorrillos",
    domain: "seryfamilia.pe",
    daysAgo: 41,
    psychologists: 4,
    reception: 1,
    rooms: 2,
    specialties: ["familia", "infantil", "pareja", "adolescentes"],
    sub: { status: "PRUEBA" },
  },
  {
    name: "Consultorio Ps. Hernán Puma",
    type: "INDIVIDUAL",
    region: "cusco",
    district: "San Sebastián",
    domain: "hernanpuma.pe",
    daysAgo: 34,
    founder: { first: "Hernán", last: "Puma Huillca", sex: "M", specialty: "clinica" },
    psychologists: 1,
    reception: 0,
    rooms: 1,
    specialties: ["clinica"],
    sub: { status: "PRUEBA" },
  },
  {
    name: "Aprender a Ser Centro de Psicología",
    type: "CENTRO",
    region: "lima",
    district: "Breña",
    domain: "aprenderaser.pe",
    daysAgo: 29,
    psychologists: 8,
    reception: 2,
    rooms: 5,
    specialties: ["clinica", "tcc", "infantil", "adolescentes", "pareja", "familia", "neuro", "duelo"],
    sub: { status: "PRUEBA" },
  },
  {
    name: "Centro Psicológico Florecer",
    type: "CENTRO",
    region: "huancayo",
    district: "Huancayo",
    domain: "florecerhuancayo.pe",
    daysAgo: 22,
    psychologists: 2,
    reception: 1,
    rooms: 1,
    adminAttends: true,
    specialties: ["infantil", "clinica"],
    sub: { status: "PRUEBA" },
  },
  {
    name: "Consultorio Ps. Lorena Briceño",
    type: "INDIVIDUAL",
    region: "trujillo",
    district: "Trujillo",
    domain: "lorenabriceno.pe",
    daysAgo: 16,
    founder: { first: "Lorena", last: "Briceño Asmat", sex: "F", specialty: "adolescentes" },
    psychologists: 1,
    reception: 0,
    rooms: 0,
    specialties: ["adolescentes"],
    sub: { status: "PRUEBA" },
  },
  {
    name: "Ps. Alonso Vega Psicoterapia",
    type: "INDIVIDUAL",
    region: "lima",
    district: "Santiago de Surco",
    domain: "alonsovega.pe",
    daysAgo: 11,
    founder: { first: "Alonso", last: "Vega Loayza", sex: "M", specialty: "psicoanalitica" },
    psychologists: 1,
    reception: 0,
    rooms: 1,
    specialties: ["psicoanalitica"],
    sub: { status: "PRUEBA" },
  },
  {
    name: "Consultorio Ps. Erika Valdivia",
    type: "INDIVIDUAL",
    region: "arequipa",
    district: "José Luis Bustamante y Rivero",
    domain: "erikavaldivia.pe",
    daysAgo: 5,
    founder: { first: "Erika", last: "Valdivia Cornejo", sex: "F", specialty: "animo" },
    psychologists: 1,
    reception: 0,
    rooms: 1,
    specialties: ["animo"],
    sub: { status: "PRUEBA" },
  },
];
