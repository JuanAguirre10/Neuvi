"use client";

import { useState } from "react";
import { Check, Copy, KeyRound, MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

async function copy(text: string, okMessage: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(okMessage);
    return true;
  } catch {
    toast.error("No se pudo copiar. Selecciona el texto y cópialo manualmente.");
    return false;
  }
}

/** Muestra UNA vez las credenciales temporales de un miembro para que el admin las comparta. */
export function CredentialsNotice({ name, email, password }: { name: string; email: string; password: string }) {
  const [copied, setCopied] = useState(false);

  const shareText = () =>
    `Hola ${name.split(" ")[0]}, ya tienes acceso a Neuvi.\n` +
    `Ingresa en ${window.location.origin}/login\n` +
    `Correo: ${email}\nContraseña temporal: ${password}\n` +
    "Por seguridad, cámbiala en Mi perfil al ingresar.";

  return (
    <div className="grid gap-3">
      <div className="rounded-xl border border-brand-sky/50 bg-info-soft p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-brand-navy-deep">
          <KeyRound className="size-4 text-primary" /> Credenciales de acceso
        </p>
        <dl className="mt-3 grid gap-2 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-x-3">
            <dt className="text-muted-foreground">Correo</dt>
            <dd className="font-medium break-all text-brand-navy-deep">{email}</dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-3">
            <dt className="text-muted-foreground">Contraseña temporal</dt>
            <dd className="flex items-center gap-1">
              <code className="rounded-md bg-white px-2 py-1 font-mono text-sm font-semibold tracking-wide text-brand-navy-deep ring-1 ring-border select-all">
                {password}
              </code>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Copiar contraseña"
                onClick={async () => setCopied(await copy(password, "Contraseña copiada."))}
              >
                {copied ? <Check className="text-success" /> : <Copy />}
              </Button>
            </dd>
          </div>
        </dl>
      </div>
      <p className="text-xs text-muted-foreground">
        Esta contraseña no se volverá a mostrar. Compártela por un canal privado y pide que la cambien en{" "}
        <span className="font-medium text-brand-navy">Mi perfil</span>.
      </p>
      <Button type="button" variant="outline" onClick={() => copy(shareText(), "Mensaje copiado. Pégalo en WhatsApp.")}>
        <MessageSquareText /> Copiar mensaje de bienvenida
      </Button>
    </div>
  );
}
