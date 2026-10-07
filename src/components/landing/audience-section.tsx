import Link from "next/link";
import { ArrowRight, Building2, Check, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SectionHeading } from "./section-heading";

const AUDIENCES = [
  {
    icon: UserRound,
    title: "Psicólogo independiente",
    lead: "Atiendes por tu cuenta y te encargas de todo: agenda, cobros y seguimiento.",
    needs: [
      "Tu agenda siempre a la mano, también desde el celular",
      "Recordatorios por WhatsApp sin copiar y pegar mensajes",
      "Control de paquetes, pagos y saldo de cada paciente",
      "Historia clínica ordenada y confidencial",
      "Saber a tiempo qué pacientes necesitan renovar",
    ],
    cta: { label: "Empezar como independiente", href: "/registro" },
    featured: false,
  },
  {
    icon: Building2,
    title: "Centro psicológico",
    lead: "Coordinas varios psicólogos, consultorios y un equipo de recepción.",
    needs: [
      "Agenda centralizada sin cruces por profesional ni por consultorio",
      "Roles y permisos: recepción no accede a la historia clínica",
      "Caja consolidada con pagos por método (Yape, Plin, efectivo…)",
      "Reportes de sesiones, inasistencias e ingresos",
      "Seguimiento de renovaciones de todo el centro",
    ],
    cta: { label: "Empezar como centro", href: "/registro?tipo=centro" },
    featured: true,
  },
];

export function AudienceSection() {
  return (
    <section id="para-quien" className="scroll-mt-20 border-y bg-white">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
        <SectionHeading
          eyebrow="Para quién"
          title="Hecho para cómo trabajas tú"
          description="Neuvi se adapta al tamaño de tu práctica: desde un consultorio propio hasta un centro con varios profesionales."
        />

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {AUDIENCES.map(({ icon: Icon, title, lead, needs, cta, featured }) => (
            <article
              key={title}
              className={cn(
                "relative flex flex-col overflow-hidden rounded-3xl border p-6 sm:p-8",
                featured ? "border-brand-navy-deep bg-brand-navy-deep text-white" : "bg-background",
              )}
            >
              {featured ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-brand-blue/30 blur-3xl"
                />
              ) : null}
              <div className="relative flex items-center gap-4">
                <span
                  className={cn(
                    "flex size-12 items-center justify-center rounded-2xl",
                    featured ? "bg-white/10 text-brand-sky ring-1 ring-white/15" : "bg-secondary text-primary",
                  )}
                >
                  <Icon className="size-6" />
                </span>
                <h3 className={cn("text-xl font-bold", featured ? "text-white" : "text-brand-navy-deep")}>{title}</h3>
              </div>
              <p className={cn("relative mt-4 text-base", featured ? "text-white/75" : "text-muted-foreground")}>{lead}</p>
              <ul className="relative mt-6 grid flex-1 gap-3">
                {needs.map((n) => (
                  <li key={n} className={cn("flex gap-3 text-sm", featured ? "text-white/90" : "text-brand-navy")}>
                    <Check className={cn("mt-0.5 size-4 shrink-0", featured ? "text-brand-teal" : "text-success")} />
                    {n}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                variant={featured ? "secondary" : "default"}
                className={cn("relative mt-8 h-11 w-full px-5 sm:w-fit", featured && "bg-white text-primary hover:bg-white/90")}
              >
                <Link href={cta.href}>
                  {cta.label} <ArrowRight className="size-4" />
                </Link>
              </Button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
