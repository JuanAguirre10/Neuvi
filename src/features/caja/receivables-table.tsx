import Link from "next/link";
import { HandCoins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PackageStatusBadge } from "@/components/common/status-badges";
import { formatPEN } from "@/lib/format";
import type { Receivable } from "./queries";

function payHref(r: Receivable) {
  return `/app/pacientes/${r.patientId}?tab=paquetes&pagar=${r.packageId}`;
}

function PayButton({ r, className }: { r: Receivable; className?: string }) {
  return (
    <Button asChild variant="outline" size="sm" className={className}>
      <Link href={payHref(r)}>
        <HandCoins /> Registrar pago
      </Link>
    </Button>
  );
}

export function ReceivablesTable({ items }: { items: Receivable[] }) {
  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4 text-muted-foreground">Paciente</TableHead>
              <TableHead className="text-muted-foreground">Paquete</TableHead>
              <TableHead className="text-right text-muted-foreground">Precio</TableHead>
              <TableHead className="text-right text-muted-foreground">Pagado</TableHead>
              <TableHead className="text-right text-muted-foreground">Saldo</TableHead>
              <TableHead className="pr-4 text-right text-muted-foreground">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((r) => (
              <TableRow key={r.packageId}>
                <TableCell className="pl-4">
                  <Link href={`/app/pacientes/${r.patientId}?tab=paquetes`} className="font-medium text-primary hover:underline">
                    {r.patientName}
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="max-w-48 truncate text-brand-navy">{r.packageName}</span>
                    <PackageStatusBadge status={r.status} />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {r.usedSessions} de {r.totalSessions} sesiones usadas
                  </span>
                </TableCell>
                <TableCell className="text-right text-muted-foreground tabular-nums">{formatPEN(r.priceCents)}</TableCell>
                <TableCell className="text-right text-muted-foreground tabular-nums">{formatPEN(r.paidCents)}</TableCell>
                <TableCell className="text-right font-semibold text-warning tabular-nums">{formatPEN(r.balanceCents)}</TableCell>
                <TableCell className="pr-4 text-right">
                  <PayButton r={r} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="divide-y md:hidden">
        {items.map((r) => (
          <li key={r.packageId} className="grid gap-2 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/app/pacientes/${r.patientId}?tab=paquetes`} className="block truncate font-medium text-primary">
                  {r.patientName}
                </Link>
                <p className="truncate text-sm text-brand-navy">{r.packageName}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-muted-foreground">Saldo</p>
                <p className="font-semibold text-warning tabular-nums">{formatPEN(r.balanceCents)}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Precio {formatPEN(r.priceCents)} · Pagado {formatPEN(r.paidCents)} · {r.usedSessions} de {r.totalSessions} sesiones
            </p>
            <PayButton r={r} className="w-full" />
          </li>
        ))}
      </ul>
    </>
  );
}
