import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Bloque de formulario con encabezado (icono + título + descripción). Usado en fichas largas. */
export function FormSection({
  icon: Icon,
  title,
  description,
  badge,
  tone = "default",
  className,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  /** "warning" resalta la sección (p. ej. apoderado de un menor). */
  tone?: "default" | "warning";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border bg-card shadow-xs transition-colors",
        tone === "warning" && "border-warning/40 ring-1 ring-warning/25",
        className,
      )}
    >
      <header
        className={cn(
          "flex items-start gap-3 border-b px-4 py-3.5 sm:px-5",
          tone === "warning" ? "bg-warning-soft/60" : "bg-muted/30",
        )}
      >
        <span
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
            tone === "warning" ? "bg-warning-soft text-warning" : "bg-secondary text-primary",
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-brand-navy-deep">{title}</h2>
            {badge}
          </div>
          {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
        </div>
      </header>
      <div className="grid gap-4 p-4 sm:p-5">{children}</div>
    </section>
  );
}
