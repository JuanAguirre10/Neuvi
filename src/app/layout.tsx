import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Neuvi — Gestión para consultorios y centros psicológicos",
    template: "%s · Neuvi",
  },
  description:
    "Agenda, pacientes, historia clínica, paquetes de sesiones y pagos en una sola plataforma para psicólogos independientes y centros psicológicos en Perú.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-PE" className={`${jakarta.variable} h-full scroll-smooth antialiased`}>
      <body className="min-h-full flex flex-col">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster position="top-right" richColors closeButton theme="light" />
      </body>
    </html>
  );
}
