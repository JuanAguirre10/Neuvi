import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, Check, Minus, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Pill } from "@/components/common/status-badges";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LABEL, initials } from "@/lib/format";
import { AddMemberDialog } from "@/features/equipo/member-dialog";
import { MemberRowActions } from "@/features/equipo/member-row-actions";

export const metadata: Metadata = { title: "Equipo" };

export default async function EquipoPage() {
  const user = await requireRole("ADMIN");

  if (user.organization.type !== "CENTRO") {
    return (
      <>
        <PageHeader title="Equipo" description="Usuarios, roles y permisos de tu centro." />
        <EmptyState
          icon={Building2}
          title="La gestión de equipo es parte del Plan Centro Psicológico"
          description="Agrega psicólogos y recepción, asigna roles y protege la historia clínica por profesional. Tu cuenta actual es de psicólogo independiente."
          action={
            <Button asChild>
              <Link href="/app/configuracion/plan">
                Ver planes <ArrowRight />
              </Link>
            </Button>
          }
        />
      </>
    );
  }

  const members = await db.user.findMany({
    where: { organizationId: user.organizationId },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isProfessional: true,
      specialty: true,
      licenseNumber: true,
      phone: true,
      calendarColor: true,
      active: true,
    },
  });
  const activeCount = members.filter((m) => m.active).length;
  const professionals = members.filter((m) => m.active && m.isProfessional).length;

  return (
    <>
      <PageHeader
        title="Equipo"
        description={`${activeCount} usuario${activeCount === 1 ? "" : "s"} activo${activeCount === 1 ? "" : "s"} · ${professionals} profesional${professionals === 1 ? "" : "es"} que atiende${professionals === 1 ? "" : "n"} pacientes`}
        actions={<AddMemberDialog />}
      />

      {members.length === 0 ? (
        <EmptyState icon={UsersRound} title="Aún no hay miembros" description="Agrega a los psicólogos y a recepción." />
      ) : (
        <Card className="gap-0 py-0">
          {/* Escritorio */}
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4 text-muted-foreground">Nombre</TableHead>
                  <TableHead className="text-muted-foreground">Rol</TableHead>
                  <TableHead className="text-center text-muted-foreground">Atiende pacientes</TableHead>
                  <TableHead className="text-muted-foreground">Especialidad</TableHead>
                  <TableHead className="text-muted-foreground">C.Ps.P.</TableHead>
                  <TableHead className="text-muted-foreground">Agenda</TableHead>
                  <TableHead className="text-muted-foreground">Estado</TableHead>
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
                        <span
                          aria-hidden
                          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-primary"
                        >
                          {initials(m.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 font-medium text-brand-navy-deep">
                            {m.name}
                            {m.id === user.id ? <Pill tone="blue">Tú</Pill> : null}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-brand-navy">{ROLE_LABEL[m.role]}</TableCell>
                    <TableCell className="text-center">
                      {m.isProfessional ? (
                        <Check className="mx-auto size-4 text-success" aria-label="Sí" />
                      ) : (
                        <Minus className="mx-auto size-4 text-muted-foreground" aria-label="No" />
                      )}
                    </TableCell>
                    <TableCell className="max-w-44 truncate text-muted-foreground">{m.specialty ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">{m.licenseNumber ?? "—"}</TableCell>
                    <TableCell>
                      {m.isProfessional ? (
                        <span
                          className="inline-block size-4 rounded-full ring-2 ring-white shadow-sm"
                          style={{ backgroundColor: m.calendarColor }}
                          title={m.calendarColor}
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {m.active ? <Pill tone="teal">Activo</Pill> : <Pill tone="gray">Inactivo</Pill>}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <MemberRowActions member={m} active={m.active} isSelf={m.id === user.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Móvil / tablet */}
          <ul className="divide-y lg:hidden">
            {members.map((m) => (
              <li key={m.id} className={m.active ? "flex gap-3 px-4 py-3" : "flex gap-3 px-4 py-3 opacity-60"}>
                <span
                  aria-hidden
                  className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-primary"
                >
                  {initials(m.name)}
                  {m.isProfessional ? (
                    <span
                      className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-2 ring-card"
                      style={{ backgroundColor: m.calendarColor }}
                    />
                  ) : null}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 font-medium text-brand-navy-deep">
                    {m.name}
                    {m.id === user.id ? <Pill tone="blue">Tú</Pill> : null}
                    {m.active ? null : <Pill tone="gray">Inactivo</Pill>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                  <p className="mt-1 text-xs text-brand-navy">
                    {ROLE_LABEL[m.role]}
                    {m.isProfessional ? " · Atiende pacientes" : ""}
                    {m.specialty ? ` · ${m.specialty}` : ""}
                    {m.licenseNumber ? ` · C.Ps.P. ${m.licenseNumber}` : ""}
                  </p>
                </div>
                <MemberRowActions member={m} active={m.active} isSelf={m.id === user.id} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Solo el psicólogo tratante accede a la historia clínica de sus pacientes, sin importar su rol. Recepción gestiona
        agenda, pacientes, paquetes y pagos.
      </p>
    </>
  );
}
