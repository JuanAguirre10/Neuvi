import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { NEUVI_WHATSAPP, formatPhone, neuviContactLink } from "@/lib/whatsapp";
import { WhatsAppIcon } from "./whatsapp-icon";

export function FinalCta() {
  return (
    <section id="contacto" className="scroll-mt-20 px-4 py-16 sm:px-6 lg:py-20">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-brand-navy-deep px-6 py-14 text-white sm:px-12 lg:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-24 size-[26rem] rounded-full bg-brand-blue/30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -left-24 size-[24rem] rounded-full bg-brand-teal/20 blur-3xl"
        />
        <div className="relative grid items-center gap-10 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <Logo tone="white" className="h-9" />
            <h2 className="mt-8 text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">
              Empieza hoy tu prueba gratuita y{" "}
              <span className="text-brand-teal">recupera tu tiempo para atender.</span>
            </h2>
            <p className="mt-4 max-w-xl text-base text-white/75">
              7 días con acceso completo, sin tarjeta. Si tienes dudas, escríbenos: te ayudamos a configurar tu
              consultorio o centro.
            </p>
          </div>

          <div className="grid gap-3">
            <Button asChild className="h-12 bg-white text-base text-primary hover:bg-white/90">
              <Link href="/registro">
                Prueba gratis 7 días <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-12 border-white/25 bg-white/5 text-base text-white hover:bg-white/10 hover:text-white"
            >
              <a href={neuviContactLink()} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon className="size-4.5 text-brand-teal" /> {formatPhone(NEUVI_WHATSAPP)}
              </a>
            </Button>
            <p className="text-center text-xs text-white/60">Atención por WhatsApp · Lima – Perú</p>
          </div>
        </div>
      </div>
    </section>
  );
}
