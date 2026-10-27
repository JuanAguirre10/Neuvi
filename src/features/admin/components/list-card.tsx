import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Tarjeta de lista corta del resumen: encabezado con ícono, contenido y enlace "ver todo". */
export function ListCard({
  icon: Icon,
  iconClassName,
  title,
  count,
  href,
  hrefLabel = "Ver todo",
  empty,
  emptyText,
  className,
  children,
}: {
  icon: LucideIcon;
  iconClassName?: string;
  title: string;
  count?: number;
  href?: string;
  hrefLabel?: string;
  empty?: boolean;
  emptyText?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className={cn("flex flex-col rounded-xl border bg-card shadow-xs", className)}>
      <header className="flex items-center justify-between gap-3 border-b px-5 py-4">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className={cn("size-4 shrink-0 text-primary", iconClassName)} aria-hidden />
          <h2 className="truncate font-semibold text-brand-navy-deep">{title}</h2>
        </div>
        {count ? (
          <span className="rounded-full bg-secondary px-2 text-xs font-semibold text-brand-navy tabular-nums">{count}</span>
        ) : null}
      </header>
      <div className="flex-1">
        {empty ? <p className="px-5 py-8 text-center text-sm text-muted-foreground">{emptyText}</p> : children}
      </div>
      {href ? (
        <div className="border-t px-3 py-2">
          <Button asChild variant="ghost" size="sm" className="w-full text-primary">
            <Link href={href}>
              {hrefLabel} <ArrowRight />
            </Link>
          </Button>
        </div>
      ) : null}
    </section>
  );
}
