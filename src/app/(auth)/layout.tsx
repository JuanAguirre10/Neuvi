import Link from "next/link";
import { CalendarCheck2, HeartHandshake, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";

const POINTS = [
  { icon: CalendarCheck2, title: "Agenda sin cruces", text: "Citas por profesional y consultorio, con recordatorios por WhatsApp." },
  { icon: HeartHandshake, title: "Pacientes que continúan", text: "Aviso automático cuando un paquete de sesiones está por terminar." },
  { icon: ShieldCheck, title: "Historia clínica protegida", text: "Solo el psicólogo tratante accede a las notas clínicas." },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-brand-navy-deep text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -right-32 size-[28rem] rounded-full bg-brand-blue/25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -left-24 size-[26rem] rounded-full bg-brand-teal/20 blur-3xl"
        />
        <Link href="/" className="relative w-fit">
          <Logo tone="white" className="h-10" priority />
        </Link>
        <div className="relative max-w-md">
          <h2 className="text-3xl leading-tight font-semibold tracking-tight">
            Dedica tu tiempo a atender, <span className="text-brand-teal">no a administrar.</span>
          </h2>
          <ul className="mt-8 grid gap-5">
            {POINTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                  <Icon className="size-5 text-brand-sky" />
                </span>
                <span>
                  <span className="block font-semibold">{title}</span>
                  <span className="block text-sm text-white/70">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/50">© {new Date().getFullYear()} Neuvi · Lima, Perú</p>
      </aside>
      <main className="flex items-center justify-center bg-background px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-8 block w-fit lg:hidden">
            <Logo className="h-9" priority />
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}
