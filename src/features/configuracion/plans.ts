// Planes de Neuvi. Los precios aún no están definidos (ver docs/PLANIFICACION.md):
// la UI muestra "Precio por definir" y la activación se coordina por WhatsApp.
// Se usa en la landing (#planes) y en /app/configuracion/plan.

export const PRICE_PENDING_LABEL = "Precio por definir";
export const TRIAL_DAYS = 7;

export type PlanKey = "INDIVIDUAL" | "CENTRO";

export type PlanInfo = {
  key: PlanKey;
  name: string;
  audience: string;
  description: string;
  /** Nota de cobro que acompaña al precio. */
  billingNote: string;
  features: string[];
  /** Destino de registro desde la landing. */
  signupHref: string;
};

export const PLANS: PlanInfo[] = [
  {
    key: "INDIVIDUAL",
    name: "Plan Individual",
    audience: "Psicólogo independiente",
    description: "Para quien atiende por su cuenta y quiere ordenar su consulta desde la computadora o el celular.",
    billingNote: "Para un profesional",
    features: [
      "Agenda personal con validación de cruces",
      "Pacientes, historia clínica y notas de evolución",
      "Paquetes de sesiones y registro de pagos",
      "Aviso automático de renovación",
      "Recordatorios por WhatsApp con plantillas editables",
      "Reportes básicos de sesiones e ingresos",
    ],
    signupHref: "/registro",
  },
  {
    key: "CENTRO",
    name: "Plan Centro Psicológico",
    audience: "Centros con varios profesionales",
    description: "Para centros que coordinan varios psicólogos, consultorios y recepción en un mismo lugar.",
    billingNote: "Se cobra por psicólogo activo",
    features: [
      "Todo lo del Plan Individual",
      "Varios psicólogos, consultorios y recepción",
      "Roles y permisos: administrador, psicólogo y recepción",
      "Agenda sin cruces por profesional y por consultorio",
      "Caja consolidada con pagos por método",
      "Reportes de sesiones, inasistencias, ingresos y pacientes",
    ],
    signupHref: "/registro?tipo=centro",
  },
];

export const TRIAL_FEATURES = [
  "Acceso completo durante 7 días",
  "Sin tarjeta de crédito",
  "Tus datos se conservan al activar tu plan",
  "Acompañamiento por WhatsApp",
];
