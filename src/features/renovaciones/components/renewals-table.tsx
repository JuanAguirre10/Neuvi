import Link from "next/link";
import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pill, SessionsMeter } from "@/components/common/status-badges";
import { formatDate } from "@/lib/dates";
import { formatPEN } from "@/lib/format";
import { patientHref } from "@/features/pacientes/utils";
import { PatientAvatar } from "@/features/pacientes/components/patient-avatar";
import type { RenewalRow } from "../queries";
import { RenewalNoticeButton } from "./renewal-notice-button";

export type RenewalTableRow = RenewalRow & { whatsappHref: string | null };

function NoticePill({ date }: { date: Date | null }) {
  return date ? <Pill tone="teal">Enviado {formatDate(date)}</Pill> : <Pill tone="amber">Pendiente</Pill>;
}

function Actions({ row, canRenew }: { row: RenewalTableRow; canRenew: boolean }) {
  return (
    <div className="flex flex-wrap gap-2 md:justify-end">
      <RenewalNoticeButton
        packageId={row.packageId}
        href={row.whatsappHref}
        label="Enviar aviso"
        alreadySent={Boolean(row.notifiedAt)}
      />
      {canRenew ? (
        <Button size="sm" asChild>
          <Link href={patientHref(row.patientId, { tab: "paquetes", renovar: "1" })}>
            <RefreshCcw /> Renovar
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

/** Tabla (escritorio) + tarjetas (móvil) del panel de renovaciones. */
export function RenewalsTable({
  rows,
  mode,
  canRenew,
  showProfessional,
}: {
  rows: RenewalTableRow[];
  /** "active" = por renovar; "completed" = terminados sin renovar. */
  mode: "active" | "completed";
  canRenew: boolean;
  showProfessional: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="hidden md:block">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4 text-xs text-muted-foreground">Paciente</TableHead>
              {showProfessional ? (
                <TableHead className="hidden text-xs text-muted-foreground lg:table-cell">Psicólogo</TableHead>
              ) : null}
              <TableHead className="text-xs text-muted-foreground">Paquete</TableHead>
              <TableHead className="text-xs text-muted-foreground">
                {mode === "active" ? "Restantes" : "Saldo"}
              </TableHead>
              <TableHead className="hidden text-xs text-muted-foreground xl:table-cell">
                {mode === "active" ? "Última sesión" : "Última sesión (fin)"}
              </TableHead>
              <TableHead className="text-xs text-muted-foreground">Aviso</TableHead>
              <TableHead className="pr-4 text-right text-xs text-muted-foreground">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.packageId}>
                <TableCell className="py-3 pl-4">
                  <div className="flex items-center gap-3">
                    <PatientAvatar name={r.patientName} className="size-8" />
                    <Link
                      href={patientHref(r.patientId)}
                      className="max-w-52 truncate font-medium text-brand-navy-deep hover:text-primary"
                    >
                      {r.patientName}
                    </Link>
                  </div>
                </TableCell>
                {showProfessional ? (
                  <TableCell className="hidden lg:table-cell">
                    {r.professionalName ?? <span className="text-xs text-muted-foreground italic">Sin asignar</span>}
                  </TableCell>
                ) : null}
                <TableCell>
                  <div className="grid w-40 gap-1">
                    <span className="truncate text-xs font-medium text-brand-navy">{r.packageName}</span>
                    <SessionsMeter used={r.usedSessions} total={r.totalSessions} />
                  </div>
                </TableCell>
                <TableCell>
                  {mode === "active" ? (
                    <div className="leading-tight">
                      <p className="font-semibold text-warning">
                        {r.remainingSessions} {r.remainingSessions === 1 ? "sesión" : "sesiones"}
                      </p>
                      {r.scheduledSessions > 0 ? (
                        <p className="text-xs text-muted-foreground">{r.scheduledSessions} agendada(s)</p>
                      ) : null}
                    </div>
                  ) : r.balanceCents > 0 ? (
                    <span className="font-medium text-warning">{formatPEN(r.balanceCents)}</span>
                  ) : (
                    <span className="text-xs text-success">Pagado</span>
                  )}
                </TableCell>
                <TableCell className="hidden text-muted-foreground xl:table-cell">
                  {r.lastSession ? formatDate(r.lastSession) : "—"}
                </TableCell>
                <TableCell>
                  <NoticePill date={r.notifiedAt} />
                </TableCell>
                <TableCell className="pr-4">
                  <Actions row={r} canRenew={canRenew} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="divide-y md:hidden">
        {rows.map((r) => (
          <li key={r.packageId} className="grid gap-3 p-4">
            <div className="flex items-start gap-3">
              <PatientAvatar name={r.patientName} />
              <div className="min-w-0 flex-1">
                <Link href={patientHref(r.patientId)} className="block truncate font-medium text-brand-navy-deep">
                  {r.patientName}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {r.packageName}
                  {showProfessional && r.professionalName ? ` · ${r.professionalName}` : ""}
                </p>
              </div>
              <NoticePill date={r.notifiedAt} />
            </div>
            <SessionsMeter used={r.usedSessions} total={r.totalSessions} />
            <p className="text-xs text-muted-foreground">
              Última sesión: {r.lastSession ? formatDate(r.lastSession) : "—"}
              {mode === "completed" && r.balanceCents > 0 ? ` · Saldo ${formatPEN(r.balanceCents)}` : ""}
            </p>
            <Actions row={r} canRenew={canRenew} />
          </li>
        ))}
      </ul>
    </div>
  );
}
