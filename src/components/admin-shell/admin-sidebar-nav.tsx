"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, History, Layers, LayoutDashboard, ReceiptText, ShieldCheck, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminNavIcon, AdminNavItem } from "./nav";

const ICONS: Record<AdminNavIcon, LucideIcon> = {
  home: LayoutDashboard,
  accounts: Building2,
  billing: ReceiptText,
  activity: History,
  plans: Layers,
  team: ShieldCheck,
};

export function AdminSidebarNav({ items, onNavigate }: { items: AdminNavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="grid gap-0.5">
      {items.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        const Icon = ICONS[item.icon];
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
          </Link>
        );
      })}
    </nav>
  );
}
