"use client";

import { useTransition } from "react";
import { Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { markRenewalNotifiedAction } from "../actions";

/**
 * Abre WhatsApp (wa.me) con el aviso de renovación prellenado en una pestaña nueva y registra
 * `renewalNotifiedAt` en el paquete. `href` se arma en el servidor con renewalWhatsappLink().
 */
export function RenewalNoticeButton({
  packageId,
  href,
  label = "Enviar aviso",
  alreadySent = false,
  size = "sm",
  variant = "outline",
  className,
}: {
  packageId: string;
  /** null si el paciente no tiene un celular válido. */
  href: string | null;
  label?: string;
  alreadySent?: boolean;
  size?: "sm" | "default";
  variant?: "outline" | "default" | "secondary";
  className?: string;
}) {
  const [pending, startTransition] = useTransition();

  if (!href) {
    return (
      <Button size={size} variant="outline" disabled className={className} title="El paciente no tiene un celular válido">
        <MessageCircle /> Sin celular
      </Button>
    );
  }

  return (
    <Button
      size={size}
      variant={variant}
      asChild
      className={cn(
        variant === "outline" && "border-brand-teal/40 text-success hover:bg-success-soft hover:text-success",
        className,
      )}
    >
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() =>
          startTransition(async () => {
            const res = await markRenewalNotifiedAction(packageId);
            if (res.ok) {
              toast.success("Aviso registrado", {
                description: "Envía el mensaje desde la ventana de WhatsApp que se abrió.",
              });
            } else {
              toast.error(res.message ?? "No se pudo registrar el aviso.");
            }
          })
        }
      >
        {pending ? <Loader2 className="animate-spin" /> : <MessageCircle />}
        {alreadySent ? "Reenviar aviso" : label}
      </a>
    </Button>
  );
}
