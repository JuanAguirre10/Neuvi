import Image from "next/image";
import { cn } from "@/lib/utils";

type LogoProps = {
  /** "full" = isotipo + "Neuvi"; "mark" = solo isotipo. */
  variant?: "full" | "mark";
  /** "color" para fondos claros, "white" para fondos oscuros (solo aplica a "full"). */
  tone?: "color" | "white";
  className?: string;
  priority?: boolean;
};

// Proporciones reales de los PNG recortados en public/brand.
const FULL = { w: 800, h: 213 };
const MARK = { w: 256, h: 253 };

export function Logo({ variant = "full", tone = "color", className, priority }: LogoProps) {
  if (variant === "mark") {
    return (
      <Image
        src="/brand/neuvi-isotipo.png"
        alt="Neuvi"
        width={MARK.w}
        height={MARK.h}
        priority={priority}
        className={cn("h-8 w-auto", className)}
      />
    );
  }
  return (
    <Image
      src={tone === "white" ? "/brand/neuvi-logo-blanco.png" : "/brand/neuvi-logo.png"}
      alt="Neuvi"
      width={FULL.w}
      height={FULL.h}
      priority={priority}
      className={cn("h-8 w-auto", className)}
    />
  );
}
