import Link from "next/link";
import { ChevronRight, CircleCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OnboardingItem } from "../queries";

/** Lista de primeros pasos para cuentas nuevas. Cada paso se marca según los datos reales. */
export function OnboardingChecklist({ items, welcome }: { items: OnboardingItem[]; welcome: boolean }) {
  const done = items.filter((i) => i.done).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;
  const allDone = done === items.length;

  return (
    <section className="mb-6 overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="relative overflow-hidden bg-brand-navy-deep px-5 py-5 text-white sm:px-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-10 size-48 rounded-full bg-brand-blue/30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 left-1/3 size-40 rounded-full bg-brand-teal/25 blur-3xl"
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-medium tracking-wide text-brand-sky uppercase">
              <Sparkles className="size-3.5" /> {welcome ? "¡Bienvenido a Neuvi!" : "Primeros pasos"}
            </p>
            <h2 className="mt-1 text-lg font-semibold">
              {allDone ? "Todo listo: tu consultorio ya está en marcha" : "Deja tu consultorio listo en unos minutos"}
            </h2>
          </div>
          <div className="min-w-48">
            <div className="flex justify-between text-xs text-white/70">
              <span>
                {done} de {items.length} completados
              </span>
              <span className="tabular-nums">{pct}%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-brand-teal transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </div>

      <ol className="divide-y">
        {items.map((item, index) => (
          <li key={item.key}>
            <Link
              href={item.href}
              className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/50 sm:px-6"
            >
              {item.done ? (
                <CircleCheck className="size-6 shrink-0 text-brand-teal" aria-label="Completado" />
              ) : (
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-brand-sky/60 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block text-sm font-medium",
                    item.done ? "text-muted-foreground line-through decoration-muted-foreground/40" : "text-brand-navy-deep",
                  )}
                >
                  {item.label}
                </span>
                <span className="block text-xs text-muted-foreground">{item.description}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
