import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Paginación simple "Anterior / Siguiente" basada en el parámetro ?page=. */
export function SimplePagination({
  page,
  pageCount,
  total,
  pageSize,
  basePath,
  params,
  noun = "resultados",
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  basePath: string;
  params: Record<string, string | undefined>;
  noun?: string;
}) {
  if (total === 0) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return `${basePath}${qs ? `?${qs}` : ""}`;
  };
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="mt-4 flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
      <p>
        Mostrando <span className="font-medium text-foreground">{from}</span>–
        <span className="font-medium text-foreground">{to}</span> de{" "}
        <span className="font-medium text-foreground">{total}</span> {noun}
      </p>
      {pageCount > 1 ? (
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={href(page - 1)} scroll={false}>
                <ChevronLeft /> Anterior
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              <ChevronLeft /> Anterior
            </Button>
          )}
          <span className="px-1 text-xs">
            Página {page} de {pageCount}
          </span>
          {page < pageCount ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={href(page + 1)} scroll={false}>
                Siguiente <ChevronRight />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Siguiente <ChevronRight />
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
