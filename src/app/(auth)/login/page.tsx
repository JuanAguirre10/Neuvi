import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";
import { TRIAL_LABEL } from "@/features/configuracion/plans";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-brand-navy-deep">Bienvenido de nuevo</h1>
      <p className="mt-1 text-sm text-muted-foreground">Ingresa a tu cuenta para gestionar tu consultorio.</p>
      <div className="mt-8">
        <LoginForm next={next} />
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿Aún no tienes cuenta?{" "}
        <Link href="/registro" className="font-semibold text-primary hover:underline">
          Prueba Neuvi gratis {TRIAL_LABEL}
        </Link>
      </p>
    </div>
  );
}
