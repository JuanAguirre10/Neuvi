import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Pill } from "@/components/common/status-badges";
import { requirePlatformAdmin } from "@/lib/platform-auth";
import { CAPABILITY_ROLES } from "@/lib/platform-auth/permissions";
import { formatDateTime } from "@/lib/dates";
import { PLATFORM_ROLE_LABEL, initials } from "@/lib/format";
import { PLATFORM_ROLE_DESCRIPTION, lastAccessLabel } from "@/features/admin/format";
import { listPlatformAdmins } from "@/features/admin/queries";
import { ActiveBadge, PlatformRoleBadge } from "@/features/admin/components/badges";
import { AddPlatformAdminDialog, PlatformAdminRowActions } from "@/features/admin/components/team-admin";

export const metadata: Metadata = { title: "Equipo Neuvi" };

export default async function EquipoAdminPage() {
  // Solo SUPERADMIN (gestión del equipo).
  const admin = await requirePlatformAdmin(...CAPABILITY_ROLES.team);
  const members = await listPlatformAdmins();
  const active = members.filter((m) => m.active).length;

  return (
    <>
      <PageHeader
        title="Equipo Neuvi"
        description={`${active} miembro${active === 1 ? "" : "s"} con acceso al panel. Cada rol ve solo los botones que puede usar.`}
        actions={<AddPlatformAdminDialog />}
      />

      {members.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="Sin miembros" />
      ) : (
        <Card className="gap-0 py-0">
          <div className="hidden md:block">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4 text-xs font-semibold text-muted-foreground uppercase">Miembro</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase">Rol</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase">Estado</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase">Último acceso</TableHead>
                  <TableHead className="pr-4">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id} className={m.active ? undefined : "opacity-60"}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-navy text-xs font-semibold text-white">
                          {initials(m.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 font-medium text-brand-navy-deep">
                            {m.name}
                            {m.id === admin.id ? <Pill tone="blue">Tú</Pill> : null}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <PlatformRoleBadge role={m.role} />
                    </TableCell>
                    <TableCell>
                      <ActiveBadge active={m.active} />
                    </TableCell>
                    <TableCell className="text-muted-foreground" title={m.lastLoginAt ? formatDateTime(m.lastLoginAt) : undefined}>
                      {lastAccessLabel(m.lastLoginAt)}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      {m.id === admin.id ? null : (
                        <PlatformAdminRowActions member={{ id: m.id, name: m.name, email: m.email, role: m.role, active: m.active }} />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ul className="divide-y md:hidden">
            {members.map((m) => (
              <li key={m.id} className={m.active ? "flex gap-3 px-4 py-3" : "flex gap-3 px-4 py-3 opacity-60"}>
                <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-navy text-xs font-semibold text-white">
                  {initials(m.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 font-medium text-brand-navy-deep">
                    {m.name}
                    {m.id === admin.id ? <Pill tone="blue">Tú</Pill> : null}
                    {m.active ? null : <Pill tone="gray">Inactivo</Pill>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                  <p className="mt-1 text-xs text-brand-navy">
                    {PLATFORM_ROLE_LABEL[m.role]} · Acceso: {lastAccessLabel(m.lastLoginAt)}
                  </p>
                </div>
                {m.id === admin.id ? null : (
                  <PlatformAdminRowActions member={{ id: m.id, name: m.name, email: m.email, role: m.role, active: m.active }} />
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <section className="mt-6 rounded-xl border bg-card p-4 shadow-xs sm:p-5">
        <h2 className="font-semibold text-brand-navy-deep">Roles del panel</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          {(Object.keys(PLATFORM_ROLE_DESCRIPTION) as (keyof typeof PLATFORM_ROLE_DESCRIPTION)[]).map((r) => (
            <div key={r}>
              <dt>
                <PlatformRoleBadge role={r} />
              </dt>
              <dd className="mt-1 text-muted-foreground">{PLATFORM_ROLE_DESCRIPTION[r]}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
