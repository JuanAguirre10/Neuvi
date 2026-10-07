import Link from "next/link";
import {
  ArrowRightLeft,
  CalendarClock,
  CalendarPlus,
  ContactRound,
  FileText,
  LifeBuoy,
  NotebookPen,
  Package,
  RefreshCcw,
  ShieldAlert,
  UserRound,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AppointmentStatusBadge,
  PackageStatusBadge,
  Pill,
  RiskBadge,
  SessionsMeter,
} from "@/components/common/status-badges";
import type { CurrentUser } from "@/lib/auth";
import { formatDate, formatLongDate, formatTime } from "@/lib/dates";
import { getAssignmentHistory } from "@/lib/domain/assignments";
import { formatPEN, MODALITY_LABEL, SEX_LABEL } from "@/lib/format";
import { canManagePayments } from "@/lib/permissions";
import { formatPhone } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { RenewalNoticeButton } from "@/features/renovaciones/components/renewal-notice-button";
import { renewalWhatsappLink } from "@/features/renovaciones/messages";
import { getPatientSummary, type PatientDetail } from "../queries";
import { formatDateOnly, isMinor, patientHref, plural } from "../utils";
import { AssignmentHistoryPanel } from "./assignment-history";
import { InfoItem, Panel } from "./info";

export async function SummaryTab({
  user,
  patient,
  traspaso = 0,
}: {
  user: CurrentUser;
  patient: PatientDetail;
  /** Citas próximas que quedaron con el tratante anterior tras un cambio (?traspaso=N de updatePatientAction). */
  traspaso?: number;
}) {
  const [{ current, activePackages, upcoming, lastAttended, clinical }, assignments] = await Promise.all([
    getPatientSummary(user, patient),
    getAssignmentHistory(user.organizationId, patient.id),
  ]);
  const manage = canManagePayments(user);
  const org = user.organization;
  const minor = isMinor(patient.birthDate);

  const renewalHref = current
    ? renewalWhatsappLink({
        phone: patient.phone,
        firstName: patient.firstName,
        remaining: current.remainingSessions,
        professionalName: patient.professional?.name ?? null,
        orgName: org.name,
        template: org.renewalTemplate,
      })
    : null;

  // Tras un cambio de tratante, la entrada más reciente de la bitácora es ese cambio.
  const previousName = assignments[0]?.fromUser?.name;
  const newName = patient.professional?.name;
  const them = traspaso === 1 ? "la" : "las";

  return (
    <div className="grid grid-cols-1 gap-5">
      {traspaso > 0 ? (
        <div className="flex flex-col gap-3 rounded-xl border border-primary/15 bg-info-soft px-4 py-3.5 sm:flex-row sm:items-center">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/70 text-primary">
            <ArrowRightLeft className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-primary">Cambio de psicólogo tratante guardado</p>
            <p className="text-sm text-brand-navy">
              Tiene {plural(traspaso, "cita próxima", "citas próximas")} con {previousName ?? "otro profesional"}.{" "}
              {newName
                ? `Reprográma${them} con ${newName} desde la agenda.`
                : `Reprográma${them} o cancéla${them} desde la agenda.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="bg-card" asChild>
              <Link href={patientHref(patient.id, { tab: "citas" })}>Ver citas</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/app/agenda">
                <CalendarClock /> Ir a la agenda
              </Link>
            </Button>
          </div>
        </div>
      ) : null}

      {current?.needsRenewal ? (
        <div className="flex flex-col gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3.5 sm:flex-row sm:items-center">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/70 text-warning">
            <RefreshCcw className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-warning">Paquete por terminar</p>
            <p className="text-sm text-brand-navy">
              {current.remainingSessions === 0
                ? `Ya usó todas las sesiones de “${current.name}”.`
                : `Le ${current.remainingSessions === 1 ? "queda" : "quedan"} ${plural(current.remainingSessions, "sesión", "sesiones")} de “${current.name}”.`}{" "}
              Ofrécele renovar para que no interrumpa su proceso.
              {current.renewalNotifiedAt ? (
                <span className="text-muted-foreground"> Aviso enviado el {formatDate(current.renewalNotifiedAt)}.</span>
              ) : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <RenewalNoticeButton
              packageId={current.id}
              href={renewalHref}
              label="Avisar por WhatsApp"
              alreadySent={Boolean(current.renewalNotifiedAt)}
              className="bg-card"
            />
            {manage ? (
              <Button size="sm" asChild>
                <Link href={patientHref(patient.id, { tab: "paquetes", renovar: "1" })}>
                  <RefreshCcw /> Renovar paquete
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="grid grid-cols-1 content-start gap-5 lg:col-span-2">
          {/* Paquete actual */}
          <Panel
            title="Paquete actual"
            icon={Package}
            action={
              <Link
                href={patientHref(patient.id, { tab: "paquetes" })}
                className="text-xs font-medium text-primary hover:underline"
              >
                Ver paquetes y pagos
              </Link>
            }
          >
            {current ? (
              <div className="grid gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-brand-navy-deep">{current.name}</p>
                  <PackageStatusBadge status={current.status} />
                  {current.scheduledSessions > 0 ? (
                    <Pill tone="blue">{plural(current.scheduledSessions, "sesión agendada", "sesiones agendadas")}</Pill>
                  ) : null}
                </div>
                <SessionsMeter used={current.usedSessions} total={current.totalSessions} />
                <dl className="grid grid-cols-3 gap-3 rounded-lg bg-muted/50 p-3">
                  <InfoItem label="Precio" value={formatPEN(current.priceCents)} />
                  <InfoItem label="Pagado" value={formatPEN(current.paidCents)} />
                  <InfoItem
                    label="Saldo"
                    value={
                      <span className={cn("font-semibold", current.balanceCents > 0 ? "text-warning" : "text-success")}>
                        {current.balanceCents > 0 ? formatPEN(current.balanceCents) : "Pagado"}
                      </span>
                    }
                  />
                </dl>
                {activePackages.length > 1 ? (
                  <p className="text-xs text-muted-foreground">
                    Tiene {activePackages.length} paquetes activos. Las citas descuentan primero del más antiguo.
                  </p>
                ) : null}
                {manage && current.balanceCents > 0 ? (
                  <div>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={patientHref(patient.id, { tab: "paquetes", pagar: current.id })}>Registrar pago</Link>
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  No tiene un paquete activo. Las citas nuevas no descontarán de ningún paquete.
                </p>
                {manage ? (
                  <Button size="sm" asChild>
                    <Link href={patientHref(patient.id, { tab: "paquetes", renovar: "1" })}>
                      <Package /> Nuevo paquete
                    </Link>
                  </Button>
                ) : null}
              </div>
            )}
          </Panel>

          {/* Próximas citas */}
          <Panel
            title="Próximas citas"
            icon={CalendarClock}
            bodyClassName="p-0"
            action={
              <Link
                href={patientHref(patient.id, { tab: "citas" })}
                className="text-xs font-medium text-primary hover:underline"
              >
                Ver historial
              </Link>
            }
          >
            {upcoming.length ? (
              <ul className="divide-y">
                {upcoming.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-lg bg-secondary text-primary">
                      <span className="text-sm leading-none font-semibold">{formatTime(a.startsAt)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-brand-navy-deep first-letter:uppercase">{formatLongDate(a.startsAt)}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {a.professional.name} · {MODALITY_LABEL[a.modality]}
                        {a.room ? ` · ${a.room.name}` : ""}
                      </p>
                    </div>
                    <AppointmentStatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-start gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">No tiene citas programadas.</p>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/app/agenda?nuevaCita=1&paciente=${patient.id}`}>
                    <CalendarPlus /> Agendar cita
                  </Link>
                </Button>
              </div>
            )}
            <div className="border-t bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
              {lastAttended ? (
                <>
                  Última sesión atendida:{" "}
                  <span className="font-medium text-brand-navy">{formatDate(lastAttended.startsAt)}</span> con{" "}
                  {lastAttended.professional.name} ({MODALITY_LABEL[lastAttended.modality].toLowerCase()})
                </>
              ) : (
                "Aún no tiene sesiones atendidas."
              )}
            </div>
          </Panel>

          {patient.adminNotes ? (
            <Panel title="Notas administrativas" icon={FileText}>
              <p className="text-sm whitespace-pre-wrap text-brand-navy-deep">{patient.adminNotes}</p>
            </Panel>
          ) : null}
        </div>

        <div className="grid grid-cols-1 content-start gap-5">
          {/* Solo el psicólogo tratante ve este resumen clínico. */}
          {clinical ? (
            <Panel
              title="Historia clínica"
              icon={NotebookPen}
              className={cn(clinical.record?.riskLevel === "ALTO" && "border-destructive/40 ring-1 ring-destructive/20")}
            >
              <div className="grid gap-3">
                {clinical.record ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <RiskBadge level={clinical.record.riskLevel} />
                    {clinical.record.riskLevel === "ALTO" ? (
                      <ShieldAlert className="size-4 text-destructive" aria-label="Atención" />
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Ficha de ingreso pendiente.</p>
                )}
                <p className="text-sm text-brand-navy">
                  {plural(clinical.notesCount, "nota de evolución", "notas de evolución")}
                  {clinical.lastNote ? (
                    <span className="text-muted-foreground"> · última el {formatDate(clinical.lastNote.sessionDate)}</span>
                  ) : null}
                </p>
                <Button size="sm" variant="outline" asChild className="w-fit">
                  <Link href={patientHref(patient.id, { tab: "historia" })}>Abrir historia clínica</Link>
                </Button>
              </div>
            </Panel>
          ) : null}

          <Panel title="Contacto" icon={ContactRound}>
            <dl className="grid gap-3">
              <InfoItem label="Celular (WhatsApp)" value={patient.phone ? formatPhone(patient.phone) : null} />
              <InfoItem label="Correo" value={patient.email} />
              <InfoItem
                label="Dirección"
                value={[patient.address, patient.district].filter(Boolean).join(", ") || null}
              />
            </dl>
          </Panel>

          <Panel title="Contacto de emergencia" icon={LifeBuoy}>
            {patient.emergencyContactName || patient.emergencyContactPhone ? (
              <dl className="grid gap-3">
                <InfoItem
                  label="Nombre"
                  value={
                    patient.emergencyContactName
                      ? `${patient.emergencyContactName}${patient.emergencyContactRelationship ? ` (${patient.emergencyContactRelationship})` : ""}`
                      : null
                  }
                />
                <InfoItem
                  label="Celular"
                  value={patient.emergencyContactPhone ? formatPhone(patient.emergencyContactPhone) : null}
                />
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">Sin contacto de emergencia registrado.</p>
            )}
          </Panel>

          {patient.guardianName || minor ? (
            <Panel
              title="Apoderado"
              icon={UsersRound}
              className={cn(minor && !patient.guardianName && "border-warning/40")}
            >
              {patient.guardianName ? (
                <dl className="grid gap-3">
                  <InfoItem
                    label="Nombre"
                    value={`${patient.guardianName}${patient.guardianRelationship ? ` (${patient.guardianRelationship})` : ""}`}
                  />
                  <InfoItem label="Celular" value={patient.guardianPhone ? formatPhone(patient.guardianPhone) : null} />
                </dl>
              ) : (
                <p className="text-sm text-warning">Paciente menor de edad sin apoderado registrado.</p>
              )}
            </Panel>
          ) : null}

          <Panel title="Datos personales" icon={UserRound}>
            <dl className="grid grid-cols-2 gap-3">
              <InfoItem label="Nacimiento" value={formatDateOnly(patient.birthDate) || null} />
              <InfoItem label="Sexo" value={patient.sex ? SEX_LABEL[patient.sex] : null} />
              <InfoItem label="Estado civil" value={patient.maritalStatus} />
              <InfoItem label="Instrucción" value={patient.educationLevel} />
              <InfoItem label="Ocupación" value={patient.occupation} className="col-span-2" />
              <InfoItem label="¿Cómo nos conoció?" value={patient.referralSource} className="col-span-2" />
              <InfoItem label="Registrado" value={formatDate(patient.createdAt)} className="col-span-2" />
            </dl>
          </Panel>

          <AssignmentHistoryPanel entries={assignments} />
        </div>
      </div>
    </div>
  );
}
