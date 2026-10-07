import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Tarjeta de panel con título e icono, usada en las pestañas de la ficha. */
export function Panel({
  title,
  icon: Icon,
  action,
  className,
  bodyClassName,
  children,
}: {
  title: React.ReactNode;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-xl border bg-card shadow-xs", className)}>
      <header className="flex items-center gap-2 border-b px-4 py-3">
        {Icon ? <Icon className="size-4 text-primary" /> : null}
        <h2 className="flex-1 text-sm font-semibold text-brand-navy-deep">{title}</h2>
        {action}
      </header>
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

/** Par etiqueta / valor. Muestra "—" si no hay valor. */
export function InfoItem({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  const empty = value === null || value === undefined || value === "";
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("mt-0.5 text-sm break-words", empty ? "text-muted-foreground/70" : "text-brand-navy-deep")}>
        {empty ? "—" : value}
      </dd>
    </div>
  );
}
