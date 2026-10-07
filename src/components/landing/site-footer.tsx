import Link from "next/link";
import { MapPin } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { todayKey } from "@/lib/dates";
import { NEUVI_WHATSAPP, formatPhone, neuviContactLink } from "@/lib/whatsapp";
import { LANDING_NAV } from "./nav";
import { WhatsAppIcon } from "./whatsapp-icon";

export function SiteFooter() {
  const year = todayKey().slice(0, 4);

  return (
    <footer className="border-t bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo className="h-8" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Gestión para psicólogos independientes y centros psicológicos: agenda, pacientes, historia clínica, paquetes
            y pagos en un solo lugar.
          </p>
        </div>

        <nav aria-label="Enlaces" className="grid content-start gap-2 text-sm">
          <p className="font-semibold text-brand-navy-deep">Neuvi</p>
          {LANDING_NAV.map((item) => (
            <a key={item.href} href={item.href} className="text-muted-foreground hover:text-primary">
              {item.label}
            </a>
          ))}
          <Link href="/login" className="text-muted-foreground hover:text-primary">
            Iniciar sesión
          </Link>
          <Link href="/registro" className="text-muted-foreground hover:text-primary">
            Crear cuenta
          </Link>
        </nav>

        <div className="grid content-start gap-3 text-sm">
          <p className="font-semibold text-brand-navy-deep">Contacto</p>
          <a
            href={neuviContactLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-muted-foreground hover:text-primary"
          >
            <WhatsAppIcon className="text-success" />
            {formatPhone(NEUVI_WHATSAPP)}
          </a>
          <p className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="size-4 text-primary" />
            Lima – Perú
          </p>
        </div>
      </div>
      <div className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {year} Neuvi. Todos los derechos reservados.</p>
          <p>Datos de salud protegidos conforme a la Ley N.º 29733.</p>
        </div>
      </div>
    </footer>
  );
}
