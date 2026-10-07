"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/brand/logo";
import { neuviContactLink } from "@/lib/whatsapp";
import { LANDING_NAV } from "./nav";
import { WhatsAppIcon } from "./whatsapp-icon";

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-white/85 backdrop-blur supports-backdrop-filter:bg-white/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" aria-label="Neuvi, ir al inicio" className="shrink-0">
          <Logo className="h-8" priority />
        </Link>

        <nav aria-label="Secciones" className="hidden flex-1 items-center justify-center gap-1 md:flex">
          {LANDING_NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-brand-navy transition-colors hover:bg-secondary hover:text-primary"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <Button asChild variant="ghost" className="hidden h-9 px-3 text-brand-navy sm:inline-flex">
            <Link href="/login">Iniciar sesión</Link>
          </Button>
          <Button asChild className="h-9 px-4">
            <Link href="/registro">Prueba gratis</Link>
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="size-9 md:hidden" aria-label="Abrir menú">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85%] max-w-xs p-0">
              <SheetHeader className="border-b px-5 py-4">
                <SheetTitle className="sr-only">Menú</SheetTitle>
                <SheetDescription className="sr-only">Navegación del sitio de Neuvi</SheetDescription>
                <Logo className="h-7" />
              </SheetHeader>
              <nav aria-label="Secciones" className="grid gap-1 px-3">
                {LANDING_NAV.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-base font-medium text-brand-navy-deep hover:bg-secondary"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
              <div className="mt-auto grid gap-2 border-t p-4">
                <Button asChild className="h-10">
                  <Link href="/registro" onClick={() => setOpen(false)}>
                    Prueba gratis 7 días <ArrowRight />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-10">
                  <Link href="/login" onClick={() => setOpen(false)}>
                    Iniciar sesión
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="h-10 text-success">
                  <a href={neuviContactLink()} target="_blank" rel="noopener noreferrer">
                    <WhatsAppIcon /> Escríbenos por WhatsApp
                  </a>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
