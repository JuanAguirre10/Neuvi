import { CalendarCheck2, Eye, Package, Receipt, Wallet } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { PackageStatusBadge, Pill, SessionsMeter } from "@/components/common/status-badges";
import type { CurrentUser } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { formatPEN, PAYMENT_METHOD_LABEL } from "@/lib/format";
import { canManagePayments } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { currentPackage, type PatientDetail } from "@/features/pacientes/queries";
import { getPatientPackages, type PatientPackage } from "../queries";
import { CancelPackageButton } from "./cancel-package-button";
import { PackageDialog } from "./package-dialog";
import { PaymentDialog, type PayablePackage } from "./payment-dialog";

export async function PackagesTab({
  user,
  patient,
  renovar,
  pagar,
}: {
  user: CurrentUser;
  patient: PatientDetail;
  /** ?renovar=1: abre el diálogo de paquete prellenado con el último. */
  renovar?: boolean;
  /** ?pagar=<packageId>: abre "Registrar pago" para ese paquete. */
  pagar?: string;
}) {
  const { packages, latest } = await getPatientPackages(user, patient.id);
  const manage = canManagePayments(user);

  const payable: PayablePackage[] = packages
    .filter((p) => p.status !== "CANCELADO")
    .map((p) => ({ id: p.id, name: p.name, balanceCents: p.balanceCents }));
  const pagarId = pagar && payable.some((p) => p.id === pagar) ? pagar : undefined;

  const current = currentPackage([...packages].reverse());
  const hasUsableActive = Boolean(current && current.remainingSessions > 0);
  // Renovación: prellenar con el último paquete si lo piden (?renovar=1) o si ya no tiene sesiones disponibles.
  const prefill =
    latest && (renovar || !hasUsableActive)
      ? { name: latest.name, totalSessions: latest.totalSessions, priceCents: latest.priceCents }
      : null;

  const totalPaid = packages.reduce((sum, p) => sum + p.paidCents, 0);
  const pending = packages
    .filter((p) => p.status !== "CANCELADO")
    .reduce((sum, p) => sum + Math.max(p.balanceCents, 0), 0);

  const actions = manage ? (
    <div className="flex flex-wrap gap-2">
      <PaymentDialog
        key={pagarId ?? "pago"}
        patientId={patient.id}
        packages={payable}
        defaultPackageId={pagarId}
        defaultOpen={Boolean(pagarId)}
        clearParamOnClose={Boolean(pagar)}
      />
      <PackageDialog
        key={renovar ? "renovar" : "nuevo"}
        patientId={patient.id}
        prefill={prefill}
        defaultOpen={Boolean(renovar)}
        clearParamOnClose={Boolean(renovar)}
      />
    </div>
  ) : null;

  if (!packages.length) {
    return (
      <EmptyState
        icon={Package}
        title="Sin paquetes de sesiones"
        description={
          manage
            ? "Registra un paquete (o una sesión individual) para que las citas descuenten sesiones y controlar los pagos."
            : "Administración o recepción registrarán aquí los paquetes y pagos de este paciente."
        }
        action={actions}
      />
    );
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-brand-navy-deep">Paquetes y pagos</h2>
          <p className="text-xs text-muted-foreground">
            Las sesiones se descuentan al marcar la cita como atendida. Saldo = precio − pagos.
          </p>
        </div>
        {actions}
      </div>

      {!manage ? (
        <p className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          <Eye className="size-4" /> Vista de solo lectura: administración y recepción registran paquetes y pagos.
        </p>
      ) : null}

      <dl className="grid gap-3 sm:grid-cols-3">
        <Stat
          icon={CalendarCheck2}
          label="Sesiones disponibles"
          value={current ? `${current.remainingSessions} de ${current.totalSessions}` : "Sin paquete activo"}
          tone={current?.needsRenewal ? "warning" : "default"}
        />
        <Stat icon={Wallet} label="Total pagado" value={formatPEN(totalPaid)} />
        <Stat
          icon={Receipt}
          label="Saldo pendiente"
          value={pending > 0 ? formatPEN(pending) : "Al día"}
          tone={pending > 0 ? "warning" : "success"}
        />
      </dl>

      <div className="grid gap-4">
        {packages.map((pkg) => (
          <PackageCard key={pkg.id} pkg={pkg} manage={manage} patientId={patient.id} payable={payable} />
        ))}
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: "default" | "warning" | "success";
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-xs">
      <span
        className={cn(
          "flex size-9 items-center justify-center rounded-lg",
          tone === "warning" && "bg-warning-soft text-warning",
          tone === "success" && "bg-success-soft text-success",
          tone === "default" && "bg-secondary text-primary",
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="truncate text-base font-semibold text-brand-navy-deep">{value}</dd>
      </div>
    </div>
  );
}

function PackageCard({
  pkg,
  manage,
  patientId,
  payable,
}: {
  pkg: PatientPackage;
  manage: boolean;
  patientId: string;
  payable: PayablePackage[];
}) {
  const cancelled = pkg.status === "CANCELADO";
  return (
    <article className={cn("rounded-xl border bg-card shadow-xs", cancelled && "opacity-75")}>
      <header className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-brand-navy-deep">{pkg.name}</h3>
            <PackageStatusBadge status={pkg.status} />
            {pkg.needsRenewal ? <Pill tone="amber">Por renovar</Pill> : null}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Inicio: {formatDate(pkg.startDate)} · {pkg.totalSessions} {pkg.totalSessions === 1 ? "sesión" : "sesiones"}
          </p>
        </div>
        {manage && !cancelled ? (
          <div className="flex flex-wrap gap-1.5">
            {pkg.balanceCents > 0 ? (
              <PaymentDialog patientId={patientId} packages={payable} defaultPackageId={pkg.id} />
            ) : null}
            {pkg.status === "ACTIVO" ? (
              <CancelPackageButton
                packageId={pkg.id}
                packageName={pkg.name}
                scheduledSessions={pkg.scheduledSessions}
              />
            ) : null}
          </div>
        ) : null}
      </header>

      <div className="grid gap-4 p-4 md:grid-cols-2 md:items-center">
        <div className="grid gap-2">
          <SessionsMeter used={pkg.usedSessions} total={pkg.totalSessions} />
          {pkg.scheduledSessions > 0 ? (
            <p className="text-xs text-muted-foreground">
              {pkg.scheduledSessions} {pkg.scheduledSessions === 1 ? "cita agendada" : "citas agendadas"} contra este
              paquete.
            </p>
          ) : null}
          {pkg.notes ? <p className="text-xs text-muted-foreground italic">{pkg.notes}</p> : null}
        </div>
        <dl className="grid grid-cols-3 gap-3 rounded-lg bg-muted/50 p-3">
          <Money label="Precio" value={formatPEN(pkg.priceCents)} />
          <Money label="Pagado" value={formatPEN(pkg.paidCents)} />
          <Money
            label={pkg.balanceCents < 0 ? "A favor" : "Saldo"}
            value={pkg.balanceCents === 0 ? "Pagado" : formatPEN(Math.abs(pkg.balanceCents))}
            className={pkg.balanceCents > 0 ? "text-warning" : "text-success"}
          />
        </dl>
      </div>

      <div className="border-t">
        <p className="px-4 pt-3 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Pagos ({pkg.payments.length})
        </p>
        {pkg.payments.length ? (
          <ul className="divide-y">
            {pkg.payments.map((pay) => (
              <li key={pay.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-brand-navy-deep">
                    {formatDate(pay.paidAt)} · {PAYMENT_METHOD_LABEL[pay.method]}
                    {pay.reference ? <span className="text-muted-foreground"> · Op. {pay.reference}</span> : null}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Registrado por {pay.registeredBy.name}
                    {pay.notes ? ` · ${pay.notes}` : ""}
                  </p>
                </div>
                <span className="text-sm font-semibold whitespace-nowrap text-success">{formatPEN(pay.amountCents)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 pb-3 text-sm text-muted-foreground">Sin pagos registrados.</p>
        )}
      </div>
    </article>
  );
}

function Money({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("mt-0.5 truncate text-sm font-semibold text-brand-navy-deep", className)}>{value}</dd>
    </div>
  );
}
