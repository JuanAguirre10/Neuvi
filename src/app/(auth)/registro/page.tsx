import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "./register-form";
import { TRIAL_LABEL } from "@/features/configuracion/plans";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const { tipo } = await searchParams;
  const defaultType = tipo === "centro" ? "CENTRO" : "INDIVIDUAL";
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-brand-navy-deep">Crea tu cuenta</h1>
      <p className="mt-1 text-sm text-muted-foreground">{TRIAL_LABEL} gratis con acceso completo. Sin tarjeta.</p>
      <div className="mt-8">
        <RegisterForm defaultType={defaultType} />
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
