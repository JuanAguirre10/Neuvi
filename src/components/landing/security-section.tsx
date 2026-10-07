import { FileLock2, KeyRound, LockKeyhole, MessageSquareOff, Scale, UserRoundCheck } from "lucide-react";
import { SectionHeading } from "./section-heading";

const ITEMS = [
  {
    icon: UserRoundCheck,
    title: "Solo el psicólogo tratante",
    text: "La historia clínica y las notas de evolución solo las ve el profesional a cargo del paciente. Ni recepción ni otros psicólogos.",
  },
  {
    icon: KeyRound,
    title: "Roles y permisos",
    text: "Administrador, psicólogo y recepción acceden únicamente a lo que su rol necesita.",
  },
  {
    icon: Scale,
    title: "Ley N.º 29733",
    text: "Tratamos los datos de salud como datos sensibles, conforme a la Ley de Protección de Datos Personales del Perú.",
  },
  {
    icon: LockKeyhole,
    title: "Datos cifrados en tránsito",
    text: "Toda la comunicación viaja por HTTPS y la información se aloja en infraestructura en la nube con cifrado en reposo.",
  },
  {
    icon: MessageSquareOff,
    title: "WhatsApp sin datos clínicos",
    text: "Los recordatorios y avisos nunca incluyen información clínica del paciente.",
  },
  {
    icon: FileLock2,
    title: "Cada centro, su información",
    text: "Los datos de cada consultorio o centro están aislados: nadie más puede verlos.",
  },
];

export function SecuritySection() {
  return (
    <section id="seguridad" className="scroll-mt-20">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:py-24">
        <div>
          <SectionHeading
            align="left"
            eyebrow="Seguridad y confidencialidad"
            title="La confidencialidad de tus pacientes, primero"
            description="La información clínica es de las más sensibles que existen. Neuvi está diseñado para protegerla desde el primer día."
          />
          <div aria-hidden className="mt-8 hidden items-center justify-center lg:flex">
            <div className="relative flex size-44 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-brand-teal/10" />
              <span className="absolute inset-5 rounded-full bg-brand-teal/15" />
              <span className="relative flex size-20 items-center justify-center rounded-3xl bg-brand-navy-deep text-white shadow-xl shadow-brand-navy/30">
                <LockKeyhole className="size-9 text-brand-teal" />
              </span>
            </div>
          </div>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2">
          {ITEMS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="rounded-2xl border bg-white p-5">
              <span className="flex size-10 items-center justify-center rounded-xl bg-success-soft text-success">
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
