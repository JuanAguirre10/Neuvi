import {
  BarChart3,
  BellRing,
  CalendarCheck2,
  Check,
  Package,
  RefreshCcw,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { DEFAULT_RENEWAL_TEMPLATE, fillTemplate } from "@/lib/whatsapp";
import { SectionHeading } from "./section-heading";
import { WhatsAppIcon } from "./whatsapp-icon";

const FEATURES = [
  {
    icon: CalendarCheck2,
    title: "Agenda sin cruces",
    text: "Citas por profesional y por consultorio. Neuvi bloquea los cruces de horario antes de que ocurran.",
  },
  {
    icon: BellRing,
    title: "Recordatorios por WhatsApp",
    text: "El mensaje se arma solo con fecha, hora y profesional, desde tus propias plantillas. Lo envías con un clic.",
  },
  {
    icon: Package,
    title: "Paquetes de sesiones y pagos",
    text: "Registra paquetes y pagos en efectivo, Yape, Plin, transferencia o tarjeta. Ve el saldo y las sesiones restantes.",
  },
  {
    icon: ShieldCheck,
    title: "Historia clínica protegida",
    text: "Ficha de ingreso y notas de evolución por sesión, visibles solo para el psicólogo tratante.",
  },
  {
    icon: BarChart3,
    title: "Reportes de gestión",
    text: "Sesiones atendidas, inasistencias, ingresos por método de pago y pacientes nuevos, mes a mes.",
  },
  {
    icon: UsersRound,
    title: "Roles para tu equipo",
    text: "Administrador, psicólogo y recepción: cada uno ve solo lo que necesita.",
    badge: "Plan Centro",
  },
];

const RENEWAL_POINTS = [
  "Tú decides cuándo avisar: por ejemplo, cuando quede 1 sesión.",
  "Mensaje de WhatsApp listo para enviar, sin datos clínicos.",
  "Un panel con todos los paquetes por terminar y su saldo.",
];

const SAMPLE_MESSAGE = fillTemplate(DEFAULT_RENEWAL_TEMPLATE, {
  paciente: "Lucía",
  restantes: 1,
  profesional: "la Ps. Andrea Salas",
  centro: "Centro Bienestar",
});

export function FeaturesSection() {
  return (
    <section id="funcionalidades" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
        <SectionHeading
          eyebrow="Funcionalidades"
          title="Todo lo que tu consulta necesita, en un solo lugar"
          description="Pensado para el día a día de los psicólogos en Perú: citas, paquetes de sesiones, pagos por Yape o Plin y seguimiento de cada paciente."
        />

        {/* Diferenciador */}
        <div className="relative mt-14 overflow-hidden rounded-3xl border border-brand-teal/40 bg-linear-to-br from-white via-white to-success-soft p-6 shadow-sm sm:p-10">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -bottom-24 size-72 rounded-full bg-brand-teal/15 blur-3xl"
          />
          <div className="relative grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-teal-strong px-3 py-1 text-xs font-semibold text-white">
                <RefreshCcw className="size-3.5" /> Nuestro diferenciador
              </span>
              <h3 className="mt-4 text-2xl font-bold tracking-tight text-brand-navy-deep sm:text-3xl">
                Aviso automático de renovación
              </h3>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                Cuando a un paquete le quedan pocas sesiones, Neuvi te avisa y deja listo el mensaje para ofrecer la
                renovación. Menos pacientes que abandonan el proceso sin que nadie lo note.
              </p>
              <ul className="mt-6 grid gap-3">
                {RENEWAL_POINTS.map((p) => (
                  <li key={p} className="flex gap-3 text-sm text-brand-navy">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
                      <Check className="size-3.5" />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>

            <div aria-hidden className="grid gap-3">
              <div className="rounded-2xl border bg-white p-4 shadow-lg shadow-brand-navy/5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-brand-navy-deep">Por renovar</p>
                  <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning">3</span>
                </div>
                <ul className="mt-3 grid gap-3">
                  {[
                    { name: "Lucía Rojas", used: 3, total: 4 },
                    { name: "Diego Paredes", used: 7, total: 8 },
                    { name: "Carmen Villanueva", used: 4, total: 4 },
                  ].map((p) => (
                    <li key={p.name} className="grid gap-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-brand-navy-deep">{p.name}</span>
                        <span className="text-warning">
                          {p.total - p.used === 0 ? "Sin sesiones" : `${p.total - p.used} restante`}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-warning-soft">
                        <div className="h-full rounded-full bg-chart-5" style={{ width: `${(p.used / p.total) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="ml-auto max-w-sm rounded-2xl rounded-tr-sm bg-success-soft p-3.5 text-sm leading-relaxed text-brand-navy-deep shadow-sm ring-1 ring-brand-teal/25">
                {SAMPLE_MESSAGE}
                <span className="mt-1.5 flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
                  <WhatsAppIcon className="size-3 text-success" /> Listo para enviar
                </span>
              </div>
            </div>
          </div>
        </div>

        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text, badge }) => (
            <li
              key={title}
              className="group rounded-2xl border bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-brand-sky/70 hover:shadow-lg hover:shadow-brand-navy/5"
            >
              <div className="flex items-center justify-between">
                <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                  <Icon className="size-5" />
                </span>
                {badge ? (
                  <span className="rounded-full bg-info-soft px-2 py-0.5 text-xs font-semibold text-primary">{badge}</span>
                ) : null}
              </div>
              <h3 className="mt-5 text-lg font-semibold text-brand-navy-deep">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
