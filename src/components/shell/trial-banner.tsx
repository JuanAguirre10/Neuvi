import Link from "next/link";
import { Sparkles, TriangleAlert } from "lucide-react";
import { daysUntil } from "@/lib/dates";

/** Aviso de prueba gratuita (3 meses). Los precios aún no están definidos: se activa por WhatsApp. */
export function TrialBanner({ trialEndsAt }: { trialEndsAt: Date }) {
  const daysLeft = daysUntil(trialEndsAt);

  if (daysLeft <= 0) {
    return (
      <div className="flex items-center justify-center gap-2 bg-danger-soft px-4 py-2 text-center text-sm text-destructive">
        <TriangleAlert className="size-4 shrink-0" />
        <span>
          Tu prueba gratuita terminó.{" "}
          <Link href="/app/configuracion/plan" className="font-semibold underline underline-offset-2">
            Activa tu plan
          </Link>{" "}
          para seguir usando Neuvi.
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 bg-brand-navy-deep px-4 py-2 text-center text-sm text-white">
      <Sparkles className="size-4 shrink-0 text-brand-teal" />
      <span>
        Estás en la prueba gratuita: te {daysLeft === 1 ? "queda 1 día" : `quedan ${daysLeft} días`} con acceso completo.{" "}
        <Link href="/app/configuracion/plan" className="font-semibold text-brand-sky underline-offset-2 hover:underline">
          Ver planes
        </Link>
      </span>
    </div>
  );
}
