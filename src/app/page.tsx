import type { Metadata } from "next";
import { SiteHeader } from "@/components/landing/site-header";
import { Hero } from "@/components/landing/hero";
import { ProblemSection } from "@/components/landing/problem-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { AudienceSection } from "@/components/landing/audience-section";
import { HowItWorks } from "@/components/landing/how-it-works";
import { PricingSection } from "@/components/landing/pricing-section";
import { SecuritySection } from "@/components/landing/security-section";
import { FinalCta } from "@/components/landing/final-cta";
import { SiteFooter } from "@/components/landing/site-footer";
import { WhatsAppFloat } from "@/components/landing/whatsapp-float";
import { TRIAL_LABEL } from "@/features/configuracion/plans";

export const metadata: Metadata = {
  title: { absolute: "Neuvi — Gestión para psicólogos y centros psicológicos en Perú" },
  description:
    `Agenda sin cruces, recordatorios por WhatsApp, paquetes de sesiones, pagos, historia clínica protegida y aviso automático de renovación. Prueba Neuvi gratis ${TRIAL_LABEL}.`,
  openGraph: {
    title: "Neuvi — Dedica tu tiempo a atender, no a administrar",
    description:
      "Plataforma web para psicólogos independientes y centros psicológicos en Perú: agenda, pacientes, historia clínica, paquetes y pagos en un solo lugar.",
    locale: "es_PE",
    type: "website",
  },
};

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <ProblemSection />
        <FeaturesSection />
        <AudienceSection />
        <HowItWorks />
        <PricingSection />
        <SecuritySection />
        <FinalCta />
      </main>
      <SiteFooter />
      <WhatsAppFloat />
    </div>
  );
}
