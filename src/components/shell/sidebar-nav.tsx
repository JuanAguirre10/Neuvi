"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  House,
  RefreshCcw,
  Settings,
  UserRoundCog,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavIcon, NavItem } from "./nav";

const ICONS: Record<NavIcon, LucideIcon> = {
  home: House,
  calendar: CalendarDays,
  users: Users,
  refresh: RefreshCcw,
  wallet: Wallet,
  chart: BarChart3,
  team: UserRoundCog,
  settings: Settings,
};

export function SidebarNav({
  items,
  badges,
  onNavigate,
}: {
  items: NavItem[];
  /** Contadores opcionales por href (p. ej. renovaciones pendientes). */
  badges?: Record<string, number>;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav className="grid gap-0.5">
      {items.map((item) => {
        const active = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
        const Icon = ICONS[item.icon];
        const count = badges?.[item.href];
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-muted hover:text-sidebar-foreground",
            )}
          >
            <Icon
              className={cn(
                "size-[18px] shrink-0",
                active ? "text-primary" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground",
              )}
            />
            <span className="flex-1 truncate">{item.label}</span>
            {count ? (
              <span className="rounded-full bg-warning-soft px-1.5 text-[11px] font-semibold text-warning">
                {count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
