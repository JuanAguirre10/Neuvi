import type { Metadata } from "next";
import Link from "next/link";
import type { PatientStatus } from "@prisma/client";
import { CalendarClock, Phone, SearchX, UserPlus, Users } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { PatientStatusBadge, Pill, SessionsMeter } from "@/components/common/status-badges";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireUser } from "@/lib/auth";
import { formatShortDate, formatTime } from "@/lib/dates";
import { fullName, PATIENT_STATUS_LABEL } from "@/lib/format";
import { isScopedToOwnPatients } from "@/lib/permissions";
import { formatPhone } from "@/lib/whatsapp";
import { LinkRow } from "@/features/pacientes/components/link-row";
import { SimplePagination } from "@/features/pacientes/components/pagination";
import { PatientAvatar } from "@/features/pacientes/components/patient-avatar";
import { PatientsFilters } from "@/features/pacientes/components/patients-filters";
import {
  getOrgProfessionals,
  listPatients,
  PATIENTS_PAGE_SIZE,
  type PatientListRow,
} from "@/features/pacientes/queries";
import { documentLabel, firstParam } from "@/features/pacientes/utils";

export const metadata: Metadata = { title: "Pacientes" };

type SearchParams = Promise<{
  q?: string | string[];
  estado?: string | string[];
  profesional?: string | string[];
  page?: string | string[];
}>;

export default async function PacientesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const scoped = isScopedToOwnPatients(user);

  const q = firstParam(sp.q)?.slice(0, 80);
  const estadoParam = firstParam(sp.estado);
  const estado = estadoParam && estadoParam in PATIENT_STATUS_LABEL ? (estadoParam as PatientStatus) : undefined;
  const profesional = scoped ? undefined : firstParam(sp.profesional);
  const page = Math.max(1, Math.floor(Number(firstParam(sp.page)) || 1));

  const [result, professionals] = await Promise.all([
    listPatients(user, { q, estado, profesional, page }),
    scoped ? Promise.resolve(null) : getOrgProfessionals(user),
  ]);
  const hasFilters = Boolean(q || estado || profesional);
  const showProfessional = !scoped;

  return (
    <>
      <PageHeader
        title="Pacientes"
        description={
          scoped
            ? "Tus pacientes: ficha administrativa, historia clínica y paquetes de sesiones."
            : "Fichas de pacientes, psicólogo tratante, paquetes de sesiones y próximas citas."
        }
        actions={
          <Button asChild className="h-9">
            <Link href="/app/pacientes/nuevo">
              <UserPlus /> Nuevo paciente
            </Link>
          </Button>
        }
      />

      <PatientsFilters
        q={q}
        estado={estado}
        profesional={profesional}
        professionals={professionals?.map((p) => ({ id: p.id, name: p.active ? p.name : `${p.name} (inactivo)` })) ?? null}
      />

      {result.rows.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={SearchX}
            title="Sin resultados"
            description="No encontramos pacientes con esos filtros. Prueba con otro nombre, documento o celular."
            action={
              <Button variant="outline" asChild>
                <Link href="/app/pacientes">Limpiar filtros</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Users}
            title="Aún no tienes pacientes registrados"
            description="Registra a tu primer paciente para agendar citas, controlar sus paquetes de sesiones y llevar su historia clínica."
            action={
              <Button asChild>
                <Link href="/app/pacientes/nuevo">
                  <UserPlus /> Registrar paciente
                </Link>
              </Button>
            }
          />
        )
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
          {/* Escritorio: tabla */}
          <div className="hidden md:block">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4 text-xs font-semibold text-muted-foreground uppercase">Paciente</TableHead>
                  <TableHead className="hidden text-xs font-semibold text-muted-foreground uppercase lg:table-cell">
                    Celular
                  </TableHead>
                  {showProfessional ? (
                    <TableHead className="hidden text-xs font-semibold text-muted-foreground uppercase xl:table-cell">
                      Psicólogo tratante
                    </TableHead>
                  ) : null}
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase">Estado</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase">Paquete actual</TableHead>
                  <TableHead className="pr-4 text-xs font-semibold text-muted-foreground uppercase">
                    Próxima cita
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.rows.map((p) => (
                  <PatientTableRow key={p.id} patient={p} showProfessional={showProfessional} />
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Móvil: tarjetas apiladas */}
          <ul className="divide-y md:hidden">
            {result.rows.map((p) => (
              <PatientCard key={p.id} patient={p} showProfessional={showProfessional} />
            ))}
          </ul>
        </div>
      )}

      <SimplePagination
        page={result.page}
        pageCount={result.pageCount}
        total={result.total}
        pageSize={PATIENTS_PAGE_SIZE}
        basePath="/app/pacientes"
        params={{ q, estado, profesional }}
        noun={result.total === 1 ? "paciente" : "pacientes"}
      />
    </>
  );
}

function PackageCell({ pkg }: { pkg: PatientListRow["activePackage"] }) {
  if (!pkg) return <span className="text-xs text-muted-foreground">Sin paquete activo</span>;
  return (
    <div className="grid w-44 gap-1">
      <p className="truncate text-xs font-medium text-brand-navy">{pkg.name}</p>
      <SessionsMeter used={pkg.usedSessions} total={pkg.totalSessions} />
    </div>
  );
}

function PatientTableRow({ patient: p, showProfessional }: { patient: PatientListRow; showProfessional: boolean }) {
  const href = `/app/pacientes/${p.id}`;
  const name = fullName(p);
  const doc = documentLabel(p);
  return (
    <LinkRow href={href}>
      <TableCell className="py-3 pl-4">
        <div className="flex items-center gap-3">
          <PatientAvatar name={name} />
          <div className="min-w-0">
            <Link href={href} className="block max-w-64 truncate font-medium text-brand-navy-deep hover:text-primary">
              {name}
            </Link>
            <p className="text-xs text-muted-foreground">{doc ?? "Sin documento"}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden text-muted-foreground lg:table-cell">
        {p.phone ? formatPhone(p.phone) : "—"}
      </TableCell>
      {showProfessional ? (
        <TableCell className="hidden xl:table-cell">
          {p.professionalName ?? <span className="text-xs text-muted-foreground italic">Sin asignar</span>}
        </TableCell>
      ) : null}
      <TableCell>
        <PatientStatusBadge status={p.status} />
      </TableCell>
      <TableCell>
        <PackageCell pkg={p.activePackage} />
      </TableCell>
      <TableCell className="pr-4">
        {p.nextAppointment ? (
          <div className="leading-tight">
            <p className="font-medium text-brand-navy">{formatShortDate(p.nextAppointment)}</p>
            <p className="text-xs text-muted-foreground">{formatTime(p.nextAppointment)}</p>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Sin citas</span>
        )}
      </TableCell>
    </LinkRow>
  );
}

function PatientCard({ patient: p, showProfessional }: { patient: PatientListRow; showProfessional: boolean }) {
  const name = fullName(p);
  const doc = documentLabel(p);
  return (
    <li>
      <Link href={`/app/pacientes/${p.id}`} className="flex gap-3 p-4 transition-colors hover:bg-muted/50">
        <PatientAvatar name={name} />
        <div className="grid min-w-0 flex-1 gap-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium text-brand-navy-deep">{name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {doc ?? "Sin documento"}
                {showProfessional ? ` · ${p.professionalName ?? "Sin psicólogo"}` : ""}
              </p>
            </div>
            <PatientStatusBadge status={p.status} />
          </div>
          {p.activePackage ? (
            <SessionsMeter used={p.activePackage.usedSessions} total={p.activePackage.totalSessions} />
          ) : null}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="size-3.5" />
              {p.nextAppointment
                ? `${formatShortDate(p.nextAppointment)} · ${formatTime(p.nextAppointment)}`
                : "Sin próximas citas"}
            </span>
            {p.phone ? (
              <span className="inline-flex items-center gap-1">
                <Phone className="size-3.5" />
                {formatPhone(p.phone)}
              </span>
            ) : null}
            {p.activePackage?.needsRenewal ? <Pill tone="amber">Por renovar</Pill> : null}
          </div>
        </div>
      </Link>
    </li>
  );
}
