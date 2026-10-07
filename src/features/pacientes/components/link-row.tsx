"use client";

import { useRouter } from "next/navigation";
import { TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * Fila de tabla clicable que navega a `href`. Dentro debe haber un <Link> real (accesible con teclado);
 * los clics sobre enlaces o botones internos no se interceptan.
 */
export function LinkRow({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <TableRow
      className={cn("cursor-pointer", className)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a,button")) return;
        router.push(href);
      }}
    >
      {children}
    </TableRow>
  );
}
