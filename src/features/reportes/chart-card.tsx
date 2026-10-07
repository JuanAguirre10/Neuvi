import { BarChart3, ChevronDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Tarjeta de gráfico con su "vista de tabla" equivalente (accesible, no depende del color ni del hover).
 * `table` ya viene formateada desde el servidor.
 */
export function ChartCard({
  title,
  description,
  empty,
  emptyText = "Aún no hay datos para este periodo.",
  table,
  className,
  children,
}: {
  title: string;
  description?: string;
  empty?: boolean;
  emptyText?: string;
  table?: { columns: string[]; rows: (string | number)[][] };
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("gap-3", className)}>
      <CardHeader>
        <CardTitle className="font-semibold text-brand-navy-deep">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="grid gap-3">
        {empty ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center">
            <BarChart3 className="size-6 text-muted-foreground/60" />
            <p className="max-w-56 text-sm text-muted-foreground">{emptyText}</p>
          </div>
        ) : (
          <figure aria-label={title}>{children}</figure>
        )}

        {!empty && table ? (
          <details className="group rounded-lg border bg-muted/30 text-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-xs font-medium text-brand-navy select-none [&::-webkit-details-marker]:hidden">
              Ver datos en tabla
              <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="overflow-x-auto border-t">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    {table.columns.map((c, i) => (
                      <th key={c} scope="col" className={cn("px-3 py-2 font-medium", i > 0 && "text-right")}>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, r) => (
                    <tr key={r} className="border-t">
                      {row.map((cell, i) =>
                        i === 0 ? (
                          <th key={i} scope="row" className="px-3 py-1.5 text-left font-normal text-brand-navy-deep">
                            {cell}
                          </th>
                        ) : (
                          <td key={i} className="px-3 py-1.5 text-right text-brand-navy-deep tabular-nums">
                            {cell}
                          </td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        ) : null}
      </CardContent>
    </Card>
  );
}
