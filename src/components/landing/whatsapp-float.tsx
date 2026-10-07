import { neuviContactLink } from "@/lib/whatsapp";
import { WhatsAppIcon } from "./whatsapp-icon";

/** Botón flotante de contacto por WhatsApp (ventas / soporte de Neuvi). */
export function WhatsAppFloat() {
  return (
    <a
      href={neuviContactLink()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      className="group fixed right-4 bottom-4 z-40 flex items-center gap-2 rounded-full bg-brand-teal-strong p-3.5 text-white shadow-xl shadow-brand-navy/25 ring-4 ring-white/70 transition-transform hover:scale-105 focus-visible:ring-ring/60 focus-visible:outline-none sm:right-6 sm:bottom-6"
    >
      <WhatsAppIcon className="size-6" />
      <span className="hidden pr-1 text-sm font-semibold sm:group-hover:inline">¿Hablamos?</span>
    </a>
  );
}
