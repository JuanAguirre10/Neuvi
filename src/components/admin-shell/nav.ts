import type { PlatformRole } from "@prisma/client";
import { can, type PlatformCapability } from "@/lib/platform-auth/permissions";

export type AdminNavIcon = "home" | "accounts" | "billing" | "activity" | "plans" | "team";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: AdminNavIcon;
  /** Si se indica, solo se muestra a los roles con esa capacidad. */
  capability?: PlatformCapability;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin", label: "Resumen", icon: "home" },
  { href: "/admin/cuentas", label: "Cuentas", icon: "accounts" },
  { href: "/admin/facturacion", label: "Facturación", icon: "billing" },
  { href: "/admin/actividad", label: "Actividad", icon: "activity" },
  { href: "/admin/planes", label: "Planes", icon: "plans" },
  { href: "/admin/equipo", label: "Equipo Neuvi", icon: "team", capability: "team" },
];

export function adminNavFor(role: PlatformRole): AdminNavItem[] {
  return ADMIN_NAV_ITEMS.filter((i) => !i.capability || can(role, i.capability));
}
