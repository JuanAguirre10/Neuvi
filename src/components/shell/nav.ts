import type { OrgType, Role } from "@prisma/client";

export type NavIcon =
  | "home"
  | "calendar"
  | "users"
  | "refresh"
  | "wallet"
  | "chart"
  | "team"
  | "settings";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  roles: Role[];
  /** Solo para cierto tipo de organización (p. ej. Equipo solo en centros). */
  orgTypes?: OrgType[];
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/app", label: "Inicio", icon: "home", roles: ["ADMIN", "RECEPCION", "PSICOLOGO"] },
  { href: "/app/agenda", label: "Agenda", icon: "calendar", roles: ["ADMIN", "RECEPCION", "PSICOLOGO"] },
  { href: "/app/pacientes", label: "Pacientes", icon: "users", roles: ["ADMIN", "RECEPCION", "PSICOLOGO"] },
  { href: "/app/renovaciones", label: "Renovaciones", icon: "refresh", roles: ["ADMIN", "RECEPCION", "PSICOLOGO"] },
  { href: "/app/pagos", label: "Caja y pagos", icon: "wallet", roles: ["ADMIN", "RECEPCION"] },
  { href: "/app/reportes", label: "Reportes", icon: "chart", roles: ["ADMIN"] },
  { href: "/app/equipo", label: "Equipo", icon: "team", roles: ["ADMIN"], orgTypes: ["CENTRO"] },
  { href: "/app/configuracion", label: "Configuración", icon: "settings", roles: ["ADMIN"] },
];

export function navFor(role: Role, orgType: OrgType): NavItem[] {
  return NAV_ITEMS.filter((i) => i.roles.includes(role) && (!i.orgTypes || i.orgTypes.includes(orgType)));
}
