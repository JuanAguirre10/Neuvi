// Recordatorios y avisos por WhatsApp en el MVP: se generan enlaces wa.me con el mensaje
// prellenado; el personal los abre y envía desde el WhatsApp del consultorio.
// (La API oficial de WhatsApp Business queda para una fase posterior.)
// Nunca incluir datos clínicos en los mensajes.

export const NEUVI_WHATSAPP = process.env.NEXT_PUBLIC_NEUVI_WHATSAPP ?? "51972540056";

export const DEFAULT_REMINDER_TEMPLATE =
  "Hola {paciente}, te recordamos tu cita en {centro} el {fecha} a las {hora} con {profesional}. " +
  "Por favor confírmanos tu asistencia respondiendo este mensaje. ¡Gracias!";

export const DEFAULT_RENEWAL_TEMPLATE =
  "Hola {paciente}, te escribimos de {centro}. Te quedan {restantes} sesión(es) de tu paquete actual con " +
  "{profesional}. Si deseas continuar tu proceso, podemos renovar tu paquete y reservar tus próximas citas. " +
  "¿Te ayudamos?";

/** Deja solo dígitos y antepone 51 a celulares peruanos de 9 dígitos. Null si no parece válido. */
export function normalizePeruPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (/^9\d{8}$/.test(digits)) return `51${digits}`;
  if (/^519\d{8}$/.test(digits)) return digits;
  if (digits.length >= 10 && digits.length <= 15) return digits; // número extranjero con código de país
  return null;
}

/** "51972540056" -> "+51 972 540 056" */
export function formatPhone(phone: string | null | undefined): string {
  const n = normalizePeruPhone(phone);
  if (!n) return phone ?? "";
  if (n.startsWith("51") && n.length === 11) return `+51 ${n.slice(2, 5)} ${n.slice(5, 8)} ${n.slice(8)}`;
  return `+${n}`;
}

/** Reemplaza {variables} en una plantilla. Variables faltantes quedan vacías. */
export function fillTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ""));
}

/** Enlace wa.me con texto prellenado. Null si el teléfono no es válido. */
export function whatsappLink(phone: string | null | undefined, text: string): string | null {
  const n = normalizePeruPhone(phone);
  if (!n) return null;
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}

/** Enlace al WhatsApp de Neuvi (ventas / soporte). */
export function neuviContactLink(text = "Hola, quiero información sobre Neuvi."): string {
  return `https://wa.me/${NEUVI_WHATSAPP}?text=${encodeURIComponent(text)}`;
}
