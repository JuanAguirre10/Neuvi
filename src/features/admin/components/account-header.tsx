import { Building2, Mail, MapPin, MessageCircle, Phone, UserRound } from "lucide-react";
import { formatDate, formatLongDate } from "@/lib/dates";
import { BILLING_CYCLE_LABEL, ORG_TYPE_LABEL, formatPEN } from "@/lib/format";
import { formatPhone, whatsappLink } from "@/lib/whatsapp";
import type { AccountDetail } from "../queries";
import { monthlyPriceLabel } from "../format";
import { AccountStatusPills } from "./badges";

function Meta({ icon: Icon, label, children }: { icon: typeof Mail; label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <dt className="sr-only">{label}</dt>
      <dd className="min-w-0 truncate">{children}</dd>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold break-words text-brand-navy-deep">{value}</dd>
      {hint ? <dd className="text-xs text-muted-foreground">{hint}</dd> : null}
    </div>
  );
}

/** Encabezado de la cuenta: estado, contacto y resumen de la suscripción. */
export function AccountHeader({ account, actions }: { account: AccountDetail; actions?: React.ReactNode }) {
  const sub = account.subscription;
  const owner = account.users[0];
  const phone = account.phone ?? owner?.phone ?? null;
  const wa = whatsappLink(phone, `Hola, te escribimos del equipo de Neuvi sobre la cuenta ${account.name}.`);
  const isTrial = sub.status === "PRUEBA";

  return (
    <div className="rounded-xl border bg-card shadow-xs">
      <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
            <Building2 className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight break-words text-brand-navy-deep sm:text-2xl">{account.name}</h1>
              <AccountStatusPills status={sub.status} health={account.health} showAmount />
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {ORG_TYPE_LABEL[account.type]}
              {account.ruc ? ` · RUC ${account.ruc}` : ""} · Registrada el {formatDate(account.createdAt)}
            </p>
            <dl className="mt-3 grid gap-x-5 gap-y-1.5 text-sm text-muted-foreground sm:flex sm:flex-wrap">
              {owner ? (
                <Meta icon={UserRound} label="Administrador">
                  <span className="font-medium text-brand-navy">{owner.name}</span>
                  {account.users.length > 1 ? ` +${account.users.length - 1}` : ""}
                </Meta>
              ) : null}
              <Meta icon={Mail} label="Correo">
                {account.email ?? owner?.email ? (
                  <a href={`mailto:${account.email ?? owner?.email}`} className="hover:text-primary hover:underline">
                    {account.email ?? owner?.email}
                  </a>
                ) : (
                  "Sin correo"
                )}
              </Meta>
              <Meta icon={Phone} label="Celular">
                {phone ? formatPhone(phone) : "Sin celular"}
              </Meta>
              {wa ? (
                <Meta icon={MessageCircle} label="WhatsApp">
                  <a href={wa} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Escribir por WhatsApp
                  </a>
                </Meta>
              ) : null}
              {account.address ? (
                <Meta icon={MapPin} label="Dirección">
                  {account.address}
                </Meta>
              ) : null}
            </dl>
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-4 border-t bg-sky-wash px-4 py-4 sm:px-5 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Plan" value={sub.plan.name} hint={BILLING_CYCLE_LABEL[sub.billingCycle]} />
        <Stat
          label={sub.priceCents != null ? "Precio pactado" : "Precio de lista"}
          value={monthlyPriceLabel(account.monthlyPriceCents, sub.plan.perProfessional)}
          hint="al mes"
        />
        <Stat
          label="Psicólogos activos"
          value={account.professionals}
          hint={sub.plan.perProfessional ? `${account.seats} facturable${account.seats === 1 ? "" : "s"}` : "Plan de 1 profesional"}
        />
        <Stat label="MRR" value={account.mrrCents > 0 ? formatPEN(account.mrrCents) : "—"} hint={sub.status === "ACTIVA" ? "estimado" : "solo cuentas activas"} />
        {isTrial ? (
          <Stat
            label={account.health.trialExpired ? "Prueba venció" : "Prueba hasta"}
            value={formatDate(sub.trialEndsAt)}
            hint={account.health.trialExpired ? "Sin activar plan" : `${account.health.trialDaysLeft} día${account.health.trialDaysLeft === 1 ? "" : "s"}`}
          />
        ) : (
          <Stat label="Plan activo desde" value={account.activatedAt ? formatDate(account.activatedAt) : "—"} />
        )}
        <Stat
          label="Deuda vencida"
          value={account.health.hasDebt ? <span className="text-destructive">{formatPEN(account.health.overdueCents)}</span> : "Al día"}
          hint={account.lastLoginAt ? `Último acceso: ${formatLongDate(account.lastLoginAt)}` : "Sin accesos registrados"}
        />
      </dl>

      {actions ? <div className="border-t px-4 py-3 sm:px-5">{actions}</div> : null}
    </div>
  );
}
