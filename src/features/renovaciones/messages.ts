// Mensajes de WhatsApp para avisos de renovación. NUNCA incluyen información clínica.
import { DEFAULT_RENEWAL_TEMPLATE, fillTemplate, whatsappLink } from "@/lib/whatsapp";

/** Seguimiento para paquetes ya terminados (la plantilla de renovación diría "te quedan 0 sesiones"). */
export const COMPLETED_FOLLOWUP_TEMPLATE =
  "Hola {paciente}, te escribimos de {centro}. Tu paquete de sesiones con {profesional} ha finalizado. " +
  "Si deseas continuar tu proceso, con gusto te ayudamos a renovarlo y a reservar tu próxima cita. ¿Te ayudamos?";

export function renewalWhatsappLink({
  phone,
  firstName,
  remaining,
  professionalName,
  orgName,
  template,
  completed = false,
}: {
  phone: string | null;
  firstName: string;
  remaining: number;
  professionalName: string | null;
  orgName: string;
  /** organization.renewalTemplate */
  template: string | null;
  /** true para paquetes COMPLETADO sin renovar. */
  completed?: boolean;
}): string | null {
  const text = fillTemplate(
    completed ? COMPLETED_FOLLOWUP_TEMPLATE : (template?.trim() || DEFAULT_RENEWAL_TEMPLATE),
    {
      paciente: firstName,
      restantes: remaining,
      profesional: professionalName ?? "tu psicólogo(a)",
      centro: orgName,
    },
  );
  return whatsappLink(phone, text);
}
