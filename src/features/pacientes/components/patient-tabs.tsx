import Link from "next/link";
import { CalendarDays, LayoutDashboard, Lock, NotebookPen, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { type PatientTab, patientHref } from "../utils";

const TABS: { id: PatientTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "resumen", label: "Resumen", icon: LayoutDashboard },
  { id: "historia", label: "Historia clínica", icon: NotebookPen },
  { id: "paquetes", label: "Paquetes y pagos", icon: Wallet },
  { id: "citas", label: "Citas", icon: CalendarDays },
];

/** Pestañas de la ficha controladas por ?tab= (cada pestaña se renderiza y consulta en el servidor). */
export function PatientTabs({
  patientId,
  active,
  clinicalLocked,
}: {
  patientId: string;
  active: PatientTab;
  clinicalLocked: boolean;
}) {
  return (
    <nav aria-label="Secciones de la ficha" className="-mx-4 mt-5 mb-5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex min-w-max gap-1 border-b">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = id === active;
          return (
            <Link
              key={id}
              href={patientHref(patientId, id === "resumen" ? {} : { tab: id })}
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
              {id === "historia" && clinicalLocked ? (
                <Lock className="size-3.5 text-muted-foreground" aria-label="Acceso restringido" />
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
