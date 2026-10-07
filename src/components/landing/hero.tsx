import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { neuviContactLink } from "@/lib/whatsapp";
import { ProductMockup } from "./product-mockup";
import { WhatsAppIcon } from "./whatsapp-icon";

const TRUST = ["Sin tarjeta", "Acceso completo por 7 días", "Soporte por WhatsApp"];

export function Hero() {
  return (
    <section className="relative overflow-x-clip">
      {/* Fondo: cuadrícula tenue + halos con los colores del logo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)] [background-size:44px_44px] opacity-60"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 size-[32rem] rounded-full bg-brand-sky/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-20 -right-40 size-[28rem] rounded-full bg-brand-teal/15 blur-3xl"
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pt-12 pb-20 sm:px-6 sm:pt-16 lg:grid-cols-[1.02fr_1fr] lg:gap-12 lg:pt-20 lg:pb-28">
        <div className="max-w-xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-sky/50 bg-white/80 px-3 py-1 text-xs font-semibold text-primary shadow-sm">
            <Sparkles className="size-3.5 text-brand-teal" />
            Para psicólogos independientes y centros psicológicos en Perú
          </p>

          <h1 className="mt-6 text-4xl leading-[1.08] font-bold tracking-tight text-balance text-brand-navy-deep sm:text-5xl lg:text-[3.35rem]">
            Dedica tu tiempo a atender,{" "}
            <span className="bg-linear-to-r from-primary to-brand-teal bg-clip-text text-transparent">
              no a administrar.
            </span>
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-pretty text-muted-foreground">
            Neuvi es la plataforma web para psicólogos independientes y centros psicológicos en Perú:{" "}
            <strong className="font-semibold text-brand-navy">
              agenda, pacientes, historia clínica, paquetes y pagos en un solo lugar.
            </strong>{" "}
            Y te avisa cuando un paciente está por terminar su paquete.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="h-12 px-6 text-base shadow-lg shadow-primary/25">
              <Link href="/registro">
                Prueba gratis 7 días <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-12 bg-white px-6 text-base text-brand-navy-deep">
              <a href={neuviContactLink()} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon className="size-4.5 text-success" /> Escríbenos por WhatsApp
              </a>
            </Button>
          </div>

          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-brand-navy">
            {TRUST.map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <Check className="size-4 text-success" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="sm:px-6 lg:px-0">
          <ProductMockup />
        </div>
      </div>
    </section>
  );
}
