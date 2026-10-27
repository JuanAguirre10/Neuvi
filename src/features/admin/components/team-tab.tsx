import { UsersRound } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/common/empty-state";
import { Pill } from "@/components/common/status-badges";
import { formatDateTime } from "@/lib/dates";
import { ROLE_LABEL, initials } from "@/lib/format";
import { getAccountTeam } from "../queries";
import { lastAccessLabel } from "../format";
import { ActiveBadge } from "./badges";

/** Personal del consultorio o centro (usuarios, no pacientes). */
export async function TeamTab({ orgId }: { orgId: string }) {
  const members = await getAccountTeam(orgId);
  if (members.length === 0) {
    return <EmptyState icon={UsersRound} title="Sin usuarios" description="La cuenta no tiene usuarios registrados." />;
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="hidden md:block">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4 text-xs font-semibold text-muted-foreground uppercase">Usuario</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase">Rol</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase">Estado</TableHead>
              <TableHead className="pr-4 text-xs font-semibold text-muted-foreground uppercase">Último acceso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.id} className={m.active ? undefined : "opacity-60"}>
                <TableCell className="pl-4">
                  <div className="flex items-center gap-3">
                    <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-primary">
                      {initials(m.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-brand-navy-deep">{m.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-brand-navy">{ROLE_LABEL[m.role]}</span>
                  {m.isProfessional ? <Pill tone="blue" className="ml-2">Atiende</Pill> : null}
                </TableCell>
                <TableCell>
                  <ActiveBadge active={m.active} />
                </TableCell>
                <TableCell className="pr-4 text-muted-foreground" title={m.lastLoginAt ? formatDateTime(m.lastLoginAt) : undefined}>
                  {lastAccessLabel(m.lastLoginAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className="divide-y md:hidden">
        {members.map((m) => (
          <li key={m.id} className={m.active ? "flex gap-3 px-4 py-3" : "flex gap-3 px-4 py-3 opacity-60"}>
            <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-primary">
              {initials(m.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-1.5 font-medium text-brand-navy-deep">
                {m.name}
                {m.active ? null : <Pill tone="gray">Inactivo</Pill>}
              </p>
              <p className="truncate text-xs text-muted-foreground">{m.email}</p>
              <p className="mt-1 text-xs text-brand-navy">
                {ROLE_LABEL[m.role]}
                {m.isProfessional ? " · Atiende pacientes" : ""} · Acceso: {lastAccessLabel(m.lastLoginAt)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
