"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building, CreditCard, DoorOpen, MessageSquareText, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = { href: string; label: string; icon: LucideIcon; adminOnly?: boolean };

const TABS: Tab[] = [
  { href: "/app/configuracion", label: "General", icon: Building, adminOnly: true },
  { href: "/app/configuracion/consultorios", label: "Consultorios", icon: DoorOpen, adminOnly: true },
  { href: "/app/configuracion/plantillas", label: "Plantillas de WhatsApp", icon: MessageSquareText, adminOnly: true },
  { href: "/app/configuracion/plan", label: "Plan", icon: CreditCard },
];

export function SettingsTabs({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const tabs = TABS.filter((t) => isAdmin || !t.adminOnly);
  if (tabs.length < 2) return null;

  return (
    <nav aria-label="Secciones de configuración" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1 border-b">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = href === "/app/configuracion" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                  "after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full",
                  active
                    ? "text-primary after:bg-primary"
                    : "text-muted-foreground hover:text-brand-navy-deep after:bg-transparent",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
