import { CalendarClock, ClipboardList, UserPlus } from "lucide-react";
import { SectionHeading } from "./section-heading";
import { TRIAL_LABEL } from "@/features/configuracion/plans";

const STEPS = [
  {
    icon: UserPlus,
    title: "Crea tu cuenta",
    text: `Regístrate en minutos como psicólogo independiente o como centro. ${TRIAL_LABEL} gratis y sin tarjeta.`,
  },
  {
    icon: ClipboardList,
    title: "Registra pacientes y paquetes",
    text: "Carga a tus pacientes, sus paquetes de sesiones y los pagos que ya recibiste.",
  },
  {
    icon: CalendarClock,
    title: "Agenda y deja que Neuvi te avise",
    text: "Programa las citas, envía recordatorios por WhatsApp y recibe el aviso cuando toque renovar.",
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
        <SectionHeading
          eyebrow="Cómo funciona"
          title="Empieza hoy, en tres pasos"
          description="No necesitas instalar nada: Neuvi funciona en el navegador de tu computadora, tablet o celular."
        />

        <div className="relative mt-14">
          <div
            aria-hidden
            className="absolute top-7 right-[16%] left-[16%] hidden h-px bg-linear-to-r from-brand-sky/0 via-brand-sky to-brand-sky/0 md:block"
          />
          <ol className="relative grid gap-8 md:grid-cols-3 md:gap-6">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="relative flex flex-col items-center text-center">
                <span className="relative flex size-14 items-center justify-center rounded-2xl bg-white text-primary shadow-md ring-1 shadow-brand-navy/5 ring-border">
                  <Icon className="size-6" />
                  <span className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white ring-2 ring-background">
                    {i + 1}
                  </span>
                </span>
                <h3 className="mt-5 text-lg font-semibold text-brand-navy-deep">{title}</h3>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
