import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReportMonth } from "./month";

/** Selector de mes: anterior / siguiente / volver al mes actual. */
export function MonthPicker({ month }: { month: ReportMonth }) {
  return (
    <div className="flex items-center gap-1.5">
      <Button asChild variant="outline" size="icon" aria-label="Mes anterior">
        <Link href={`/app/reportes?mes=${month.prevKey}`}>
          <ChevronLeft />
        </Link>
      </Button>
      <span className="min-w-36 rounded-lg border bg-card px-3 py-1 text-center text-sm font-semibold text-brand-navy-deep first-letter:uppercase">
        {month.label}
      </span>
      {month.isCurrent ? (
        <Button variant="outline" size="icon" disabled aria-label="Mes siguiente">
          <ChevronRight />
        </Button>
      ) : (
        <Button asChild variant="outline" size="icon" aria-label="Mes siguiente">
          <Link href={`/app/reportes?mes=${month.nextKey}`}>
            <ChevronRight />
          </Link>
        </Button>
      )}
      {!month.isCurrent ? (
        <Button asChild variant="ghost">
          <Link href="/app/reportes">Mes actual</Link>
        </Button>
      ) : null}
    </div>
  );
}
