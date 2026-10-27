import Link from "next/link";
import { History, LayoutDashboard, NotebookText, ReceiptText, UsersRound, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const ACCOUNT_TABS = ["resumen", "equipo", "facturacion", "historial", "notas"] as const;
export type AccountTab = (typeof ACCOUNT_TABS)[number];

const TABS: { id: AccountTab; label: string; icon: LucideIcon }[] = [
  { id: "resumen", label: "Resumen", icon: LayoutDashboard },
  { id: "equipo", label: "Equipo", icon: UsersRound },
  { id: "facturacion", label: "Facturación", icon: ReceiptText },
  { id: "historial", label: "Historial", icon: History },
  { id: "notas", label: "Notas", icon: NotebookText },
];

export function parseAccountTab(value: string | undefined): AccountTab {
  return (ACCOUNT_TABS as readonly string[]).includes(value ?? "") ? (value as AccountTab) : "resumen";
}

/** Pestañas de la cuenta controladas por ?tab= (cada una consulta solo lo suyo en el servidor). */
export function AccountTabs({ orgId, active, counts }: { orgId: string; active: AccountTab; counts?: Partial<Record<AccountTab, number>> }) {
  return (
    <nav aria-label="Secciones de la cuenta" className="-mx-4 mt-5 mb-5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex min-w-max gap-1 border-b">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = id === active;
          const count = counts?.[id];
          return (
            <Link
              key={id}
              href={id === "resumen" ? `/admin/cuentas/${orgId}` : `/admin/cuentas/${orgId}?tab=${id}`}
              scroll={false}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative -mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-brand-navy-deep",
              )}
            >
              <Icon className="size-4" />
              {label}
              {count ? <span className="rounded-full bg-secondary px-1.5 text-[11px] font-semibold text-brand-navy">{count}</span> : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
