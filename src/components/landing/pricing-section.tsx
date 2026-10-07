import Link from "next/link";
import { ArrowRight, Check, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANS, PRICE_PENDING_LABEL, TRIAL_FEATURES } from "@/features/configuracion/plans";
import { neuviContactLink } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { SectionHeading } from "./section-heading";
import { WhatsAppIcon } from "./whatsapp-icon";

export function PricingSection() {
  return (
    <section id="planes" className="scroll-mt-20 border-y bg-white">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
        <SectionHeading
          eyebrow="Planes"
          title="Un plan para cada tipo de práctica"
          description="Estamos en etapa piloto: los precios se definirán junto con nuestros primeros usuarios. Pruébalo gratis y conversemos por WhatsApp."
        />

        {/* Prueba gratuita */}
        <div className="mt-14 flex flex-col gap-6 rounded-3xl border border-brand-sky/50 bg-info-soft p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
              <Gift className="size-6" />
            </span>
            <div>
              <h3 className="text-xl font-bold text-brand-navy-deep">Prueba gratuita de 7 días</h3>
              <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                {TRIAL_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-brand-navy">
                    <Check className="size-4 shrink-0 text-success" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <Button asChild className="h-11 shrink-0 px-6">
            <Link href="/registro">
              Empezar gratis <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {PLANS.map((plan) => {
            const featured = plan.key === "CENTRO";
            return (
              <article
                key={plan.key}
                className={cn(
                  "relative flex flex-col rounded-3xl border bg-white p-6 sm:p-8",
                  featured ? "border-primary shadow-xl ring-1 shadow-primary/10 ring-primary" : "shadow-sm",
                )}
              >
                {featured ? (
                  <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white sm:left-8">
                    Para equipos
                  </span>
                ) : null}
                <p className="text-sm font-semibold text-primary">{plan.audience}</p>
                <h3 className="mt-1 text-2xl font-bold text-brand-navy-deep">{plan.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{plan.description}</p>

                <div className="mt-6 rounded-2xl bg-muted/60 px-4 py-3">
                  <p className="text-2xl font-bold tracking-tight text-brand-navy-deep">{PRICE_PENDING_LABEL}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {plan.billingNote} · <span className="font-medium text-brand-navy">Consúltanos</span>
                  </p>
                </div>

                <ul className="mt-6 grid flex-1 gap-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-3 text-sm text-brand-navy">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
                        <Check className="size-3.5" />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="mt-8 grid gap-2 sm:grid-cols-2">
                  <Button asChild variant={featured ? "default" : "outline"} className="h-11">
                    <Link href={plan.signupHref}>Probar 7 días gratis</Link>
                  </Button>
                  <Button asChild variant="ghost" className="h-11 text-brand-navy-deep">
                    <a
                      href={neuviContactLink(`Hola, quiero información sobre el ${plan.name} de Neuvi.`)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <WhatsAppIcon className="text-success" /> Hablar con ventas
                    </a>
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
