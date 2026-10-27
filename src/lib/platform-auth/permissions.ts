// Permisos del equipo de Neuvi en /admin. Sin dependencias de servidor: los componentes cliente
// lo usan para ocultar botones; las páginas y server actions lo usan para autorizar de verdad.
//
// | Acción                                          | Superadmin | Finanzas | Soporte |
// |-------------------------------------------------|------------|----------|---------|
// | Consultar cuentas, facturación, actividad       | sí         | sí       | sí      |
// | Extender prueba, notas internas                 | sí         | sí       | sí      |
// | Activar / cambiar plan, precio y ciclo          | sí         | sí       | no      |
// | Suspender y reactivar                           | sí         | sí       | no      |
// | Emitir y anular facturas, registrar cobros      | sí         | sí       | no      |
// | Cancelar cuenta                                 | sí         | no       | no      |
// | Catálogo de planes, equipo de Neuvi          | sí         | no       | no      |
import type { PlatformRole } from "@prisma/client";

export type PlatformCapability =
  | "trial" // extender la prueba gratuita
  | "notes" // notas internas de la cuenta
  | "subscription" // activar o cambiar plan, precio y ciclo
  | "suspension" // suspender y reactivar
  | "cancel" // cancelar la cuenta
  | "billing" // emitir y anular facturas, registrar cobros
  | "plans" // editar el catálogo de planes
  | "team"; // gestionar el equipo de Neuvi

export const CAPABILITY_ROLES: Record<PlatformCapability, PlatformRole[]> = {
  trial: ["SUPERADMIN", "FINANZAS", "SOPORTE"],
  notes: ["SUPERADMIN", "FINANZAS", "SOPORTE"],
  subscription: ["SUPERADMIN", "FINANZAS"],
  suspension: ["SUPERADMIN", "FINANZAS"],
  cancel: ["SUPERADMIN"],
  billing: ["SUPERADMIN", "FINANZAS"],
  plans: ["SUPERADMIN"],
  team: ["SUPERADMIN"],
};

export function can(role: PlatformRole, capability: PlatformCapability): boolean {
  return CAPABILITY_ROLES[capability].includes(role);
}

/** Todas las capacidades del rol (se pasa a los componentes cliente como objeto plano). */
export function capabilitiesOf(role: PlatformRole): Record<PlatformCapability, boolean> {
  const out = {} as Record<PlatformCapability, boolean>;
  for (const cap of Object.keys(CAPABILITY_ROLES) as PlatformCapability[]) out[cap] = can(role, cap);
  return out;
}

export type Capabilities = ReturnType<typeof capabilitiesOf>;
