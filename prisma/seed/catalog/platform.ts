// Textos del equipo de Neuvi: extensiones de prueba y notas internas de seguimiento.
// Nunca incluyen datos de pacientes (el panel /admin solo ve métricas agregadas).

export const TRIAL_EXTENSION_NOTES = [
  "Falta terminar de migrar sus pacientes desde Excel.",
  "Estuvo de viaje y no pudo evaluar el sistema.",
  "Pidió más tiempo para decidir el plan.",
  "Pidió más tiempo para probar los recordatorios con sus pacientes.",
] as const;

export const ONBOARDING_NOTES = {
  centro: [
    "Llamada de bienvenida con {admin}: configuramos los consultorios y las plantillas de WhatsApp. Cargarán sus pacientes esta semana.",
    "Videollamada de inducción con {admin} y la recepción. Quedó pendiente revisar cómo registrar paquetes de 4 sesiones.",
    "Primer contacto por WhatsApp. {admin} pidió ayuda para importar su lista de pacientes desde Excel; se le envió la plantilla.",
  ],
  individual: [
    "Llamada de bienvenida con {admin}. Usa Neuvi desde el celular; se le mostró cómo enviar recordatorios desde la agenda.",
    "Inducción por videollamada con {admin}: agenda, paquetes y avisos de renovación. Le gustaron mucho los recordatorios.",
    "{admin} se registró desde Instagram. Se le escribió por WhatsApp para ayudarle a crear sus primeros paquetes.",
  ],
} as const;

export const TRIAL_FOLLOW_UP_NOTES = {
  centro: [
    "Seguimiento de prueba: usan la agenda a diario y ya registran pagos. Les interesa el {plan}; esperan propuesta de precio.",
    "Seguimiento: {admin} comenta que bajaron los cruces de horario desde que usan la agenda compartida.",
    "Seguimiento de prueba: preguntaron si pueden seguir usando Yape como medio de cobro. Se confirmó que sí.",
  ],
  individual: [
    "Seguimiento de prueba: usa la agenda a diario y ya registra pagos. Le interesa el {plan}; espera propuesta de precio.",
    "Seguimiento: {admin} comenta que los recordatorios le redujeron las inasistencias.",
    "Seguimiento de prueba: preguntó si puede seguir cobrando por Yape. Se confirmó que sí.",
  ],
} as const;

export const TRIAL_ENDING_NOTES = [
  "Se le recordó que la prueba vence el {fecha}. Pidió la propuesta para {n}.",
  "Prueba por vencer ({fecha}). {admin} quiere decidir esta semana; se le envió la propuesta por WhatsApp.",
] as const;

export const TRIAL_EXPIRED_NOTES = [
  "La prueba venció el {fecha}. Se le escribió por WhatsApp para conocer su decisión; sin respuesta por ahora.",
  "Dejó de registrar citas antes de que terminara la prueba. Comentó que retomará cuando tenga más pacientes.",
] as const;

export const SUPPORT_NOTES = {
  comun: [
    "Consulta: cómo registrar un pago parcial de un paquete. Se le envió un video corto por WhatsApp.",
    "Consulta por boletas electrónicas a pacientes: por ahora Neuvi no las emite. Quedó anotado como pedido.",
    "Pidió cambiar el texto del recordatorio de WhatsApp; lo hizo desde Plantillas sin problema.",
  ],
  centro: [
    "Pidió agregar un consultorio nuevo; se le explicó cómo hacerlo desde Configuración.",
    "Preguntó cómo traspasar un paciente a otra psicóloga del centro. Se le explicó que queda registrado en la ficha.",
    "Consulta: cómo desactivar a una psicóloga que deja el centro sin perder sus citas pasadas.",
  ],
} as const;
