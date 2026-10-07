import { BarChart3, CalendarX2, FileWarning, ReceiptText, UserRoundX } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionHeading } from "./section-heading";

const PAINS = [
  {
    icon: CalendarX2,
    title: "Cruces de horario",
    text: "Dos pacientes citados a la misma hora, o el mismo consultorio reservado dos veces.",
  },
  {
    icon: ReceiptText,
    title: "Control de pagos disperso",
    text: "Yape, efectivo y transferencias anotados en lugares distintos. Nadie sabe con certeza quién debe cuánto.",
  },
  {
    icon: UserRoundX,
    title: "Falta de seguimiento y renovación",
    text: "Los paquetes de sesiones terminan sin aviso y el paciente deja de agendar.",
  },
  {
    icon: FileWarning,
    title: "Historial clínico disperso",
    text: "Notas en papel o en archivos sueltos: difíciles de encontrar y sin control de quién las ve.",
  },
  {
    icon: BarChart3,
    title: "Falta de reportes",
    text: "Sin datos claros de sesiones, inasistencias e ingresos para tomar decisiones.",
  },
];

const CHANNELS = ["WhatsApp", "Excel", "Cuaderno", "Hojas sueltas"];

export function ProblemSection() {
  return (
    <section id="problema" className="scroll-mt-20 border-y bg-white">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16 lg:py-24">
        <div>
          <SectionHeading
            align="left"
            eyebrow="El problema"
            title="Hoy todo está disperso entre WhatsApp, Excel y papel"
            description="Las citas se confirman por chat, los pagos se anotan en un cuaderno y la historia clínica vive en hojas sueltas. El resultado: errores, pacientes que no vuelven y horas perdidas en administración."
          />

          <div className="mt-6 flex flex-wrap gap-2">
            {CHANNELS.map((c) => (
              <span
                key={c}
                className="rounded-full border border-dashed border-brand-navy/25 bg-muted/60 px-3 py-1 text-xs font-medium text-brand-navy"
              >
                {c}
              </span>
            ))}
          </div>

          <figure className="relative mt-8 overflow-hidden rounded-2xl bg-brand-navy-deep p-6 text-white sm:p-7">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-brand-blue/30 blur-2xl"
            />
            <p className="relative text-5xl font-bold tracking-tight sm:text-6xl">
              8 a 12
            </p>
            <figcaption className="relative mt-2 max-w-sm text-base text-white/85">
              errores de asignación de citas al mes sobre ~600 atenciones{" "}
              <span className="text-white/60">(caso documentado)</span>.
            </figcaption>
            <p className="relative mt-4 border-t border-white/15 pt-4 text-sm text-brand-sky">
              Con una agenda que bloquea los cruces, la meta es llevarlos a cero.
            </p>
          </figure>
        </div>

        <ul className="grid content-center gap-4 sm:grid-cols-2">
          {PAINS.map(({ icon: Icon, title, text }, i) => (
            <li
              key={title}
              className={cn(
                "rounded-2xl border bg-background/60 p-5 transition-colors hover:border-brand-sky/60 hover:bg-white",
                i === PAINS.length - 1 && "sm:col-span-2",
              )}
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-warning-soft text-warning">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 font-semibold text-brand-navy-deep">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
