import { Lock } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

/** Logo de Neuvi con la etiqueta "Admin" del panel interno. */
export function AdminBrand({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <Logo className="h-7" priority={priority} />
      <span className="rounded-md bg-brand-gradient px-1.5 py-0.5 text-[10px] leading-none font-semibold tracking-wider text-white uppercase">
        Admin
      </span>
    </span>
  );
}

/** Recordatorio permanente de la regla de privacidad del panel. */
export function PrivacyNote({ className }: { className?: string }) {
  return (
    <p className={cn("flex items-center gap-1.5 text-[11px] text-muted-foreground", className)}>
      <Lock className="size-3 shrink-0" aria-hidden />
      Sin acceso a datos clínicos de pacientes
    </p>
  );
}
