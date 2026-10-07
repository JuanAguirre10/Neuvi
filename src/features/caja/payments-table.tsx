import Link from "next/link";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatTime } from "@/lib/dates";
import { PAYMENT_METHOD_LABEL, formatPEN, fullName } from "@/lib/format";
import { METHOD_ICON } from "./summary";
import type { CashPaymentRow } from "./queries";

function patientHref(patientId: string) {
  return `/app/pacientes/${patientId}?tab=paquetes`;
}

function MethodPill({ method }: { method: CashPaymentRow["method"] }) {
  const Icon = METHOD_ICON[method];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
      <Icon className="size-3" />
      {PAYMENT_METHOD_LABEL[method]}
    </span>
  );
}

export function PaymentsTable({ payments, totalCents }: { payments: CashPaymentRow[]; totalCents: number }) {
  return (
    <>
      {/* Escritorio */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4 text-muted-foreground">Fecha</TableHead>
              <TableHead className="text-muted-foreground">Paciente</TableHead>
              <TableHead className="text-muted-foreground">Paquete</TableHead>
              <TableHead className="text-muted-foreground">Método</TableHead>
              <TableHead className="text-right text-muted-foreground">Monto</TableHead>
              <TableHead className="text-muted-foreground">N.º operación</TableHead>
              <TableHead className="pr-4 text-muted-foreground">Registrado por</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="pl-4">
                  <span className="block text-brand-navy-deep">{formatDate(p.paidAt)}</span>
                  <span className="block text-xs text-muted-foreground tabular-nums">{formatTime(p.paidAt)}</span>
                </TableCell>
                <TableCell>
                  <Link href={patientHref(p.patient.id)} className="font-medium text-primary hover:underline">
                    {fullName(p.patient)}
                  </Link>
                </TableCell>
                <TableCell className="max-w-48 truncate text-brand-navy">{p.package.name}</TableCell>
                <TableCell>
                  <MethodPill method={p.method} />
                </TableCell>
                <TableCell className="text-right font-semibold text-brand-navy-deep tabular-nums">
                  {formatPEN(p.amountCents)}
                </TableCell>
                <TableCell className="text-muted-foreground tabular-nums">{p.reference ?? "—"}</TableCell>
                <TableCell className="pr-4 text-muted-foreground">{p.registeredBy.name}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={4} className="pl-4 text-brand-navy">
                Total del periodo
              </TableCell>
              <TableCell className="text-right font-semibold text-brand-navy-deep tabular-nums">
                {formatPEN(totalCents)}
              </TableCell>
              <TableCell colSpan={2} />
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {/* Móvil */}
      <ul className="divide-y md:hidden">
        {payments.map((p) => (
          <li key={p.id} className="grid gap-1.5 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <Link href={patientHref(p.patient.id)} className="min-w-0 truncate font-medium text-primary">
                {fullName(p.patient)}
              </Link>
              <span className="shrink-0 font-semibold text-brand-navy-deep tabular-nums">{formatPEN(p.amountCents)}</span>
            </div>
            <p className="truncate text-sm text-brand-navy">{p.package.name}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <MethodPill method={p.method} />
              <span className="tabular-nums">
                {formatDate(p.paidAt)} · {formatTime(p.paidAt)}
              </span>
              {p.reference ? <span>Op. {p.reference}</span> : null}
              <span>Por {p.registeredBy.name}</span>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
