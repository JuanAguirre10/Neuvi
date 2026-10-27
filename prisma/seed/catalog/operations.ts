// Textos administrativos de los consultorios (nunca clínicos): notas de recepción, motivos de
// cancelación, plantillas de WhatsApp y opciones de la ficha del paciente.

export const MARITAL_STATUS = ["Soltero(a)", "Soltero(a)", "Casado(a)", "Conviviente", "Separado(a)", "Divorciado(a)", "Viudo(a)"] as const;

export const ADULT_EDUCATION = ["Secundaria", "Técnico superior", "Universitario", "Universitario", "Posgrado"] as const;

export const REFERRAL_SOURCES = [
  "Recomendación de un familiar o amigo",
  "Recomendación de un familiar o amigo",
  "Derivado por otro profesional",
  "Instagram",
  "Facebook",
  "TikTok",
  "Google / Internet",
  "Google / Internet",
  "Convenio / empresa",
  "Colegio o universidad",
] as const;

export const CHILD_REFERRAL_SOURCES = ["Colegio o universidad", "Derivado por otro profesional", "Recomendación de un familiar o amigo", "Facebook"] as const;

export const EMERGENCY_RELATIONSHIPS = ["Madre", "Padre", "Hermano(a)", "Pareja", "Pareja", "Hijo(a)", "Amigo(a)"] as const;

export const ADULT_ADMIN_NOTES = [
  "Prefiere citas después de las 6 p. m.",
  "Solicita boleta a nombre de su empresa.",
  "Paga con Yape al terminar la sesión.",
  "Pide que el recordatorio se envíe un día antes.",
  "Convenio con su empresa: 10 % de descuento.",
  "Prefiere atención virtual cuando viaja por trabajo.",
  "Escribir solo por WhatsApp, no llamar.",
  "Reprograma con frecuencia por cambios de turno en su trabajo.",
  "Pidió que no le dejen mensajes de voz.",
] as const;

export const MINOR_ADMIN_NOTES = [
  "Llega en movilidad escolar; confirmar la hora con el apoderado.",
  "Boleta a nombre del apoderado.",
  "Los recordatorios van al celular del apoderado.",
  "Lo recoge su abuela los jueves.",
  "Pide horarios después del colegio.",
] as const;

export const PAUSE_NOTES = [
  "Pausa por viaje de trabajo; avisará cuando regrese.",
  "Pausa por temas económicos; retomará el próximo mes.",
  "Pausa por vacaciones; retoma en marzo.",
  "Pidió una pausa por exámenes; volverá a escribir.",
] as const;

export const CANCEL_REASONS = [
  "El paciente avisó que no podía asistir.",
  "Reprogramada a pedido del paciente.",
  "El paciente avisó que estaba enfermo.",
  "Cruce con su horario de trabajo.",
  "Viaje de último momento.",
  "La psicóloga tuvo una emergencia familiar.",
  "Corte de luz en el consultorio.",
  "El apoderado no pudo llevarlo.",
] as const;

export const APPOINTMENT_NOTES = [
  "Primera cita",
  "Paga en recepción",
  "Enviar el enlace de Meet 15 minutos antes",
  "Viene con su mamá",
  "Pidió recibo por honorarios",
  "Confirmó por WhatsApp",
  "Llegará 10 minutos tarde",
] as const;


export const REMINDER_TEMPLATES = [
  "Hola {paciente}, te saluda {centro}. Te recordamos tu cita con {profesional} el {fecha} a las {hora}. Si no puedes asistir, avísanos con 24 horas de anticipación.",
  "Buen día, {paciente}. Tienes sesión el {fecha} a las {hora} con {profesional}. Responde SÍ para confirmar. {centro}",
  "{paciente}, tu cita en {centro} es el {fecha} a las {hora}. Recuerda llegar 10 minutos antes. Para cambios, escríbenos por este medio.",
  "Hola {paciente}, el {fecha} a las {hora} tienes sesión con {profesional}. Si es virtual, te enviaremos el enlace 15 minutos antes.",
] as const;

export const RENEWAL_TEMPLATES = [
  "Hola {paciente}, te escribimos de {centro}. Te quedan {restantes} sesión(es) de tu paquete con {profesional}. ¿Deseas renovarlo para mantener tu horario?",
  "{paciente}, para no perder tu horario con {profesional}, te recordamos que te quedan {restantes} sesión(es). Puedes renovar por Yape o en recepción.",
  "Hola {paciente}, tu paquete en {centro} está por terminar ({restantes} sesión(es) pendiente(s)). Si quieres continuar, te ayudamos a renovarlo.",
] as const;
