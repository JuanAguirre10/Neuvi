"use client";

import { useTransition } from "react";
import { Loader2, MessageCircle, PhoneOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { markReminderSent } from "../actions";

/**
 * Abre WhatsApp con el recordatorio prellenado (enlace wa.me) y registra el envío.
 * Se usa un <a> real para que el navegador no bloquee la pestaña nueva.
 */
export function WhatsAppReminderButton({
  appointmentId,
  href,
  sent,
  size = "sm",
  className,
}: {
  appointmentId: string;
  href: string | null;
  sent: boolean;
  size?: "sm" | "default";
  className?: string;
}) {
  const [pending, startTransition] = useTransition();

  if (!href) {
    return (
      <Button type="button" variant="outline" size={size} disabled className={className}>
        <PhoneOff /> Sin celular válido
      </Button>
    );
  }

  const onClick = () => {
    startTransition(async () => {
      const result = await markReminderSent(appointmentId);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message ?? "No se pudo registrar el envío.");
    });
  };

  return (
    <Button
      asChild
      size={size}
      variant={sent ? "outline" : "default"}
      className={cn(!sent && "bg-brand-teal-strong text-white hover:bg-brand-teal-strong/90", className)}
    >
      <a href={href} target="_blank" rel="noopener noreferrer" onClick={onClick} aria-disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <MessageCircle />}
        {sent ? "Reenviar por WhatsApp" : "Enviar por WhatsApp"}
      </a>
    </Button>
  );
}
