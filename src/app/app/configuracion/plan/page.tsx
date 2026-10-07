import type { Metadata } from "next";
import { BadgeCheck, Check, Clock, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { Pill } from "@/components/common/status-badges";
import { requireUser } from "@/lib/auth";
import { daysUntil, formatLongDate } from "@/lib/dates";
import { ORG_TYPE_LABEL, PLAN_LABEL } from "@/lib/format";
import { canManageSettings } from "@/lib/permissions";
import { NEUVI_WHATSAPP, formatPhone, neuviContactLink } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { PLANS, PRICE_PENDING_LABEL, TRIAL_DAYS } from "@/features/configuracion/plans";
import { WhatsAppIcon } from "@/components/landing/whatsapp-icon";

export const metadata: Metadata = { title: "Plan" };

const STEPS = [
  { icon: MessageCircle, title: "Escríbenos por WhatsApp", text: "Cuéntanos qué plan necesitas y cuántos psicólogos atienden." },
  { icon: Clock, title: "Coordinamos el pago", text: "Te enviamos el detalle y los medios de pago disponibles." },
  { icon: BadgeCheck, title: "Activamos tu plan", text: "Sin perder nada: tus pacientes, citas y pagos se conservan." },
];

// Visible para cualquier usuario (el banner de prueba enlaza aquí); solo el ADMIN ve los botones de activación.
export default async function PlanPage() {
  const user = await requireUser();
  const org = user.organization;
  const isAdmin = canManageSettings(user);
  const isTrial = org.plan === "PRUEBA";
  const daysLeft = Math.max(0, daysUntil(org.trialEndsAt));
  const trialPct = Math.min(100, Math.round(((TRIAL_DAYS - Math.min(daysLeft, TRIAL_DAYS)) / TRIAL_DAYS) * 100));

  return (
    <>
      <PageHeader title="Plan" description="Tu suscripción a Neuvi. La activación se coordina por WhatsApp; no se cobra en línea." />

      <div className="grid gap-6">
        {/* Plan actual */}
        <Card>
          <CardContent className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <span
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-xl",
                  isTrial ? "bg-info-soft text-primary" : "bg-success-soft text-success",
                )}
              >
                {isTrial ? <Sparkles className="size-5" /> : <ShieldCheck className="size-5" />}
              </span>
              <div>
                <p className="text-sm text-muted-foreground">Plan actual</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  <p className="text-lg font-semibold text-brand-navy-deep">{PLAN_LABEL[org.plan]}</p>
                  {isTrial ? (
                    daysLeft > 0 ? (
                      <Pill tone="blue">
                        {daysLeft === 1 ? "Queda 1 día" : `Quedan ${daysLeft} días`}
                      </Pill>
                    ) : (
                      <Pill tone="red">Prueba terminada</Pill>
                    )
                  ) : (
                    <Pill tone="teal">Activo</Pill>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {org.name} · {ORG_TYPE_LABEL[org.type]}
                  {isTrial ? ` · La prueba ${daysLeft > 0 ? "termina" : "terminó"} el ${formatLongDate(org.trialEndsAt)}` : ""}
                </p>
              </div>
            </div>

            {isTrial ? (
              <div className="w-full md:w-64">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Prueba gratuita</span>
                  <span>
                    {TRIAL_DAYS - Math.min(daysLeft, TRIAL_DAYS)} de {TRIAL_DAYS} días
                  </span>
                </div>
                <div
                  className="mt-1.5 h-2 overflow-hidden rounded-full bg-primary/15"
                  role="meter"
                  aria-label="Días usados de la prueba gratuita"
                  aria-valuemin={0}
                  aria-valuemax={TRIAL_DAYS}
                  aria-valuenow={TRIAL_DAYS - Math.min(daysLeft, TRIAL_DAYS)}
                >
                  <div
                    className={cn("h-full rounded-full", daysLeft <= 1 ? "bg-chart-5" : "bg-primary")}
                    style={{ width: `${trialPct}%` }}
                  />
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Planes */}
        <div className="grid gap-6 lg:grid-cols-2">
          {PLANS.map((plan) => {
            const current = org.plan === plan.key;
            const recommended = isTrial && org.type === plan.key;
            return (
              <Card
                key={plan.key}
                className={cn("gap-0", (current || recommended) && "ring-2 ring-primary")}
              >
                <CardContent className="flex h-full flex-col">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-primary">{plan.audience}</p>
                    {current ? <Pill tone="teal">Tu plan actual</Pill> : recommended ? <Pill tone="blue">Recomendado para ti</Pill> : null}
                  </div>
                  <h2 className="mt-1 text-xl font-bold text-brand-navy-deep">{plan.name}</h2>
                  <p className="mt-1.5 text-sm text-muted-foreground">{plan.description}</p>

                  <div className="mt-5 rounded-xl bg-muted/60 px-4 py-3">
                    <p className="text-xl font-bold text-brand-navy-deep">{PRICE_PENDING_LABEL}</p>
                    <p className="text-xs text-muted-foreground">{plan.billingNote} · Consúltanos</p>
                  </div>

                  <ul className="mt-5 grid flex-1 gap-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex gap-2.5 text-sm text-brand-navy">
                        <Check className="mt-0.5 size-4 shrink-0 text-success" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {isAdmin && !current ? (
                    <Button asChild variant={recommended ? "default" : "outline"} className="mt-6 h-10">
                      <a
                        href={neuviContactLink(`Hola, quiero activar el ${plan.name} para ${org.name}.`)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <WhatsAppIcon /> Activar por WhatsApp
                      </a>
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {!isAdmin ? (
          <p className="rounded-lg bg-info-soft px-4 py-3 text-sm text-brand-navy">
            Solo el administrador de tu cuenta puede activar o cambiar el plan.
          </p>
        ) : null}

        {/* Cómo se activa */}
        <Card>
          <CardContent>
            <h2 className="font-semibold text-brand-navy-deep">¿Cómo se activa?</h2>
            <ol className="mt-4 grid gap-5 sm:grid-cols-3">
              {STEPS.map(({ icon: Icon, title, text }, i) => (
                <li key={title} className="flex gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-brand-navy-deep">
                      {i + 1}. {title}
                    </p>
                    <p className="text-sm text-muted-foreground">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-5 border-t pt-4 text-sm text-muted-foreground">
              ¿Dudas? Escríbenos al{" "}
              <a
                href={neuviContactLink(`Hola, tengo una consulta sobre los planes de Neuvi (${org.name}).`)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline"
              >
                {formatPhone(NEUVI_WHATSAPP)}
              </a>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
