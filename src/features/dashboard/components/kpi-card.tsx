import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "blue" | "teal" | "amber" | "navy";

const TONE: Record<Tone, string> = {
  blue: "bg-info-soft text-primary",
  teal: "bg-success-soft text-success",
  amber: "bg-warning-soft text-warning",
  navy: "bg-secondary text-brand-navy",
};

/** Tarjeta de indicador del inicio. Si tiene `href`, toda la tarjeta es un enlace. */
export function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  href,
  tone = "blue",
  highlight,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  href?: string;
  tone?: Tone;
  /** Resalta la tarjeta cuando requiere atención (p. ej. renovaciones pendientes). */
  highlight?: boolean;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", TONE[tone])}>
          <Icon className="size-[18px]" />
        </span>
      </div>
      <p className="mt-1 text-2xl font-semibold tracking-tight break-words text-brand-navy-deep tabular-nums sm:text-3xl">{value}</p>
      {hint ? (
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          {hint}
          {href ? (
            <ArrowRight className="size-3 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
          ) : null}
        </p>
      ) : null}
    </>
  );

  const className = cn(
    "group block rounded-xl border bg-card p-4 shadow-xs transition-colors sm:p-5",
    href && "hover:border-brand-sky",
    highlight && "border-warning/40",
  );

  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
