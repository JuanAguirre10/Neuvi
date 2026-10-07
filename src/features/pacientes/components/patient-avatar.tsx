import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Iniciales del paciente en un círculo con los colores de marca. */
export function PatientAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-primary ring-1 ring-primary/10",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
